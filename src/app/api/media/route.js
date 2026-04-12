/**
 * Admin API route handlers for browsing and uploading NewsPub media assets.
 */

import { NextResponse } from "next/server";

import { getMediaLibrarySnapshot, uploadMediaAsset } from "@/features/media";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { env } from "@/lib/env/server";

function getFormDataText(formData, key) {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

function getFormDataFile(formData, key) {
  const value = formData.get(key);

  return value && typeof value === "object" && typeof value.arrayBuffer === "function" ? value : null;
}

/**
 * Handles GET requests for the NewsPub media admin API.
 */
export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_MEDIA);

  if (auth.response) {
    return auth.response;
  }

  const snapshot = await getMediaLibrarySnapshot();

  return NextResponse.json({
    data: snapshot,
    success: true,
  });
}

/**
 * Handles POST requests for the NewsPub media admin API.
 */
export async function POST(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_MEDIA);

  if (auth.response) {
    return auth.response;
  }

  const formData = await request.formData();
  const file = getFormDataFile(formData, "file");

  if (!file) {
    return NextResponse.json(
      {
        message: "A media file is required.",
        status: "invalid_payload",
        success: false,
      },
      { status: 400 },
    );
  }

  if (Number.isFinite(file.size) && file.size > env.media.maxRemoteFileBytes) {
    return NextResponse.json(
      {
        message: `Media asset exceeds the ${env.media.maxRemoteFileBytes} byte limit.`,
        status: "media_too_large",
        success: false,
      },
      { status: 400 },
    );
  }

  const asset = await uploadMediaAsset(
    {
      alt: getFormDataText(formData, "alt"),
      attribution_text: getFormDataText(formData, "attribution_text"),
      buffer: Buffer.from(await file.arrayBuffer()),
      caption: getFormDataText(formData, "caption"),
      file_name: file.name || "upload",
      mime_type: file.type || "application/octet-stream",
      source_url: getFormDataText(formData, "source_url"),
    },
    {
      actor_id: auth.user.id,
    },
  );

  return NextResponse.json(
    {
      data: asset,
      success: true,
    },
    { status: 201 },
  );
}
