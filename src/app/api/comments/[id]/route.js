import { NextResponse } from "next/server";

import {
  createCommentWorkflowErrorPayload,
  moderateCommentRecord,
  removeCommentRecord,
} from "@/features/comments";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import {
  commentDeletionSchema,
  commentModerationUpdateSchema,
} from "@/lib/validation";
import {
  idParamSchema,
  validateJsonRequest,
  validateParams,
} from "@/lib/validation/api-placeholders";

async function resolveCommentParams(params) {
  const resolvedParams = await params;
  return validateParams(resolvedParams, idParamSchema);
}

export async function PATCH(request, { params }) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MODERATE_COMMENTS);

  if (auth.response) {
    return auth.response;
  }

  const validatedParams = await resolveCommentParams(params);

  if (validatedParams.response) {
    return validatedParams.response;
  }

  const validatedBody = await validateJsonRequest(request, commentModerationUpdateSchema);

  if (validatedBody.response) {
    return validatedBody.response;
  }

  try {
    const result = await moderateCommentRecord(validatedParams.data.id, validatedBody.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: result,
      success: true,
    });
  } catch (error) {
    const payload = createCommentWorkflowErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MODERATE_COMMENTS);

  if (auth.response) {
    return auth.response;
  }

  const validatedParams = await resolveCommentParams(params);

  if (validatedParams.response) {
    return validatedParams.response;
  }

  const validatedBody = await validateJsonRequest(request, commentDeletionSchema);

  if (validatedBody.response) {
    return validatedBody.response;
  }

  try {
    const result = await removeCommentRecord(validatedParams.data.id, validatedBody.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: result,
      success: true,
    });
  } catch (error) {
    const payload = createCommentWorkflowErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
