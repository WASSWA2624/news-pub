import { NextResponse } from "next/server";

import { recordObservabilityEvent } from "@/lib/analytics";
import {
  createMediaLibraryErrorPayload,
  getMediaLibrarySnapshot,
  uploadMediaAsset,
} from "@/features/media";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";

function getFormDataText(formData, key) {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

function getFormDataFile(formData, key) {
  const value = formData.get(key);

  return value && typeof value === "object" && typeof value.arrayBuffer === "function" ? value : null;
}

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.UPLOAD_MEDIA);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getMediaLibrarySnapshot({
      assetId: request.nextUrl.searchParams.get("assetId") || undefined,
      query: request.nextUrl.searchParams.get("query") || undefined,
    });

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    await recordObservabilityEvent({
      action: "MEDIA_LIBRARY_FAILURE",
      actorId: auth.user.id,
      entityId: "media_library",
      entityType: "media_library",
      error,
      message: "Media library request failed.",
      payload: {
        method: "GET",
        route: "/api/media",
      },
    }).catch(() => {});
    const payload = createMediaLibraryErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function POST(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.UPLOAD_MEDIA);

  if (auth.response) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const file = getFormDataFile(formData, "file");
    const uploadedAsset = await uploadMediaAsset({
      alt: getFormDataText(formData, "alt"),
      attributionText: getFormDataText(formData, "attributionText"),
      caption: getFormDataText(formData, "caption"),
      fileBuffer: file ? Buffer.from(await file.arrayBuffer()) : Buffer.alloc(0),
      fileName: file?.name || getFormDataText(formData, "fileName") || "upload",
      isAiGenerated: getFormDataText(formData, "isAiGenerated"),
      licenseType: getFormDataText(formData, "licenseType"),
      mimeType: file?.type || getFormDataText(formData, "mimeType"),
      sourceUrl: getFormDataText(formData, "sourceUrl"),
      usageNotes: getFormDataText(formData, "usageNotes"),
    }, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: uploadedAsset,
      success: true,
    });
  } catch (error) {
    await recordObservabilityEvent({
      action: "MEDIA_LIBRARY_FAILURE",
      actorId: auth.user.id,
      entityId: "media_library",
      entityType: "media_library",
      error,
      message: "Media upload failed.",
      payload: {
        method: "POST",
        route: "/api/media",
      },
    }).catch(() => {});
    const payload = createMediaLibraryErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
