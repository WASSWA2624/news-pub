import { NextResponse } from "next/server";

import {
  getPublishedPostTranslationBySlug,
} from "@/features/posts";
import { defaultLocale } from "@/features/i18n/config";
import { createApiErrorResponse } from "@/lib/errors";
import {
  slugParamSchema,
  validateParams,
} from "@/lib/validation/api-request";

/**
 * Returns one published localized post record resolved by canonical slug.
 *
 * @param {Request} request - Incoming request with an optional locale query param.
 * @param {{ params: Promise<{ slug: string }> | { slug: string } }} context - Route params.
 * @returns {Promise<Response>} A JSON response containing the localized public story payload.
 */
export async function GET(request, { params }) {
  const resolvedParams = await params;
  const validatedParams = validateParams(resolvedParams, slugParamSchema);

  if (validatedParams.response) {
    return validatedParams.response;
  }

  try {
    const locale = request.nextUrl.searchParams.get("locale") || defaultLocale;
    const post = await getPublishedPostTranslationBySlug({
      locale,
      slug: validatedParams.data.slug,
    });

    if (!post) {
      return NextResponse.json(
        {
          message: "Published localized content was not found.",
          status: "post_not_found",
          success: false,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      post,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to load the published story.");
  }
}
