import { defaultLocale } from "@/features/i18n/config";
import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/lib/auth/rbac";
import { createProviderConfigSummary } from "@/lib/ai/provider-configs";
import { generationStageOrder } from "@/lib/generation/stages";

import { createAdminGenerationFormState } from "./admin-input";

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

function createLocaleOption() {
  return {
    code: defaultLocale,
    isDefault: true,
    label: defaultLocale.toUpperCase(),
    name: "English",
  };
}

export async function getAdminGeneratePostSnapshot(user, prisma) {
  const db = await resolvePrismaClient(prisma);
  const providerConfigs = await db.modelProviderConfig.findMany({
    orderBy: [{ isDefault: "desc" }, { provider: "asc" }, { model: "asc" }, { updatedAt: "desc" }],
    select: {
      apiKeyEncrypted: true,
      apiKeyEnvName: true,
      apiKeyLast4: true,
      apiKeyUpdatedAt: true,
      id: true,
      isDefault: true,
      model: true,
      provider: true,
      purpose: true,
      updatedAt: true,
    },
    where: {
      isEnabled: true,
    },
  });
  const defaultProviderConfig = providerConfigs.find((config) => config.isDefault) || providerConfigs[0] || null;

  return {
    defaults: createAdminGenerationFormState({
      locale: defaultLocale,
      providerConfigId: defaultProviderConfig?.id || "",
    }),
    localeOptions: [createLocaleOption()],
    permissions: {
      canEditDrafts: hasAdminPermission(user, ADMIN_PERMISSIONS.EDIT_POSTS),
      canManageProviders: hasAdminPermission(user, ADMIN_PERMISSIONS.MANAGE_PROVIDER_CONFIG),
      canPublish: hasAdminPermission(user, ADMIN_PERMISSIONS.PUBLISH_POSTS),
      canSchedule: hasAdminPermission(user, ADMIN_PERMISSIONS.SCHEDULE_POSTS),
    },
    providerConfigs: providerConfigs.map(createProviderConfigSummary),
    stageOrder: generationStageOrder,
  };
}
