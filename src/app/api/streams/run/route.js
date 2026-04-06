import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { NewsPubError } from "@/lib/news/shared";
import { runStreamFetch } from "@/lib/news/workflows";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

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
    if (error instanceof NewsPubError) {
      return NextResponse.json(
        {
          message: error.message,
          status: error.status,
          success: false,
        },
        { status: error.statusCode },
      );
    }

    throw error;
  }
}
