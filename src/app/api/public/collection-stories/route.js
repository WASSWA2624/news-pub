import { NextResponse } from "next/server";

import { defaultLocale, isSupportedLocale } from "@/features/i18n/config";
import {
  getPublishedCategoryPageData,
  getPublishedNewsIndexData,
  searchPublishedPosts,
} from "@/features/public-site";

function normalizePage(value, fallback = 1) {
  const parsedValue = Number.parseInt(`${value ?? fallback}`.trim(), 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestedLocale = `${searchParams.get("locale") || defaultLocale}`.trim().toLowerCase();
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const view = `${searchParams.get("view") || ""}`.trim().toLowerCase();
  const page = normalizePage(searchParams.get("page"), 2);
  let data = null;

  if (view === "news") {
    data = await getPublishedNewsIndexData({ locale, page });
  } else if (view === "category") {
    const slug = `${searchParams.get("slug") || ""}`.trim().toLowerCase();

    if (!slug) {
      return NextResponse.json(
        {
          message: "Category slug is required.",
          success: false,
        },
        { status: 400 },
      );
    }

    data = await getPublishedCategoryPageData({ locale, page, slug });

    if (!data) {
      return NextResponse.json(
        {
          message: "Category not found.",
          success: false,
        },
        { status: 404 },
      );
    }
  } else if (view === "search") {
    const query = `${searchParams.get("q") || ""}`.trim();
    const country = `${searchParams.get("country") || ""}`.trim();

    data = await searchPublishedPosts({
      country,
      locale,
      page,
      search: query,
    });
  } else {
    return NextResponse.json(
      {
        message: "Unsupported collection view.",
        success: false,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: {
      hasMore: Boolean(data?.pagination?.hasNextPage),
      items: Array.isArray(data?.items) ? data.items : [],
      page: data?.pagination?.currentPage || page,
      totalItems: data?.pagination?.totalItems || 0,
    },
    success: true,
  });
}
