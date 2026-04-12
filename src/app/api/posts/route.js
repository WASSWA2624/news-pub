/**
 * Admin API route handlers for listing and creating NewsPub canonical posts.
 */

import { z } from "zod";

import { NextResponse } from "next/server";

import { createManualPostRecord, getPostEditorSnapshot, getPostInventorySnapshot } from "@/features/posts";
import { ensureAdminApiPermission, requireAdminApiPermission, requireAdminApiSession } from "@/lib/auth/api";
import { createApiErrorResponse } from "@/lib/errors";
import { ADMIN_PERMISSIONS, getRequiredPermissionsForPostUpdate } from "@/lib/auth/rbac";
import { validateJsonRequest } from "@/lib/validation/api-request";

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

const createManualPostSchema = z.object({
  action: z.string().trim().optional(),
  categoryIds: z.array(z.string().trim().min(1)).optional(),
  content_md: z.string().optional(),
  locale: z.string().trim().optional(),
  publishAt: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  source_name: z.string().trim().optional(),
  source_url: z.string().trim().optional(),
  status: z.string().trim().optional(),
  stream_id: z.string().trim().optional(),
  summary: z.string().optional(),
  title: z.string().optional(),
});

/**
 * Handles GET requests for the NewsPub posts admin API.
 */
export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.VIEW_POST_INVENTORY);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getPostInventorySnapshot({
      page: request.nextUrl.searchParams.get("page") || undefined,
      scope: request.nextUrl.searchParams.get("scope") || undefined,
      search: request.nextUrl.searchParams.get("search") || undefined,
    });

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to load the post inventory.");
  }
}

/**
 * Handles POST requests for the NewsPub posts admin API.
 */
export async function POST(request) {
  const auth = await requireAdminApiSession(request);

  if (auth.response) {
    return auth.response;
  }

  const validatedBody = await validateJsonRequest(request, createManualPostSchema);

  if (validatedBody.response) {
    return validatedBody.response;
  }

  const action = trimText(validatedBody.data.action).toLowerCase();
  const permissionPayload = {
    ...validatedBody.data,
    status:
      action === "publish"
        ? "PUBLISHED"
        : action === "schedule"
          ? "SCHEDULED"
          : trimText(validatedBody.data.status).toUpperCase() || undefined,
  };

  for (const permission of getRequiredPermissionsForPostUpdate(permissionPayload)) {
    const authorizationResponse = ensureAdminApiPermission(auth.user, permission);

    if (authorizationResponse) {
      return authorizationResponse;
    }
  }

  try {
    const createdRecord = await createManualPostRecord(
      permissionPayload,
      {
        actor_id: auth.user.id,
      },
    );
    const snapshot = await getPostEditorSnapshot(createdRecord);

    return NextResponse.json(
      {
        data: snapshot,
        success: true,
      },
      { status: 201 },
    );
  } catch (error) {
    return createApiErrorResponse(error, "Unable to create the manual story.");
  }
}
