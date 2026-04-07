import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { runStreamFetch } from "@/lib/news/workflows";
import { createApiErrorResponse } from "@/lib/errors";
import { validateJsonRequest } from "@/lib/validation/api-request";

const streamRunSchema = z.object({
  streamId: z.string().trim().min(1),
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
    const run = await runStreamFetch(result.data.streamId, {
      actorId: auth.user.id,
      triggerType: "manual",
    });

    return NextResponse.json({
      data: {
        run,
      },
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to run the publishing stream.");
  }
}
