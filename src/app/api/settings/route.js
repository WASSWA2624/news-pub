import { getSettingsSnapshot } from "@/features/settings";
import { handleAdminGet } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

/**
 * Returns the environment-backed settings snapshot shown in admin settings.
 *
 * @param {Request} request - Incoming route request.
 * @returns {Promise<Response>} The settings snapshot response.
 */
export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.MANAGE_SETTINGS,
    async () => getSettingsSnapshot(),
    "Unable to load settings.",
  );
}
