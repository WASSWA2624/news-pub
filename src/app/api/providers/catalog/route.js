/**
 * Admin API route for provider catalog metadata and endpoint capability details used by NewsPub forms.
 */

import { NextResponse } from "next/server";

import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { listNewsProviders } from "@/lib/news/providers";

/**
 * Handles GET requests for the NewsPub provider catalog API.
 */
export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_PROVIDERS);

  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({
    data: listNewsProviders(),
    success: true,
  });
}
