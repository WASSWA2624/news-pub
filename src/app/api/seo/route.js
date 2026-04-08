/**
 * Admin API route for the NewsPub SEO settings snapshot.
 */

import { getSeoManagementSnapshot } from "@/features/seo";
import { handleAdminGet } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

/**
 * Handles GET requests for the NewsPub SEO admin API.
 */
export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.MANAGE_SEO,
    async () => getSeoManagementSnapshot(),
    "Unable to load SEO settings.",
  );
}
