import { NextResponse } from "next/server";

import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import {
  createResearchDataErrorPayload,
  getManufacturerManagementSnapshot,
  saveManufacturerRecord,
  saveManufacturerRecordSchema,
} from "@/lib/research";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_MANUFACTURERS);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getManufacturerManagementSnapshot({
      manufacturerId: request.nextUrl.searchParams.get("manufacturerId") || undefined,
    });

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    const payload = createResearchDataErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function PUT(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_MANUFACTURERS);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, saveManufacturerRecordSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const savedManufacturer = await saveManufacturerRecord(result.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: savedManufacturer,
      success: true,
    });
  } catch (error) {
    const payload = createResearchDataErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
