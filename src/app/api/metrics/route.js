/**
 * Admin API route for the NewsPub dashboard metrics and runtime-health summary.
 */

import { getAdminDashboardSnapshot } from "@/features/analytics";
import { handleAdminGet } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

/**
 * Handles GET requests for the NewsPub metrics admin API.
 */
export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.VIEW_ANALYTICS,
    async (user) => getAdminDashboardSnapshot(user),
    "Unable to load admin metrics.",
  );
}
