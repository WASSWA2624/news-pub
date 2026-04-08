/**
 * Protected API route for triggering NewsPub cache revalidation.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { createApiErrorResponse } from "@/lib/errors";
import { revalidatePaths } from "@/lib/revalidation";
import { validateJsonRequest } from "@/lib/validation/api-request";

const revalidateSchema = z
  .object({
    path: z.string().trim().min(1).optional(),
    paths: z.array(z.string().trim().min(1)).optional(),
    secret: z.string().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.path && !value.paths?.length) {
      context.addIssue({
        code: "custom",
        message: "At least one path is required.",
        path: ["path"],
      });
    }
  });

/**
 * Handles POST requests for the NewsPub cache revalidation API.
 */
export async function POST(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.REVALIDATE_SITE);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, revalidateSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const paths = await revalidatePaths([result.data.path, ...(result.data.paths || [])]);

    return NextResponse.json({
      data: {
        paths,
      },
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(
      {
        message: error instanceof Error ? error.message : "A revalidation error occurred.",
        status: "invalid_revalidation_path",
        statusCode: 400,
      },
      "Unable to revalidate the requested paths.",
    );
  }
}
