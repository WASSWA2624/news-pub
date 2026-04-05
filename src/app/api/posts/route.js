import { NextResponse } from "next/server";

import { getPostInventorySnapshot } from "@/features/posts";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.VIEW_POST_INVENTORY);

  if (auth.response) {
    return auth.response;
  }

  const snapshot = await getPostInventorySnapshot({
    page: request.nextUrl.searchParams.get("page") || undefined,
    scope: request.nextUrl.searchParams.get("scope") || undefined,
    search: request.nextUrl.searchParams.get("search") || undefined,
  });

  return NextResponse.json({
    data: snapshot,
    success: true,
  });
}
