/**
 * Admin API route handlers for NewsPub job history and operator-triggered job actions.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminJobLogsSnapshot } from "@/features/analytics";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { createApiErrorResponse } from "@/lib/errors";
import { runMultipleStreamFetches, runScheduledStreams, runStreamFetch } from "@/lib/news/workflows";
import { validateJsonRequest } from "@/lib/validation/api-request";

const fetchWindowSchema = z.object({
  end: z.string().trim().min(1).optional(),
  start: z.string().trim().min(1).optional(),
  writeCheckpointOnSuccess: z.boolean().optional(),
});

const jobRunSchema = z
  .object({
    fetchWindow: fetchWindowSchema.optional(),
    runDueStreams: z.boolean().optional(),
    streamId: z.string().trim().optional(),
    streamIds: z.array(z.string().trim().min(1)).min(1).optional(),
  });

/**
 * Handles GET requests for the NewsPub jobs admin API.
 */
export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.VIEW_JOBS);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getAdminJobLogsSnapshot({
      search: request.nextUrl.searchParams.get("search") || undefined,
      status: request.nextUrl.searchParams.get("status") || undefined,
    });

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to load job activity.");
  }
}

/**
 * Handles POST requests for the NewsPub jobs admin API.
 */
export async function POST(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.VIEW_JOBS);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, jobRunSchema);

  if (result.response) {
    return result.response;
  }

  try {
    if (result.data.streamId) {
      const run = await runStreamFetch(result.data.streamId, {
        actorId: auth.user.id,
        fetchWindow: result.data.fetchWindow
          ? {
              end: result.data.fetchWindow.end,
              start: result.data.fetchWindow.start,
            }
          : null,
        triggerType: "manual",
        writeCheckpointOnSuccess: result.data.fetchWindow?.writeCheckpointOnSuccess ?? null,
      });

      return NextResponse.json({
        data: run,
        success: true,
      });
    }

    if (result.data.streamIds?.length) {
      const batch = await runMultipleStreamFetches(result.data.streamIds, {
        actorId: auth.user.id,
        fetchWindow: result.data.fetchWindow
          ? {
              end: result.data.fetchWindow.end,
              start: result.data.fetchWindow.start,
            }
          : null,
        triggerType: "manual",
        writeCheckpointOnSuccess: result.data.fetchWindow?.writeCheckpointOnSuccess ?? null,
      });

      return NextResponse.json({
        data: batch,
        success: true,
      });
    }

    const summary = await runScheduledStreams();

    return NextResponse.json({
      data: summary,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to run the requested job.");
  }
}
