/**
 * Admin API route for the NewsPub operational settings and health snapshot.
 */

import { getSettingsSnapshot } from "@/features/settings";
import { handleAdminGet } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

/**
 * Handles GET requests for the NewsPub settings admin API.
 */
export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.MANAGE_SETTINGS,
    async () => getSettingsSnapshot(),
    "Unable to load settings.",
  );
}
