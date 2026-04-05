import { NextResponse } from "next/server";

import { getSeoManagementSnapshot } from "@/features/seo";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_SEO);

  if (auth.response) {
    return auth.response;
  }

  const snapshot = await getSeoManagementSnapshot();

  return NextResponse.json({
    data: snapshot,
    success: true,
  });
}
