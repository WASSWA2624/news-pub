import crypto from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_HOME_PATH,
  SESSION_COOKIE_NAME,
  buildAdminLoginHref,
  normalizeAdminRedirectTarget,
} from "@/lib/auth/config";
import { isAdminRole } from "@/lib/auth/rbac";
import { env } from "@/lib/env/server";
import { getPrismaClient } from "@/lib/prisma";

const PASSWORD_HASH_ALGORITHM = "scrypt";
const PASSWORD_HASH_KEY_LENGTH = 64;
const PASSWORD_HASH_COST = 32768;
const PASSWORD_HASH_BLOCK_SIZE = 8;
const PASSWORD_HASH_PARALLELIZATION = 1;
const PASSWORD_HASH_MAX_MEMORY = 128 * 1024 * 1024;
function getPasswordHashParameters(passwordHash) {
  const [algorithm, cost, blockSize, parallelization, salt, derivedKey] = passwordHash.split("$");

  if (
    algorithm !== PASSWORD_HASH_ALGORITHM ||
    !cost ||
    !blockSize ||
    !parallelization ||
    !salt ||
    !derivedKey
  ) {
    return null;
  }

  const parsedCost = Number.parseInt(cost, 10);
  const parsedBlockSize = Number.parseInt(blockSize, 10);
  const parsedParallelization = Number.parseInt(parallelization, 10);

  if (
    !Number.isInteger(parsedCost) ||
    !Number.isInteger(parsedBlockSize) ||
    !Number.isInteger(parsedParallelization)
  ) {
    return null;
  }

  return {
    blockSize: parsedBlockSize,
    cost: parsedCost,
    derivedKey,
    parallelization: parsedParallelization,
    salt,
  };
}

function getPublicAdminUser(user) {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role,
  };
}

function isAllowedAdminUser(user) {
  return Boolean(user?.isActive && isAdminRole(user.role));
}

async function createAuditEvent(db, { action, actorId = null, entityId, entityType, payloadJson }) {
  return db.auditEvent.create({
    data: {
      action,
      actorId,
      entityId,
      entityType,
      payloadJson,
    },
  });
}

async function invalidateStoredSession(db, session, reason) {
  if (session.invalidatedAt) {
    return session;
  }

  return db.$transaction(async (tx) => {
    const invalidatedSession = await tx.adminSession.update({
      where: { id: session.id },
      data: {
        invalidatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            email: true,
            id: true,
            isActive: true,
            name: true,
            role: true,
          },
        },
      },
    });

    await createAuditEvent(tx, {
      action: "AUTH_SESSION_REJECTED",
      actorId: session.userId,
      entityId: session.id,
      entityType: "auth_session",
      payloadJson: {
        reason,
      },
    });

    return invalidatedSession;
  });
}

async function getStoredSessionByToken(token) {
  const prisma = getPrismaClient();

  return prisma.adminSession.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    include: {
      user: {
        select: {
          email: true,
          id: true,
          isActive: true,
          name: true,
          role: true,
        },
      },
    },
  });
}

async function validateAdminSessionToken(token) {
  if (!token) {
    return { status: "missing" };
  }

  const session = await getStoredSessionByToken(token);

  if (!session) {
    return { status: "invalid" };
  }

  if (session.invalidatedAt) {
    return { status: "invalidated" };
  }

  if (session.expiresAt <= new Date()) {
    await invalidateStoredSession(getPrismaClient(), session, "expired");
    return { status: "expired" };
  }

  if (!isAllowedAdminUser(session.user)) {
    await invalidateStoredSession(getPrismaClient(), session, "user_inactive_or_not_admin");
    return { status: "forbidden" };
  }

  return {
    session,
    status: "authenticated",
    user: getPublicAdminUser(session.user),
  };
}

function getSessionTokenFromRequest(request) {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value || null;
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function createPasswordHash(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH, {
    maxmem: PASSWORD_HASH_MAX_MEMORY,
    N: PASSWORD_HASH_COST,
    p: PASSWORD_HASH_PARALLELIZATION,
    r: PASSWORD_HASH_BLOCK_SIZE,
  });

  return [
    PASSWORD_HASH_ALGORITHM,
    PASSWORD_HASH_COST,
    PASSWORD_HASH_BLOCK_SIZE,
    PASSWORD_HASH_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export function verifyPassword(password, passwordHash) {
  const params = getPasswordHashParameters(passwordHash);

  if (!params) {
    return false;
  }

  const expectedKey = Buffer.from(params.derivedKey, "base64url");
  const actualKey = crypto.scryptSync(
    password,
    Buffer.from(params.salt, "base64url"),
    expectedKey.length,
    {
      maxmem: PASSWORD_HASH_MAX_MEMORY,
      N: params.cost,
      p: params.parallelization,
      r: params.blockSize,
    },
  );

  return crypto.timingSafeEqual(expectedKey, actualKey);
}

export function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function authenticateAdminCredentials({ email, password, userAgent = null }) {
  const prisma = getPrismaClient();
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user || !isAllowedAdminUser(user) || !verifyPassword(password, user.passwordHash)) {
    await createAuditEvent(prisma, {
      action: "AUTH_LOGIN_FAILED",
      entityId: normalizedEmail,
      entityType: "auth_identity",
      payloadJson: {
        reason: !user
          ? "user_not_found"
            : !user.isActive
              ? "user_inactive"
            : !isAdminRole(user.role)
              ? "role_not_allowed"
              : "invalid_password",
      },
    });

    return {
      status: "invalid_credentials",
      success: false,
    };
  }

  const expiresAt = new Date(Date.now() + env.auth.session.maxAgeSeconds * 1000);
  const sessionToken = crypto.randomBytes(32).toString("base64url");
  const session = await prisma.$transaction(async (tx) => {
    const createdSession = await tx.adminSession.create({
      data: {
        expiresAt,
        tokenHash: hashSessionToken(sessionToken),
        userAgent,
        userId: user.id,
      },
    });

    await createAuditEvent(tx, {
      action: "AUTH_LOGIN_SUCCEEDED",
      actorId: user.id,
      entityId: createdSession.id,
      entityType: "auth_session",
      payloadJson: {
        email: normalizedEmail,
      },
    });

    return createdSession;
  });

  return {
    expiresAt,
    session,
    sessionToken,
    success: true,
    user: getPublicAdminUser(user),
  };
}

export async function invalidateAdminSession(sessionToken, reason = "logout") {
  if (!sessionToken) {
    return null;
  }

  const prisma = getPrismaClient();
  const session = await getStoredSessionByToken(sessionToken);

  if (!session || session.invalidatedAt) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const invalidatedSession = await tx.adminSession.update({
      where: { id: session.id },
      data: {
        invalidatedAt: new Date(),
      },
    });

    await createAuditEvent(tx, {
      action: "AUTH_LOGOUT_SUCCEEDED",
      actorId: session.userId,
      entityId: session.id,
      entityType: "auth_session",
      payloadJson: {
        reason,
      },
    });

    return invalidatedSession;
  });
}

export async function validateRequestAdminSession(request) {
  const sessionToken = getSessionTokenFromRequest(request);

  if (!sessionToken) {
    return { status: "auth_required" };
  }

  const validation = await validateAdminSessionToken(sessionToken);

  if (validation.status !== "authenticated") {
    return { status: "invalid_or_expired_session" };
  }

  const prisma = getPrismaClient();

  prisma.adminSession
    .update({
      where: { id: validation.session.id },
      data: {
        lastUsedAt: new Date(),
      },
    })
    .catch(() => {});

  return {
    session: validation.session,
    status: "authenticated",
    user: validation.user,
  };
}

export async function getOptionalAdminSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;

  if (!sessionToken) {
    return null;
  }

  const validation = await validateAdminSessionToken(sessionToken);

  if (validation.status !== "authenticated") {
    return null;
  }

  return validation;
}

export async function requireAdminPageSession(nextPath = ADMIN_HOME_PATH) {
  const validation = await getOptionalAdminSession();

  if (!validation) {
    redirect(buildAdminLoginHref(nextPath));
  }

  return validation;
}

export function buildLoginSuccessPayload(user, expiresAt) {
  return {
    expiresAt: expiresAt.toISOString(),
    success: true,
    user,
  };
}

export function buildLogoutSuccessPayload() {
  return {
    success: true,
  };
}

export { ADMIN_HOME_PATH, buildAdminLoginHref, normalizeAdminRedirectTarget };
