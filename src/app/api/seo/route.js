import { getSeoManagementSnapshot } from "@/features/seo";
import { handleAdminGet } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

/**
 * Returns the SEO configuration snapshot shown in the admin workspace.
 *
 * @param {Request} request - Incoming route request.
 * @returns {Promise<Response>} The SEO snapshot response.
 */
export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.MANAGE_SEO,
    async () => getSeoManagementSnapshot(),
    "Unable to load SEO settings.",
  );
}
