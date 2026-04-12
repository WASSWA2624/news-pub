/**
 * Admin API route handlers for listing and mutating NewsPub provider settings.
 */

import { z } from "zod";

import { getProviderManagementSnapshot, saveProviderRecord } from "@/features/providers";
import { handleAdminGet, handleAdminMutation } from "@/lib/api/admin-route";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

const providerSchema = z.object({
  base_url: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  is_default: z.boolean().optional(),
  is_enabled: z.boolean().optional(),
  is_selectable: z.boolean().optional(),
  label: z.string().trim().min(1),
  provider_key: z.string().trim().min(1),
  request_defaults_json: z.record(z.string(), z.any()).optional(),
});

/**
 * Handles GET requests for the NewsPub providers admin API.
 */
export async function GET(request) {
  return handleAdminGet(
    request,
    ADMIN_PERMISSIONS.MANAGE_PROVIDERS,
    async () => getProviderManagementSnapshot(),
    "Unable to load provider settings.",
  );
}

/**
 * Handles PUT requests for the NewsPub providers admin API.
 */
export async function PUT(request) {
  return handleAdminMutation(
    request,
    ADMIN_PERMISSIONS.MANAGE_PROVIDERS,
    providerSchema,
    async ({ data, user }) =>
      saveProviderRecord(data, {
        actor_id: user.id,
      }),
    "Unable to save the provider.",
  );
}
