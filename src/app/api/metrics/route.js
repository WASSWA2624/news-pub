import { NextResponse } from "next/server";

import { getAdminDashboardSnapshot } from "@/features/analytics";
import { requireAdminApiPermission } from "@/lib/auth/api";
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
  } catch {
    return NextResponse.json(
      {
        message: "Unable to load admin metrics.",
        status: "internal_error",
        success: false,
      },
      { status: 500 },
    );
  }
}
