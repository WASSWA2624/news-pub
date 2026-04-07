import { z } from "zod";

import { getProviderManagementSnapshot, saveProviderRecord } from "@/features/providers";
import { handleAdminGet, handleAdminMutation } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

const providerSchema = z.object({
  baseUrl: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  isSelectable: z.boolean().optional(),
  label: z.string().trim().min(1),
  providerKey: z.string().trim().min(1),
  requestDefaultsJson: z.record(z.string(), z.any()).optional(),
});

export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.MANAGE_PROVIDERS,
    async () => getProviderManagementSnapshot(),
    "Unable to load provider settings.",
  );
}

/**
 * Creates or updates a provider configuration.
 *
 * @param {Request} request - Incoming route request.
 * @returns {Promise<Response>} The saved provider response.
 */
export async function PUT(request) {
  return handleAdminMutation(
    request,
    ADMIN_PERMISSIONS.MANAGE_PROVIDERS,
    providerSchema,
    async ({ data, user }) =>
      saveProviderRecord(data, {
        actorId: user.id,
      }),
    "Unable to save the provider.",
  );
}
