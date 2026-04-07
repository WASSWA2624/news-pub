import { NextResponse } from "next/server";
import { z } from "zod";

import { getStreamManagementSnapshot, saveStreamRecord } from "@/features/streams";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { NewsPubError } from "@/lib/news/shared";
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
  postLinkPlacement: z.enum(["RANDOM", "BELOW_TITLE", "END"]).optional(),
  postLinkUrl: z.string().trim().optional().or(z.literal("")),
  retryBackoffMinutes: z.coerce.number().int().nonnegative().optional(),
  retryLimit: z.coerce.number().int().nonnegative().optional(),
  scheduleIntervalMinutes: z.coerce.number().int().nonnegative().optional(),
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

  try {
    const record = await saveStreamRecord(result.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: record,
      success: true,
    });
  } catch (error) {
    if (error instanceof NewsPubError) {
      return NextResponse.json(
        {
          message: error.message,
          status: error.status,
          success: false,
        },
        { status: error.statusCode },
      );
    }

    throw error;
  }
}
