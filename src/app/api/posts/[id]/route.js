/**
 * Admin API route handlers for loading and updating one NewsPub canonical post.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getPostEditorSnapshot, updatePostEditorialRecord } from "@/features/posts";
import { ensureAdminApiPermission, requireAdminApiSession } from "@/lib/auth/api";
import { createApiErrorResponse } from "@/lib/errors";
import { ADMIN_PERMISSIONS, getRequiredPermissionsForPostUpdate } from "@/lib/auth/rbac";
import { idParamSchema, validateJsonRequest, validateParams } from "@/lib/validation/api-request";

const updatePostSchema = z.object({
  action: z.string().trim().optional(),
  article_match_id: z.string().trim().optional(),
  categoryIds: z.array(z.string().trim().min(1)).optional(),
  content_md: z.string().optional(),
  editorial_stage: z.string().trim().optional(),
  locale: z.string().trim().optional(),
  publishAt: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  status: z.string().trim().optional(),
  summary: z.string().optional(),
  title: z.string().optional(),
});

/**
 * Handles GET requests for the NewsPub post-detail admin API.
 */
export async function GET(request, { params }) {
  const auth = await requireAdminApiSession(request);

  if (auth.response) {
    return auth.response;
  }

  const resolvedParams = await params;
  const validatedParams = validateParams(resolvedParams, idParamSchema);

  if (validatedParams.response) {
    return validatedParams.response;
  }

  const authorizationResponse = ensureAdminApiPermission(auth.user, ADMIN_PERMISSIONS.EDIT_POSTS);

  if (authorizationResponse) {
    return authorizationResponse;
  }

  try {
    const snapshot = await getPostEditorSnapshot({
      locale: request.nextUrl.searchParams.get("locale") || undefined,
      post_id: validatedParams.data.id,
    });

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to load the story editor snapshot.");
  }
}

/**
 * Handles PATCH requests for the NewsPub post-detail admin API.
 */
export async function PATCH(request, { params }) {
  const auth = await requireAdminApiSession(request);

  if (auth.response) {
    return auth.response;
  }

  const resolvedParams = await params;
  const validatedParams = validateParams(resolvedParams, idParamSchema);

  if (validatedParams.response) {
    return validatedParams.response;
  }

  const validatedBody = await validateJsonRequest(request, updatePostSchema);

  if (validatedBody.response) {
    return validatedBody.response;
  }

  for (const permission of getRequiredPermissionsForPostUpdate(validatedBody.data)) {
    const authorizationResponse = ensureAdminApiPermission(auth.user, permission);

    if (authorizationResponse) {
      return authorizationResponse;
    }
  }

  try {
    const record = await updatePostEditorialRecord(
      {
        post_id: validatedParams.data.id,
        ...validatedBody.data,
      },
      {
        actor_id: auth.user.id,
      },
    );

    return NextResponse.json({
      data: record,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to update the story.");
  }
}
