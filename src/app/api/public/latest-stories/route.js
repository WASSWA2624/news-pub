import { NextResponse } from "next/server";

import { defaultLocale, isSupportedLocale } from "@/features/i18n/config";
import { publicHomeLatestIncrementCount } from "@/features/public-site/constants";
import { getPublishedHomeLatestStoriesData } from "@/features/public-site";

function normalizeNonNegativeInteger(value, fallback) {
  const parsedValue = Number.parseInt(`${value ?? fallback}`.trim(), 10);

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
}

function normalizeTake(value) {
  const parsedValue = normalizeNonNegativeInteger(value, publicHomeLatestIncrementCount);

  return parsedValue > 0 ? Math.min(parsedValue, publicHomeLatestIncrementCount) : publicHomeLatestIncrementCount;
}

/**
 * Returns the next page of public home stories for progressive loading.
 *
 * @param {Request} request - Incoming request with locale and pagination query params.
 * @returns {Promise<Response>} A JSON response containing the latest-story payload.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestedLocale = `${searchParams.get("locale") || defaultLocale}`.trim().toLowerCase();
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const skip = normalizeNonNegativeInteger(searchParams.get("skip"), 1);
  const take = normalizeTake(searchParams.get("take"));
  const data = await getPublishedHomeLatestStoriesData({
    locale,
    skip,
    take,
  });

  return NextResponse.json({
    data,
    success: true,
  });
}
