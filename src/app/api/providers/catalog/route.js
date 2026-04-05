import { NextResponse } from "next/server";

import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import {
  createProviderCatalogErrorPayload,
  searchAiProviderCatalog,
  searchAiProviderModels,
} from "@/lib/ai/provider-catalog";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_PROVIDER_CONFIG);

  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const query = searchParams.get("q") || "";
  const forceRefresh = searchParams.get("force") === "1";

  try {
    if (!provider) {
      return NextResponse.json({
        data: searchAiProviderCatalog(query),
        success: true,
      });
    }

    const result = await searchAiProviderModels(provider, query, {
      forceRefresh,
    });

    return NextResponse.json({
      data: result,
      success: true,
    });
  } catch (error) {
    const payload = createProviderCatalogErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
