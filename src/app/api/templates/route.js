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

export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.MANAGE_TEMPLATES,
    async () => getTemplateManagementSnapshot(),
    "Unable to load template settings.",
  );
}

/**
 * Creates or updates a destination template.
 *
 * @param {Request} request - Incoming route request.
 * @returns {Promise<Response>} The saved template response.
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
