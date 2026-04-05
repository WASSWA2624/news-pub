import { ensureAdminApiPermission, requireAdminApiSession } from "@/lib/auth/api";
import { getRequiredPermissionForPublishAction } from "@/lib/auth/rbac";
import {
  createEditorialWorkflowErrorPayload,
  publishPostRecord,
  publishPostRecordSchema,
} from "@/features/posts";
import { NextResponse } from "next/server";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

export async function POST(request) {
  const auth = await requireAdminApiSession(request);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, publishPostRecordSchema);

  if (result.response) {
    return result.response;
  }

  const authorizationResponse = ensureAdminApiPermission(
    auth.user,
    getRequiredPermissionForPublishAction(result.data.publishAt),
  );

  if (authorizationResponse) {
    return authorizationResponse;
  }

  try {
    const publishedPost = await publishPostRecord(result.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: publishedPost,
      success: true,
    });
  } catch (error) {
    const payload = createEditorialWorkflowErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
