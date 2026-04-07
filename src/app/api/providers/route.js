import { NextResponse } from "next/server";
import { z } from "zod";

import { getProviderManagementSnapshot, saveProviderRecord } from "@/features/providers";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { createApiErrorResponse } from "@/lib/errors";
import { validateJsonRequest } from "@/lib/validation/api-request";

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
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_PROVIDERS);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getProviderManagementSnapshot();

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to load provider settings.");
  }
}

export async function PUT(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_PROVIDERS);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, providerSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const record = await saveProviderRecord(result.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: record,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to save the provider.");
  }
}
