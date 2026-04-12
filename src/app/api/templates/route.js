/**
 * Admin API route handlers for listing and mutating NewsPub destination templates.
 */

import { z } from "zod";

import { getTemplateManagementSnapshot, saveTemplateRecord } from "@/features/templates";
import { handleAdminGet, handleAdminMutation } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

const templateSchema = z.object({
  body_template: z.string().min(1),
  category_id: z.string().trim().optional().or(z.literal("")),
  hashtags_template: z.string().optional(),
  id: z.string().trim().optional(),
  is_default: z.boolean().optional(),
  locale: z.string().trim().optional().or(z.literal("")),
  name: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  summary_template: z.string().optional(),
  title_template: z.string().optional(),
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
        actor_id: user.id,
      }),
    "Unable to save the template.",
  );
}
