/**
 * Admin API route handlers for listing and mutating NewsPub publishing streams.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getStreamManagementSnapshot, saveStreamRecord } from "@/features/streams";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { createApiErrorResponse } from "@/lib/errors";
import { validateJsonRequest } from "@/lib/validation/api-request";

const streamSchema = z.object({
  active_provider_id: z.string().trim().min(1),
  categoryIds: z.array(z.string().trim().min(1)).optional(),
  default_template_id: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  destination_id: z.string().trim().min(1),
  duplicate_window_hours: z.coerce.number().int().positive().optional(),
  exclude_keywords_json: z.union([z.string(), z.array(z.string())]).optional(),
  include_keywords_json: z.union([z.string(), z.array(z.string())]).optional(),
  locale: z.string().trim().min(1),
  max_posts_per_run: z.coerce.number().int().positive().optional(),
  mode: z.string().trim().min(1),
  name: z.string().trim().min(1),
  postLinkPlacement: z.enum(["RANDOM", "BELOW_TITLE", "END"]).optional(),
  postLinkUrl: z.string().trim().optional().or(z.literal("")),
  retry_backoff_minutes: z.coerce.number().int().nonnegative().optional(),
  retry_limit: z.coerce.number().int().nonnegative().optional(),
  schedule_interval_minutes: z.coerce.number().int().nonnegative().optional(),
  slug: z.string().trim().optional().or(z.literal("")),
  status: z.string().trim().min(1),
  timezone: z.string().trim().min(1),
});

/**
 * Handles GET requests for the NewsPub streams admin API.
 */
export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_STREAMS);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getStreamManagementSnapshot();

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to load publishing streams.");
  }
}

/**
 * Handles PUT requests for the NewsPub streams admin API.
 */
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
      actor_id: auth.user.id,
    });

    return NextResponse.json({
      data: record,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to save the publishing stream.");
  }
}
