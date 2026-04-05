import { NextResponse } from "next/server";

import {
  createLocalizedContentErrorPayload,
  getPublishedPostTranslationBySlug,
} from "@/features/posts";
import { defaultLocale } from "@/features/i18n/config";
import {
  slugParamSchema,
  validateParams,
} from "@/lib/validation/api-placeholders";

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
    const payload = createLocalizedContentErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
