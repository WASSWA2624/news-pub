import { NextResponse } from "next/server";

import { recordObservabilityEvent } from "@/lib/analytics";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import {
  createResearchDataErrorPayload,
  getSourceConfigurationSnapshot,
  saveSourceConfigurations,
  saveSourceConfigurationsSchema,
} from "@/lib/research";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_SOURCE_CONFIG);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getSourceConfigurationSnapshot();

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    await recordObservabilityEvent({
      action: "SOURCE_FETCH_ERROR",
      actorId: auth.user.id,
      entityId: "source_configuration",
      entityType: "source_config",
      error,
      message: "Source configuration request failed.",
      payload: {
        method: "GET",
        route: "/api/sources",
      },
    }).catch(() => {});
    const payload = createResearchDataErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function PUT(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_SOURCE_CONFIG);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, saveSourceConfigurationsSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const savedConfigurations = await saveSourceConfigurations(result.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: savedConfigurations,
      success: true,
    });
  } catch (error) {
    await recordObservabilityEvent({
      action: "SOURCE_FETCH_ERROR",
      actorId: auth.user.id,
      entityId: "source_configuration",
      entityType: "source_config",
      error,
      message: "Source configuration update failed.",
      payload: {
        method: "PUT",
        route: "/api/sources",
      },
    }).catch(() => {});
    const payload = createResearchDataErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
