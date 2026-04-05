import { NextResponse } from "next/server";
import { z } from "zod";

import { getStreamManagementSnapshot, saveStreamRecord } from "@/features/streams";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

const streamSchema = z.object({
  activeProviderId: z.string().trim().min(1),
  categoryIds: z.array(z.string().trim().min(1)).optional(),
  defaultTemplateId: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  destinationId: z.string().trim().min(1),
  duplicateWindowHours: z.coerce.number().int().positive().optional(),
  excludeKeywordsJson: z.union([z.string(), z.array(z.string())]).optional(),
  includeKeywordsJson: z.union([z.string(), z.array(z.string())]).optional(),
  locale: z.string().trim().min(1),
  maxPostsPerRun: z.coerce.number().int().positive().optional(),
  mode: z.string().trim().min(1),
  name: z.string().trim().min(1),
  retryBackoffMinutes: z.coerce.number().int().nonnegative().optional(),
  retryLimit: z.coerce.number().int().nonnegative().optional(),
  scheduleExpression: z.string().trim().optional().or(z.literal("")),
  scheduleIntervalMinutes: z.coerce.number().int().positive().optional(),
  slug: z.string().trim().optional().or(z.literal("")),
  status: z.string().trim().min(1),
  timezone: z.string().trim().min(1),
});

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_STREAMS);

  if (auth.response) {
    return auth.response;
  }

  const snapshot = await getStreamManagementSnapshot();

  return NextResponse.json({
    data: snapshot,
    success: true,
  });
}

export async function PUT(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_STREAMS);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, streamSchema);

  if (result.response) {
    return result.response;
  }

  const record = await saveStreamRecord(result.data, {
    actorId: auth.user.id,
  });

  return NextResponse.json({
    data: record,
    success: true,
  });
}
