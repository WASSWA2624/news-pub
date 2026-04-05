import { createAuditEventRecord } from "@/lib/analytics";
import { listNewsProviders, getProviderCredentialState } from "@/lib/news/providers";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";

export async function getProviderManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const catalog = listNewsProviders();
  const configs = await db.newsProviderConfig.findMany({
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });

  return {
    configs: configs.map((config) => ({
      ...config,
      credentialState: getProviderCredentialState(config.providerKey),
      requestDefaultsJson: config.requestDefaultsJson || {},
    })),
    summary: {
      configuredCredentialCount: catalog.filter((provider) => getProviderCredentialState(provider.key) === "configured")
        .length,
      enabledCount: configs.filter((config) => config.isEnabled).length,
      totalCount: configs.length,
    },
    supportedProviders: catalog,
  };
}

export async function saveProviderRecord(input, { actorId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const providerKey = trimText(input.providerKey).toLowerCase();
  const label = trimText(input.label);

  if (!providerKey || !label) {
    throw new NewsPubError("Provider key and label are required.", {
      status: "provider_validation_failed",
      statusCode: 400,
    });
  }

  const record = await db.newsProviderConfig.upsert({
    where: {
      providerKey,
    },
    update: {
      baseUrl: trimText(input.baseUrl) || null,
      description: trimText(input.description) || null,
      isDefault: Boolean(input.isDefault),
      isEnabled: input.isEnabled !== false,
      isSelectable: input.isSelectable !== false,
      label,
      requestDefaultsJson: input.requestDefaultsJson || {},
    },
    create: {
      baseUrl: trimText(input.baseUrl) || null,
      description: trimText(input.description) || null,
      isDefault: Boolean(input.isDefault),
      isEnabled: input.isEnabled !== false,
      isSelectable: input.isSelectable !== false,
      label,
      providerKey,
      requestDefaultsJson: input.requestDefaultsJson || {},
    },
  });

  if (record.isDefault) {
    await db.newsProviderConfig.updateMany({
      data: {
        isDefault: false,
      },
      where: {
        id: {
          not: record.id,
        },
      },
    });
  }

  await createAuditEventRecord(
    {
      action: "PROVIDER_CONFIG_SAVED",
      actorId,
      entityId: record.id,
      entityType: "provider_config",
      payloadJson: {
        isDefault: record.isDefault,
        isEnabled: record.isEnabled,
        providerKey: record.providerKey,
      },
    },
    db,
  );

  return record;
}
