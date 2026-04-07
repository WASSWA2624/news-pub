import { getAdminDashboardSnapshot } from "@/features/analytics";
import { handleAdminGet } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

/**
 * Returns the authenticated admin metrics snapshot used by the dashboard.
 *
 * @param {Request} request - Incoming route request.
 * @returns {Promise<Response>} The admin metrics response.
 */
export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.VIEW_ANALYTICS,
    async (user) => getAdminDashboardSnapshot(user),
    "Unable to load admin metrics.",
  );
}
