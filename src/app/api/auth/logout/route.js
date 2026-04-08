/**
 * Admin authentication API route for invalidating NewsPub admin sessions.
 */

import { createLogoutResponse, requireAdminApiSession } from "@/lib/auth/api";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";

/**
 * Handles POST requests for the NewsPub admin logout API.
 */
export async function POST(request) {
  const auth = await requireAdminApiSession(request);

  if (auth.response) {
    return auth.response;
  }

  return createLogoutResponse(request.cookies.get(SESSION_COOKIE_NAME)?.value || null);
}
