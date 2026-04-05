import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiPermission } from "@/lib/auth/api";
import { hasRequestSecret } from "@/lib/auth/internal";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { env } from "@/lib/env/server";
import { runScheduledPublishingWorker } from "@/lib/jobs";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

const scheduledPublishingRequestSchema = z
  .object({
    batchSize: z.number().int().positive().max(100).optional(),
    maxAttempts: z.number().int().positive().max(5).optional(),
    retryDelayMs: z.number().int().nonnegative().max(10_000).optional(),
  })
  .strict();

function hasCronAuthorization(request) {
  return hasRequestSecret(request, env.cron.secret, {
    headerNames: ["x-cron-secret"],
  });
}

export async function POST(request) {
  if (!hasCronAuthorization(request)) {
    const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.PUBLISH_POSTS);

    if (auth.response) {
      return auth.response;
    }
  }

  const result = await validateJsonRequest(request, scheduledPublishingRequestSchema);

  if (result.response) {
    return result.response;
  }

  const summary = await runScheduledPublishingWorker(result.data);

  return NextResponse.json({
    data: summary,
    success: true,
  });
}
