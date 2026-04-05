import { NextResponse } from "next/server";
import { z } from "zod";

import { getDestinationManagementSnapshot, saveDestinationRecord } from "@/features/destinations";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

const destinationSchema = z.object({
  accountHandle: z.string().trim().optional().or(z.literal("")),
  clearToken: z.boolean().optional(),
  connectionError: z.string().trim().optional().or(z.literal("")),
  connectionStatus: z.string().trim().min(1),
  externalAccountId: z.string().trim().optional().or(z.literal("")),
  kind: z.string().trim().min(1),
  name: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  settingsJson: z.record(z.string(), z.any()).optional(),
  slug: z.string().trim().min(1),
  token: z.string().trim().optional().or(z.literal("")),
});

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_DESTINATIONS);

  if (auth.response) {
    return auth.response;
  }

  const snapshot = await getDestinationManagementSnapshot();

  return NextResponse.json({
    data: snapshot,
    success: true,
  });
}

export async function PUT(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_DESTINATIONS);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, destinationSchema);

  if (result.response) {
    return result.response;
  }

  const record = await saveDestinationRecord(result.data, {
    actorId: auth.user.id,
  });

  return NextResponse.json({
    data: record,
    success: true,
  });
}
