/**
 * Admin API route handlers for listing and mutating NewsPub categories.
 */

import { z } from "zod";

import { deleteCategoryRecord, getCategoryManagementSnapshot, saveCategoryRecord } from "@/features/categories";
import { handleAdminGet, handleAdminMutation } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

const saveCategorySchema = z.object({
  description: z.string().trim().optional().or(z.literal("")),
  id: z.string().trim().optional(),
  name: z.string().trim().min(1),
  slug: z.string().trim().optional().or(z.literal("")),
});

const deleteCategorySchema = z.object({
  id: z.string().trim().min(1),
});

/**
 * Handles GET requests for the NewsPub categories admin API.
 */
export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
    async () => getCategoryManagementSnapshot(),
    "Unable to load categories.",
  );
}

/**
 * Handles PUT requests for the NewsPub categories admin API.
 */
export async function PUT(request) {
  return handleAdminMutation(
    request,
    ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
    saveCategorySchema,
    async ({ data, user }) =>
      saveCategoryRecord(data, {
        actor_id: user.id,
      }),
    "Unable to save the category.",
  );
}

/**
 * Handles DELETE requests for the NewsPub categories admin API.
 */
export async function DELETE(request) {
  return handleAdminMutation(
    request,
    ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
    deleteCategorySchema,
    async ({ data, user }) =>
      deleteCategoryRecord(data.id, {
        actor_id: user.id,
      }),
    "Unable to delete the category.",
  );
}
