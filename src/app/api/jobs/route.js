import { NextResponse } from "next/server";

import { getAdminJobLogsSnapshot } from "@/features/analytics";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.VIEW_JOBS);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getAdminJobLogsSnapshot({
      jobId: request.nextUrl.searchParams.get("jobId") || undefined,
      search: request.nextUrl.searchParams.get("search") || undefined,
      status: request.nextUrl.searchParams.get("status") || undefined,
    });

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Unable to load job logs.",
        status: "internal_error",
        success: false,
      },
      { status: 500 },
    );
  }
}
