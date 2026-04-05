import { NextResponse } from "next/server";

import { requireAdminApiPermission } from "@/lib/auth/api";
import { hasRequestSecret } from "@/lib/auth/internal";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { env } from "@/lib/env/server";
import { runScheduledStreams } from "@/lib/news/workflows";

function hasCronAuthorization(request) {
  return hasRequestSecret(request, env.cron.secret, {
    headerNames: ["x-cron-secret"],
  });
}

export async function POST(request) {
  if (!hasCronAuthorization(request)) {
    const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.VIEW_JOBS);

    if (auth.response) {
      return auth.response;
    }
  }

  const summary = await runScheduledStreams();

  return NextResponse.json({
    data: summary,
    success: true,
  });
}
