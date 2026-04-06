import { NextResponse } from "next/server";

import { getMetaDiscoverySnapshot } from "@/features/destinations/meta-config";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_DESTINATIONS);

  if (auth.response) {
    return auth.response;
  }

  const snapshot = await getMetaDiscoverySnapshot();

  return NextResponse.json(
    {
      data: snapshot,
      success: true,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
