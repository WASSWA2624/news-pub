import { NextResponse } from "next/server";

import {
  createEditorialWorkflowErrorPayload,
  getPostEditorSnapshot,
  updatePostEditorialRecord,
  updatePostEditorialRecordSchema,
} from "@/features/posts";
import { ensureAdminApiPermission, requireAdminApiSession } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS, getRequiredPermissionsForPostUpdate } from "@/lib/auth/rbac";
import {
  idParamSchema,
  validateJsonRequest,
  validateParams,
} from "@/lib/validation/api-placeholders";

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
      postId: validatedParams.data.id,
    });

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    const payload = createEditorialWorkflowErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

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

  const validatedBody = await validateJsonRequest(request, updatePostEditorialRecordSchema);

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
    const savedPost = await updatePostEditorialRecord(
      {
        postId: validatedParams.data.id,
        ...validatedBody.data,
      },
      {
        actorId: auth.user.id,
      },
    );

    return NextResponse.json({
      data: savedPost,
      success: true,
    });
  } catch (error) {
    const payload = createEditorialWorkflowErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
