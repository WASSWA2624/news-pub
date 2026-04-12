/**
 * Core NewsPub admin authentication services for credential checks, sessions, and server-side guards.
 */

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
const DEFAULT_PASSWORD_HASH_COST = 32768;
const PASSWORD_HASH_BLOCK_SIZE = 8;
const PASSWORD_HASH_PARALLELIZATION = 1;
const DEFAULT_PASSWORD_HASH_MAX_MEMORY = 128 * 1024 * 1024;

function parsePositiveIntegerEnv(name, fallbackValue) {
  const rawValue = `${process.env[name] || ""}`.trim();

  if (!rawValue) {
    return fallbackValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer when provided.`);
  }

  return parsedValue;
}

function getPasswordHashConfig() {
  return {
    blockSize: PASSWORD_HASH_BLOCK_SIZE,
    cost: parsePositiveIntegerEnv("ADMIN_PASSWORD_HASH_COST", DEFAULT_PASSWORD_HASH_COST),
    maxMemory: parsePositiveIntegerEnv("ADMIN_PASSWORD_HASH_MAX_MEMORY_BYTES", DEFAULT_PASSWORD_HASH_MAX_MEMORY),
    parallelization: PASSWORD_HASH_PARALLELIZATION,
  };
}

function getPasswordHashParameters(password_hash) {
  const [algorithm, cost, blockSize, parallelization, salt, derivedKey] = password_hash.split("$");

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
  return Boolean(user?.is_active && isAdminRole(user.role));
}

async function createAuditEvent(db, { action, actor_id = null, entity_id, entity_type, payload_json }) {
  return db.auditEvent.create({
    data: {
      action,
      actor_id,
      entity_id,
      entity_type,
      payload_json,
    },
  });
}

async function recordLoginFailure(db, normalizedEmail, reason) {
  await createAuditEvent(db, {
    action: "AUTH_LOGIN_FAILED",
    entity_id: normalizedEmail,
    entity_type: "auth_identity",
    payload_json: {
      reason,
    },
  });
}

async function invalidateStoredSession(db, session, reason) {
  if (session.invalidated_at) {
    return session;
  }

  return db.$transaction(async (tx) => {
    const invalidatedSession = await tx.adminSession.update({
      where: { id: session.id },
      data: {
        invalidated_at: new Date(),
      },
      include: {
        user: {
          select: {
            email: true,
            id: true,
            is_active: true,
            name: true,
            role: true,
          },
        },
      },
    });

    await createAuditEvent(tx, {
      action: "AUTH_SESSION_REJECTED",
      actor_id: session.user_id,
      entity_id: session.id,
      entity_type: "auth_session",
      payload_json: {
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
      token_hash: hashSessionToken(token),
    },
    include: {
      user: {
        select: {
          email: true,
          id: true,
          is_active: true,
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

  if (session.invalidated_at) {
    return { status: "invalidated" };
  }

  if (session.expires_at <= new Date()) {
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

/**
 * Normalizes admin email input for case-insensitive NewsPub authentication checks.
 */
export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/**
 * Creates the scrypt password-hash format used for NewsPub admin credentials.
 */
export function createPasswordHash(password) {
  const passwordHashConfig = getPasswordHashConfig();
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH, {
    maxmem: passwordHashConfig.maxMemory,
    N: passwordHashConfig.cost,
    p: passwordHashConfig.parallelization,
    r: passwordHashConfig.blockSize,
  });

  return [
    PASSWORD_HASH_ALGORITHM,
    passwordHashConfig.cost,
    passwordHashConfig.blockSize,
    passwordHashConfig.parallelization,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

/**
 * Verifies a plaintext password against the stored NewsPub admin password hash.
 */
export function verifyPassword(password, password_hash) {
  const params = getPasswordHashParameters(password_hash);

  if (!params) {
    return false;
  }

  const expectedKey = Buffer.from(params.derivedKey, "base64url");
  const actualKey = crypto.scryptSync(
    password,
    Buffer.from(params.salt, "base64url"),
    expectedKey.length,
    {
      maxmem: DEFAULT_PASSWORD_HASH_MAX_MEMORY,
      N: params.cost,
      p: params.parallelization,
      r: params.blockSize,
    },
  );

  return crypto.timingSafeEqual(expectedKey, actualKey);
}

/**
 * Hashes an admin session token before it is persisted or looked up.
 */
export function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Authenticates admin credentials, creates a stored session, and records the login audit event.
 */
export async function authenticateAdminCredentials({ email, password, user_agent = null }) {
  const prisma = getPrismaClient();
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    await recordLoginFailure(prisma, normalizedEmail, "user_not_found");
    return {
      status: "user_not_found",
      success: false,
    };
  }

  if (!user.is_active) {
    await recordLoginFailure(prisma, normalizedEmail, "user_inactive");
    return {
      status: "user_inactive",
      success: false,
    };
  }

  if (!isAdminRole(user.role)) {
    await recordLoginFailure(prisma, normalizedEmail, "role_not_allowed");
    return {
      status: "role_not_allowed",
      success: false,
    };
  }

  if (!verifyPassword(password, user.password_hash)) {
    await recordLoginFailure(prisma, normalizedEmail, "invalid_password");
    return {
      status: "invalid_password",
      success: false,
    };
  }

  const expires_at = new Date(Date.now() + env.auth.session.maxAgeSeconds * 1000);
  const sessionToken = crypto.randomBytes(32).toString("base64url");
  const session = await prisma.$transaction(async (tx) => {
    const createdSession = await tx.adminSession.create({
      data: {
        expires_at,
        token_hash: hashSessionToken(sessionToken),
        user_agent,
        user_id: user.id,
      },
    });

    await createAuditEvent(tx, {
      action: "AUTH_LOGIN_SUCCEEDED",
      actor_id: user.id,
      entity_id: createdSession.id,
      entity_type: "auth_session",
      payload_json: {
        email: normalizedEmail,
      },
    });

    return createdSession;
  });

  return {
    expires_at,
    session,
    sessionToken,
    success: true,
    user: getPublicAdminUser(user),
  };
}

/**
 * Invalidates a stored NewsPub admin session and records the reason in the audit log.
 */
export async function invalidateAdminSession(sessionToken, reason = "logout") {
  if (!sessionToken) {
    return null;
  }

  const prisma = getPrismaClient();
  const session = await getStoredSessionByToken(sessionToken);

  if (!session || session.invalidated_at) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const invalidatedSession = await tx.adminSession.update({
      where: { id: session.id },
      data: {
        invalidated_at: new Date(),
      },
    });

    await createAuditEvent(tx, {
      action: "AUTH_LOGOUT_SUCCEEDED",
      actor_id: session.user_id,
      entity_id: session.id,
      entity_type: "auth_session",
      payload_json: {
        reason,
      },
    });

    return invalidatedSession;
  });
}

/**
 * Validates the request cookie against the stored NewsPub admin session state.
 */
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
        last_used_at: new Date(),
      },
    })
    .catch(() => {});

  return {
    session: validation.session,
    status: "authenticated",
    user: validation.user,
  };
}

/**
 * Returns the current admin session when one is present and valid.
 */
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

/**
 * Requires a valid admin page session or redirects to the sanitized NewsPub login target.
 */
export async function requireAdminPageSession(nextPath = ADMIN_HOME_PATH) {
  const validation = await getOptionalAdminSession();

  if (!validation) {
    redirect(buildAdminLoginHref(nextPath));
  }

  return validation;
}

/**
 * Builds the success payload returned after a NewsPub admin login.
 */
export function buildLoginSuccessPayload(user, expires_at) {
  return {
    expires_at: expires_at.toISOString(),
    success: true,
    user,
  };
}

/**
 * Builds the success payload returned after a NewsPub admin logout.
 */
export function buildLogoutSuccessPayload() {
  return {
    success: true,
  };
}

export { ADMIN_HOME_PATH, buildAdminLoginHref, normalizeAdminRedirectTarget };
