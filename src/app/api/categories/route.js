import { NextResponse } from "next/server";

import {
  createCategoryManagementErrorPayload,
  deleteCategoryRecord,
  deleteCategoryRecordSchema,
  getCategoryManagementSnapshot,
  saveCategoryRecord,
  saveCategoryRecordSchema,
} from "@/features/posts";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_CATEGORIES);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getCategoryManagementSnapshot({
      categoryId: request.nextUrl.searchParams.get("categoryId") || undefined,
    });

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    const payload = createCategoryManagementErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function PUT(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_CATEGORIES);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, saveCategoryRecordSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const savedCategory = await saveCategoryRecord(result.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: savedCategory,
      success: true,
    });
  } catch (error) {
    const payload = createCategoryManagementErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function DELETE(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_CATEGORIES);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, deleteCategoryRecordSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const deletedCategory = await deleteCategoryRecord(result.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: deletedCategory,
      success: true,
    });
  } catch (error) {
    const payload = createCategoryManagementErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
