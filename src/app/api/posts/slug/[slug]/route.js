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
