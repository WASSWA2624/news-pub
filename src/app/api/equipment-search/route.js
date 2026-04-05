import { NextResponse } from "next/server";

import {
  publicEquipmentSuggestionLimit,
  searchPublishedEquipmentSuggestions,
} from "@/features/public-site";
import { defaultLocale } from "@/features/i18n/config";

export async function GET(request) {
  try {
    const locale = request.nextUrl.searchParams.get("locale") || defaultLocale;
    const search = request.nextUrl.searchParams.get("q") || "";
    const limitValue = Number.parseInt(request.nextUrl.searchParams.get("limit") || "", 10);
    const data = await searchPublishedEquipmentSuggestions({
      limit: Number.isFinite(limitValue) && limitValue > 0 ? limitValue : publicEquipmentSuggestionLimit,
      locale,
      search,
    });

    return NextResponse.json({
      data,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to search published equipment.",
        status: "equipment_search_failed",
        success: false,
      },
      { status: 500 },
    );
  }
}
