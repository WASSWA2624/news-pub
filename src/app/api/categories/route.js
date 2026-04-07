import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteCategoryRecord, getCategoryManagementSnapshot, saveCategoryRecord } from "@/features/categories";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { createApiErrorResponse } from "@/lib/errors";
import { validateJsonRequest } from "@/lib/validation/api-request";

const saveCategorySchema = z.object({
  description: z.string().trim().optional().or(z.literal("")),
  id: z.string().trim().optional(),
  name: z.string().trim().min(1),
  slug: z.string().trim().optional().or(z.literal("")),
});

const deleteCategorySchema = z.object({
  id: z.string().trim().min(1),
});

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_CATEGORIES);

  if (auth.response) {
    return auth.response;
  }

  try {
    const snapshot = await getCategoryManagementSnapshot();

    return NextResponse.json({
      data: snapshot,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to load categories.");
  }
}

export async function PUT(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_CATEGORIES);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, saveCategorySchema);

  if (result.response) {
    return result.response;
  }

  try {
    const record = await saveCategoryRecord(result.data, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: record,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to save the category.");
  }
}

export async function DELETE(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_CATEGORIES);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, deleteCategorySchema);

  if (result.response) {
    return result.response;
  }

  try {
    const record = await deleteCategoryRecord(result.data.id, {
      actorId: auth.user.id,
    });

    return NextResponse.json({
      data: record,
      success: true,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Unable to delete the category.");
  }
}
