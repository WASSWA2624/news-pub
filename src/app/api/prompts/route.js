import { NextResponse } from "next/server";

import {
  createAiCompositionErrorPayload,
  getPromptConfigurationSnapshot,
  savePromptTemplates,
  savePromptTemplatesSchema,
} from "@/lib/ai";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_PROMPTS);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getPromptConfigurationSnapshot();

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    const payload = createAiCompositionErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function PUT(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_PROMPTS);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, savePromptTemplatesSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const savedPrompts = await savePromptTemplates(result.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: savedPrompts,
      success: true,
    });
  } catch (error) {
    const payload = createAiCompositionErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
