/**
 * Admin API route handlers for listing and mutating NewsPub destination templates.
 */

import { z } from "zod";

import { getTemplateManagementSnapshot, saveTemplateRecord } from "@/features/templates";
import { handleAdminGet, handleAdminMutation } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

const templateSchema = z.object({
  bodyTemplate: z.string().min(1),
  categoryId: z.string().trim().optional().or(z.literal("")),
  hashtagsTemplate: z.string().optional(),
  id: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
  locale: z.string().trim().optional().or(z.literal("")),
  name: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  summaryTemplate: z.string().optional(),
  titleTemplate: z.string().optional(),
});

/**
 * Handles GET requests for the NewsPub templates admin API.
 */
export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.MANAGE_TEMPLATES,
    async () => getTemplateManagementSnapshot(),
    "Unable to load template settings.",
  );
}

/**
 * Handles PUT requests for the NewsPub templates admin API.
 */
export async function PUT(request) {
  return handleAdminMutation(
    request,
    ADMIN_PERMISSIONS.MANAGE_TEMPLATES,
    templateSchema,
    async ({ data, user }) =>
      saveTemplateRecord(data, {
        actorId: user.id,
      }),
    "Unable to save the template.",
  );
}
