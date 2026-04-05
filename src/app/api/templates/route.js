import { NextResponse } from "next/server";
import { z } from "zod";

import { getTemplateManagementSnapshot, saveTemplateRecord } from "@/features/templates";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

const templateSchema = z.object({
  bodyTemplate: z.string().min(1),
  categoryId: z.string().trim().optional().or(z.literal("")),
  hashtagsTemplate: z.string().optional(),
  id: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
  locale: z.string().trim().optional().or(z.literal("")),
  name: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  summaryTemplate: z.string().optional(),
  titleTemplate: z.string().optional(),
});

export async function GET(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_TEMPLATES);

  if (auth.response) {
    return auth.response;
  }

  const snapshot = await getTemplateManagementSnapshot();

  return NextResponse.json({
    data: snapshot,
    success: true,
  });
}

export async function PUT(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.MANAGE_TEMPLATES);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, templateSchema);

  if (result.response) {
    return result.response;
  }

  const record = await saveTemplateRecord(result.data, {
    actorId: auth.user.id,
  });

  return NextResponse.json({
    data: record,
    success: true,
  });
}
