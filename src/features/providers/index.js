/**
 * Feature services for NewsPub provider management snapshots and provider CRUD.
 */

import { createAuditEventRecord } from "@/lib/analytics";
import { getProviderRequestValidationIssues, sanitizeProviderFieldValues } from "@/lib/news/provider-definitions";
import { listNewsProviders, getProviderCredentialState } from "@/lib/news/providers";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";
/**
 * Returns the admin snapshot used by the NewsPub provider management screen.
 */

const providerSnapshotLimit = 200;

export async function getProviderManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const catalog = listNewsProviders();
  const [configs, totalCount, enabledCount] = await Promise.all([
    db.newsProviderConfig.findMany({
      orderBy: [{ is_default: "desc" }, { label: "asc" }],
      take: providerSnapshotLimit,
    }),
    db.newsProviderConfig.count(),
    db.newsProviderConfig.count({
      where: {
        is_enabled: true,
      },
    }),
  ]);
  const snapshotConfigs = configs.map((config) => ({
    ...config,
    credentialState: getProviderCredentialState(config.provider_key),
    request_defaults_json: config.request_defaults_json || {},
  }));

  return {
    configs: snapshotConfigs,
    summary: {
      configuredCredentialCount: catalog.filter((provider) => getProviderCredentialState(provider.key) === "configured")
        .length,
      defaultCount: snapshotConfigs.filter((config) => config.is_default).length,
      enabledCount,
      returnedCount: configs.length,
      savedDefaultsCount: snapshotConfigs.filter((config) => Object.keys(config.request_defaults_json || {}).length > 0).length,
      totalCount,
    },
    supportedProviders: catalog,
  };
}
/**
 * Creates or updates a NewsPub provider configuration record.
 */

export async function saveProviderRecord(input, { actor_id } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const provider_key = trimText(input.provider_key).toLowerCase();
  const label = trimText(input.label);
  const request_defaults_json = sanitizeProviderFieldValues(provider_key, input.request_defaults_json);

  if (!provider_key || !label) {
    throw new NewsPubError("Provider key and label are required.", {
      status: "provider_validation_failed",
      statusCode: 400,
    });
  }

  const validationIssues = getProviderRequestValidationIssues(provider_key, {
    providerDefaults: request_defaults_json,
  });

  if (validationIssues.length) {
    throw new NewsPubError(validationIssues[0].message, {
      status: "provider_validation_failed",
      statusCode: 400,
    });
  }

  const record = await db.newsProviderConfig.upsert({
    where: {
      provider_key,
    },
    update: {
      base_url: trimText(input.base_url) || null,
      description: trimText(input.description) || null,
      is_default: Boolean(input.is_default),
      is_enabled: input.is_enabled !== false,
      is_selectable: input.is_selectable !== false,
      label,
      request_defaults_json,
    },
    create: {
      base_url: trimText(input.base_url) || null,
      description: trimText(input.description) || null,
      is_default: Boolean(input.is_default),
      is_enabled: input.is_enabled !== false,
      is_selectable: input.is_selectable !== false,
      label,
      provider_key,
      request_defaults_json,
    },
  });

  if (record.is_default) {
    await db.newsProviderConfig.updateMany({
      data: {
        is_default: false,
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
      actor_id,
      entity_id: record.id,
      entity_type: "provider_config",
      payload_json: {
        is_default: record.is_default,
        is_enabled: record.is_enabled,
        provider_key: record.provider_key,
      },
    },
    db,
  );

  return record;
}
