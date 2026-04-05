import { NextResponse } from "next/server";

import { createAiCompositionErrorPayload, generateDraftFromRequest } from "@/lib/ai";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { detectDuplicateEquipmentPost } from "@/lib/generation/duplicates";
import { safeParseGenerationRequest } from "@/lib/validation";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

export async function POST(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.GENERATE_POSTS);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request);

  if (result.response) {
    return result.response;
  }

  const duplicateCheck = await detectDuplicateEquipmentPost(
    {
      equipmentName: result.data?.equipmentName,
      locale: result.data?.locale,
    },
    undefined,
  );
  const parsedRequest = safeParseGenerationRequest(result.data, {
    duplicateDetected: duplicateCheck.duplicateDetected,
  });

  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        success: false,
        status: "invalid_payload",
        issues: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const generationResult = await generateDraftFromRequest(parsedRequest.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json(generationResult);
  } catch (error) {
    const payload = createAiCompositionErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
