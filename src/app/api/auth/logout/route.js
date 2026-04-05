import { createLogoutResponse, requireAdminApiSession } from "@/lib/auth/api";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";

export async function POST(request) {
  const auth = await requireAdminApiSession(request);

  if (auth.response) {
    return auth.response;
  }

  return createLogoutResponse(request.cookies.get(SESSION_COOKIE_NAME)?.value || null);
}
