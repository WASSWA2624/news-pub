import { NextResponse } from "next/server";

import { getSettingsSnapshot } from "@/features/settings";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_SETTINGS);

  if (auth.response) {
    return auth.response;
  }

  const snapshot = await getSettingsSnapshot();

  return NextResponse.json({
    data: snapshot,
    success: true,
  });
}
