/**
 * Admin API route for provider-backed source catalog discovery.
 */

import { NextResponse } from "next/server";

import {
  createAdminAuthorizationFailureResponse,
  requireAdminApiSession,
} from "@/lib/auth/api";
import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/lib/auth/rbac";
import {
  getProviderSourceCatalogSupport,
  resolveStreamProviderRequestValues,
  sanitizeProviderFieldValues,
} from "@/lib/news/provider-definitions";
import { fetchProviderSourceCatalog } from "@/lib/news/providers";
import { createApiErrorResponse } from "@/lib/errors";

function parseRequestValues(rawValue) {
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)
      ? parsedValue
      : {};
  } catch {
    return {};
  }
}

export async function GET(request) {
  const auth = await requireAdminApiSession(request);

  if (auth.response) {
    return auth.response;
  }

  if (
    !hasAdminPermission(auth.user, ADMIN_PERMISSIONS.MANAGE_PROVIDERS)
    && !hasAdminPermission(auth.user, ADMIN_PERMISSIONS.MANAGE_STREAMS)
  ) {
    return createAdminAuthorizationFailureResponse(ADMIN_PERMISSIONS.MANAGE_STREAMS, auth.user);
  }

  const { searchParams } = new URL(request.url);
  const provider_key = `${searchParams.get("provider_key") || ""}`.trim().toLowerCase();
  const query = `${searchParams.get("query") || ""}`.trim();
  const scope = searchParams.get("scope") === "stream" ? "stream" : "provider";
  const formValues = parseRequestValues(searchParams.get("values"));

  if (!provider_key) {
    return NextResponse.json(
      {
        message: "provider_key is required.",
        success: false,
      },
      { status: 400 },
    );
  }

  try {
    const requestValues =
      scope === "stream"
        ? resolveStreamProviderRequestValues(provider_key, {
            country_allowlist_json: formValues.country_allowlist_json,
            language_allowlist_json: formValues.language_allowlist_json,
            locale: formValues.locale,
            providerFilters: formValues,
          })
        : sanitizeProviderFieldValues(provider_key, formValues);
    const sourceCatalogSupport = getProviderSourceCatalogSupport(provider_key, requestValues);

    if (!sourceCatalogSupport.available) {
      return NextResponse.json({
        data: {
          options: [],
          sourceCatalogSupport,
          supported: false,
        },
        success: true,
      });
    }

    const catalog = await fetchProviderSourceCatalog({
      provider_key,
      query,
      requestValues,
    });

    return NextResponse.json({
      data: {
        ...catalog,
        sourceCatalogSupport,
      },
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to load the provider source catalog.");
  }
}
