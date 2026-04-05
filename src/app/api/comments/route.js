import { NextResponse } from "next/server";

import {
  createCommentWorkflowErrorPayload,
  getCommentModerationSnapshot,
  getCommentSubmissionFormSnapshot,
  submitCommentRecord,
} from "@/features/comments";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { commentSubmissionSchema } from "@/lib/validation";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

function buildCaptchaResponseData() {
  return {
    captcha: getCommentSubmissionFormSnapshot().captcha,
  };
}

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MODERATE_COMMENTS);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getCommentModerationSnapshot({
      commentId: request.nextUrl.searchParams.get("commentId") || undefined,
      page: request.nextUrl.searchParams.get("page") || undefined,
      query: request.nextUrl.searchParams.get("query") || undefined,
      status: request.nextUrl.searchParams.get("status") || undefined,
    });

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    const payload = createCommentWorkflowErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function POST(request) {
  const result = await validateJsonRequest(request, commentSubmissionSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const savedComment = await submitCommentRecord(result.data, {
      request,
    });

    return NextResponse.json(
      {
        data: {
          ...savedComment,
          ...buildCaptchaResponseData(),
        },
        success: true,
      },
      { status: 201 },
    );
  } catch (error) {
    const payload = createCommentWorkflowErrorPayload(error);

    return NextResponse.json(
      {
        ...payload.body,
        data: buildCaptchaResponseData(),
      },
      { status: payload.statusCode },
    );
  }
}
