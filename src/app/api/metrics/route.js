import { NextResponse } from "next/server";

import { getAdminDashboardSnapshot } from "@/features/analytics";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { createApiErrorResponse } from "@/lib/errors";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.VIEW_ANALYTICS);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getAdminDashboardSnapshot(auth.user);

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to load admin metrics.");
  }
}
