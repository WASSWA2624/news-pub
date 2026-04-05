import { NextResponse } from "next/server";
import { z } from "zod";

import { createLocalizedContentErrorPayload, savePostLocaleContent } from "@/features/posts";
import { defaultLocale } from "@/features/i18n/config";
import { requireAdminApiPermission } from "@/lib/auth/api";
import { ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

const saveDraftSchema = z.object({
  contentHtml: z.string().optional(),
  contentMd: z.string().optional(),
  disclaimer: z.string().min(1).optional(),
  excerpt: z.string().min(1).optional(),
  faqJson: z.any().optional(),
  isAutoTranslated: z.boolean().optional(),
  locale: z.string().optional(),
  postId: z.string().min(1),
  structuredContentJson: z.any().optional(),
  title: z.string().optional(),
});

export async function POST(request) {
  const auth = await requireAdminApiPermission(request, ADMIN_PERMISSIONS.EDIT_POSTS);

  if (auth.response) {
    return auth.response;
  }

  const result = await validateJsonRequest(request, saveDraftSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const savedDraft = await savePostLocaleContent(
      {
        ...result.data,
        locale: result.data.locale || defaultLocale,
      },
      { actorId: auth.user.id },
    );

    return NextResponse.json({
      data: savedDraft,
      success: true,
    });
  } catch (error) {
    const payload = createLocalizedContentErrorPayload(error);

    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
