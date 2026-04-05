import { NextResponse } from "next/server";

import {
  createEditorialWorkflowErrorPayload,
  getPostInventorySnapshot,
} from "@/features/posts";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.VIEW_CONTENT_LISTS);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getPostInventorySnapshot({
      scope: request.nextUrl.searchParams.get("scope") || undefined,
      search: request.nextUrl.searchParams.get("search") || undefined,
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
