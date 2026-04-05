import { NextResponse } from "next/server";

import {
  createLocalizedContentErrorPayload,
  getLocalizationManagementSnapshot,
  savePostLocaleContent,
  savePostLocaleContentSchema,
} from "@/features/posts";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_LOCALIZATION);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getLocalizationManagementSnapshot({
      locale: request.nextUrl.searchParams.get("locale") || undefined,
      postId: request.nextUrl.searchParams.get("postId") || undefined,
    });

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    const payload = createLocalizedContentErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function PUT(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_LOCALIZATION);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, savePostLocaleContentSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const savedContent = await savePostLocaleContent(result.data, { actorId: auth.user.id });

    return NextResponse.json({
      data: savedContent,
      success: true,
    });
  } catch (error) {
    const payload = createLocalizedContentErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
