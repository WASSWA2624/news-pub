import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminJobLogsSnapshot } from "@/features/analytics";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { runScheduledStreams, runStreamFetch } from "@/lib/news/workflows";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

const jobRunSchema = z.object({
  runDueStreams: z.boolean().optional(),
  streamId: z.string().trim().optional(),
});

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.VIEW_JOBS);

  if (auth.response) {
    return auth.response;
  }

  const snapshot = await getAdminJobLogsSnapshot({
    search: request.nextUrl.searchParams.get("search") || undefined,
    status: request.nextUrl.searchParams.get("status") || undefined,
  });

  return NextResponse.json({
    data: snapshot,
    success: true,
  });
}

export async function POST(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.VIEW_JOBS);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, jobRunSchema);

  if (result.response) {
    return result.response;
  }

  if (result.data.streamId) {
    const run = await runStreamFetch(result.data.streamId, {
      actorId: auth.user.id,
      triggerType: "manual",
    });

    return NextResponse.json({
      data: run,
      success: true,
    });
  }

  const summary = await runScheduledStreams();

  return NextResponse.json({
    data: summary,
    success: true,
  });
}
