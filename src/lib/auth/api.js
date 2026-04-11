/**
 * Admin API authentication helpers for NewsPub session cookies, login, logout, and permission enforcement.
 */

import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { getAdminAuthorizationFailure, hasAdminPermission } from "@/lib/auth/rbac";
import { env } from "@/lib/env/server";

import {
  authenticateAdminCredentials,
  buildLoginSuccessPayload,
  buildLogoutSuccessPayload,
  invalidateAdminSession,
  validateRequestAdminSession,
} from "./index";

const LOGIN_FAILURE_MESSAGES = Object.freeze({
  invalid_credentials: "The email or password is incorrect.",
  invalid_password: "The password is incorrect.",
  role_not_allowed: "This account does not have admin access.",
  user_inactive: "This admin account is inactive.",
  user_not_found: "No admin account exists for that email address.",
});

function getLoginFailureMessage(status) {
  return LOGIN_FAILURE_MESSAGES[status] || LOGIN_FAILURE_MESSAGES.invalid_credentials;
}

function getSessionCookieSettings(expiresAt) {
  return {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: env.app.url.startsWith("https://"),
  };
}

/**
 * Stores the validated NewsPub admin session token on the response cookie.
 */
export function setAdminSessionCookie(response, sessionToken, expiresAt) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieSettings(expiresAt));
}

/**
 * Expires the NewsPub admin session cookie on the response.
 */
export function clearAdminSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieSettings(new Date(0)),
    maxAge: 0,
  });
}

/**
 * Validates the current admin API session and returns a standard auth response when it is missing or stale.
 */
export async function requireAdminApiSession(request) {
  const validation = await validateRequestAdminSession(request);

  if (validation.status !== "authenticated") {
    const response = NextResponse.json(
      {
        message: "Admin authentication is required.",
        status: validation.status,
        success: false,
      },
      { status: 401 },
    );

    if (validation.status !== "auth_required") {
      clearAdminSessionCookie(response);
    }

    return {
      response,
    };
  }

  return validation;
}

/**
 * Builds the standard 403 JSON payload for an admin API permission failure.
 */
export function createAdminAuthorizationFailureResponse(permission, user) {
  return NextResponse.json(getAdminAuthorizationFailure(permission, user), { status: 403 });
}

/**
 * Returns a permission failure response when the authenticated admin lacks the requested capability.
 */
export function ensureAdminApiPermission(user, permission) {
  if (hasAdminPermission(user, permission)) {
    return null;
  }

  return createAdminAuthorizationFailureResponse(permission, user);
}

/**
 * Combines admin session validation with RBAC checks for protected NewsPub APIs.
 */
export async function requireAdminApiPermission(request, permission) {
  const auth = await requireAdminApiSession(request);

  if (auth.response) {
    return auth;
  }

  const authorizationResponse = ensureAdminApiPermission(auth.user, permission);

  if (authorizationResponse) {
    return {
      response: authorizationResponse,
    };
  }

  return auth;
}

/**
 * Authenticates admin credentials, creates the session cookie, and returns the standard NewsPub login payload.
 */
export async function createLoginResponse({ email, password, userAgent }) {
  const result = await authenticateAdminCredentials({ email, password, userAgent });

  if (!result.success) {
    return NextResponse.json(
      {
        message: getLoginFailureMessage(result.status),
        status: result.status,
        success: false,
      },
      { status: 401 },
    );
  }

  const response = NextResponse.json(buildLoginSuccessPayload(result.user, result.expiresAt));

  setAdminSessionCookie(response, result.sessionToken, result.expiresAt);

  return response;
}

/**
 * Invalidates the current admin session token and clears the NewsPub session cookie.
 */
export async function createLogoutResponse(sessionToken) {
  await invalidateAdminSession(sessionToken);

  const response = NextResponse.json(buildLogoutSuccessPayload());

  clearAdminSessionCookie(response);

  return response;
}
