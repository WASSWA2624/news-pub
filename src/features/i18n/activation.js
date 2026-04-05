import { defaultLocale, getRegisteredLocaleDefinitions } from "@/features/i18n/config";

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

export function getConfiguredLocaleRecords() {
  return getRegisteredLocaleDefinitions().map((definition) => ({
    code: definition.code,
    isActive: definition.isActive,
    isDefault: definition.code === defaultLocale,
    name: definition.label,
  }));
}

export async function syncLocaleRegistryToDatabase(prisma) {
  const db = await resolvePrismaClient(prisma);
  const localeRecords = getConfiguredLocaleRecords();

  for (const localeRecord of localeRecords) {
    await db.locale.upsert({
      where: { code: localeRecord.code },
      update: localeRecord,
      create: localeRecord,
    });
  }

  return localeRecords;
}
