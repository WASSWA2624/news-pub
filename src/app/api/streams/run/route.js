import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { runMultipleStreamFetches, runStreamFetch } from "@/lib/news/workflows";
import { createApiErrorResponse } from "@/lib/errors";
import { validateJsonRequest } from "@/lib/validation/api-request";

const fetchWindowSchema = z.object({
  end: z.string().trim().min(1).optional(),
  start: z.string().trim().min(1).optional(),
  writeCheckpointOnSuccess: z.boolean().optional(),
});

const streamRunSchema = z
  .object({
    fetchWindow: fetchWindowSchema.optional(),
    streamId: z.string().trim().min(1).optional(),
    streamIds: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.streamId && !value.streamIds?.length) {
      ctx.addIssue({
        code: "custom",
        message: "Provide at least one stream id.",
        path: ["streamIds"],
      });
    }
  });

export async function POST(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_STREAMS);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, streamRunSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const requestedStreamIds = result.data.streamIds?.length
      ? result.data.streamIds
      : result.data.streamId
        ? [result.data.streamId]
        : [];
    const requestedFetchWindow = result.data.fetchWindow
      ? {
          end: result.data.fetchWindow.end,
          start: result.data.fetchWindow.start,
        }
      : null;

    if (requestedStreamIds.length === 1) {
      const run = await runStreamFetch(requestedStreamIds[0], {
        actorId: auth.user.id,
        fetchWindow: requestedFetchWindow,
        triggerType: "manual",
        writeCheckpointOnSuccess: result.data.fetchWindow?.writeCheckpointOnSuccess ?? null,
      });

      return NextResponse.json({
        data: {
          run,
        },
        success: true,
      });
    }

    const batch = await runMultipleStreamFetches(requestedStreamIds, {
      actorId: auth.user.id,
      fetchWindow: requestedFetchWindow,
      triggerType: "manual",
      writeCheckpointOnSuccess: result.data.fetchWindow?.writeCheckpointOnSuccess ?? null,
    });

    return NextResponse.json({
      data: {
        batch,
      },
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to run the publishing stream.");
  }
}
