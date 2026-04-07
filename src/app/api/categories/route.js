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

export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
    async () => getCategoryManagementSnapshot(),
    "Unable to load categories.",
  );
}

/**
 * Creates or updates a category from the admin workspace.
 *
 * @param {Request} request - Incoming route request.
 * @returns {Promise<Response>} The saved category response.
 */
export async function PUT(request) {
  return handleAdminMutation(
    request,
    ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
    saveCategorySchema,
    async ({ data, user }) =>
      saveCategoryRecord(data, {
        actorId: user.id,
      }),
    "Unable to save the category.",
  );
}

/**
 * Deletes an existing category from the admin workspace.
 *
 * @param {Request} request - Incoming route request.
 * @returns {Promise<Response>} The deleted category response.
 */
export async function DELETE(request) {
  return handleAdminMutation(
    request,
    ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
    deleteCategorySchema,
    async ({ data, user }) =>
      deleteCategoryRecord(data.id, {
        actorId: user.id,
      }),
    "Unable to delete the category.",
  );
}
