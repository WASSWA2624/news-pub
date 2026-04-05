import crypto from "node:crypto";

import { z } from "zod";

import {
  getAiProviderByValue,
  getAiProviderLabel,
  getProviderApiKeyEnvName,
  supportedAiProviderValues,
} from "@/lib/ai/provider-registry";
import { env } from "@/lib/env/server";

const PROVIDER_SECRET_ALGORITHM = "aes-256-gcm";
const PROVIDER_SECRET_IV_BYTES = 12;
const PROVIDER_SECRET_VERSION = "enc.v1";

export const providerConfigPurposeValues = Object.freeze([
  "draft_generation",
  "draft_generation_fallback",
]);

export class ProviderConfigurationError extends Error {
  constructor(
    message,
    { details = null, status = "provider_configuration_error", statusCode = 500 } = {},
  ) {
    super(message);
    this.name = "ProviderConfigurationError";
    this.details = details;
    this.status = status;
    this.statusCode = statusCode;
  }
}

function collapseWhitespace(value) {
  return `${value || ""}`.trim().replace(/\s+/g, " ");
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

function getProviderConfigSecret(secret = env.ai.providerConfigSecret) {
  const normalizedSecret = collapseWhitespace(secret);

  if (!normalizedSecret) {
    throw new ProviderConfigurationError(
      "A provider configuration secret is required to encrypt stored API keys.",
      {
        status: "provider_secret_missing",
        statusCode: 500,
      },
    );
  }

  return normalizedSecret;
}

function deriveProviderConfigEncryptionKey(secret = env.ai.providerConfigSecret) {
  return crypto
    .createHash("sha256")
    .update(`provider-config:${getProviderConfigSecret(secret)}`)
    .digest();
}

function getApiKeyLast4(apiKey) {
  const normalizedApiKey = collapseWhitespace(apiKey);

  if (!normalizedApiKey) {
    return null;
  }

  return normalizedApiKey.slice(-4);
}

function getProviderEnvApiKey(provider) {
  const envName = getProviderApiKeyEnvName(provider);

  if (!envName) {
    return null;
  }

  return collapseWhitespace(process.env[envName]) || null;
}

export function encryptProviderApiKey(apiKey, secret = env.ai.providerConfigSecret) {
  const normalizedApiKey = collapseWhitespace(apiKey);

  if (!normalizedApiKey) {
    return null;
  }

  const iv = crypto.randomBytes(PROVIDER_SECRET_IV_BYTES);
  const cipher = crypto.createCipheriv(
    PROVIDER_SECRET_ALGORITHM,
    deriveProviderConfigEncryptionKey(secret),
    iv,
  );
  const encryptedPayload = Buffer.concat([
    cipher.update(normalizedApiKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    PROVIDER_SECRET_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encryptedPayload.toString("base64url"),
  ].join(".");
}

export function decryptProviderApiKey(encryptedApiKey, secret = env.ai.providerConfigSecret) {
  const normalizedPayload = collapseWhitespace(encryptedApiKey);

  if (!normalizedPayload) {
    return null;
  }

  const payloadSegments = normalizedPayload.split(".");
  const version = payloadSegments.slice(0, 2).join(".");
  const [encodedIv, encodedAuthTag, encodedPayload] = payloadSegments.slice(2);

  if (version !== PROVIDER_SECRET_VERSION || !encodedIv || !encodedAuthTag || !encodedPayload) {
    throw new ProviderConfigurationError("Stored provider credentials could not be decrypted.", {
      status: "provider_secret_invalid",
      statusCode: 500,
    });
  }

  try {
    const decipher = crypto.createDecipheriv(
      PROVIDER_SECRET_ALGORITHM,
      deriveProviderConfigEncryptionKey(secret),
      Buffer.from(encodedIv, "base64url"),
    );

    decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64url"));

    const decryptedPayload = Buffer.concat([
      decipher.update(Buffer.from(encodedPayload, "base64url")),
      decipher.final(),
    ]).toString("utf8");

    return collapseWhitespace(decryptedPayload) || null;
  } catch {
    throw new ProviderConfigurationError("Stored provider credentials could not be decrypted.", {
      status: "provider_secret_invalid",
      statusCode: 500,
    });
  }
}

function buildCredentialSnapshot(config) {
  if (config.apiKeyEncrypted) {
    return {
      credentialLabel: config.apiKeyLast4
        ? `Stored key ending in ${config.apiKeyLast4}`
        : "Stored key available",
      credentialSourceEnvName: null,
      credentialState: "stored",
      hasStoredApiKey: true,
      hasUsableCredential: true,
    };
  }

  return {
    credentialLabel: "No stored key is configured for this provider config",
    credentialSourceEnvName: config.apiKeyEnvName || getProviderApiKeyEnvName(config.provider),
    credentialState: "missing",
    hasStoredApiKey: false,
    hasUsableCredential: false,
  };
}

export function formatProviderConfigLabel(providerConfig) {
  if (!providerConfig) {
    return "";
  }

  return `${getAiProviderLabel(providerConfig.provider)} / ${providerConfig.model}`;
}

export function createProviderConfigSummary(config) {
  const credentialSnapshot = buildCredentialSnapshot(config);
  const providerMetadata = getAiProviderByValue(config.provider);

  return {
    apiKeyLast4: config.apiKeyLast4 || null,
    apiKeyUpdatedAt: serializeDate(config.apiKeyUpdatedAt),
    catalogSourceLabel: providerMetadata?.catalogSourceLabel || null,
    credentialLabel: credentialSnapshot.credentialLabel,
    credentialSourceEnvName: credentialSnapshot.credentialSourceEnvName,
    credentialState: credentialSnapshot.credentialState,
    hasStoredApiKey: credentialSnapshot.hasStoredApiKey,
    hasUsableCredential: credentialSnapshot.hasUsableCredential,
    id: config.id,
    isDefault: Boolean(config.isDefault),
    isEnabled: Boolean(config.isEnabled),
    model: config.model,
    provider: config.provider,
    providerDocsUrl: providerMetadata?.docsUrl || null,
    providerLabel: providerMetadata?.label || getAiProviderLabel(config.provider),
    purpose: config.purpose,
    updatedAt: serializeDate(config.updatedAt),
  };
}

function createProviderConfigurationSummary(configs) {
  const configSummaries = configs.map(createProviderConfigSummary);

  return {
    configCount: configSummaries.length,
    enabledCount: configSummaries.filter((config) => config.isEnabled).length,
    environmentFallbackCount: configSummaries.filter(
      (config) => config.credentialState === "environment",
    ).length,
    fallbackReady: configSummaries.some(
      (config) =>
        config.isEnabled &&
        config.purpose === "draft_generation_fallback" &&
        config.hasUsableCredential,
    ),
    missingCredentialCount: configSummaries.filter(
      (config) => config.isEnabled && !config.hasUsableCredential,
    ).length,
    storedCredentialCount: configSummaries.filter((config) => config.hasStoredApiKey).length,
  };
}

function buildProviderConfigSelect() {
  return {
    apiKeyEncrypted: true,
    apiKeyEnvName: true,
    apiKeyLast4: true,
    apiKeyUpdatedAt: true,
    id: true,
    isDefault: true,
    isEnabled: true,
    model: true,
    provider: true,
    purpose: true,
    updatedAt: true,
  };
}

export async function getProviderConfigurationSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const configs = await db.modelProviderConfig.findMany({
    orderBy: [
      { isDefault: "desc" },
      { purpose: "asc" },
      { provider: "asc" },
      { model: "asc" },
      { updatedAt: "desc" },
    ],
    select: buildProviderConfigSelect(),
  });

  return {
    configs: configs.map(createProviderConfigSummary),
    summary: createProviderConfigurationSummary(configs),
  };
}

const nullableIdSchema = z
  .string()
  .trim()
  .min(1)
  .optional()
  .nullable()
  .transform((value) => value || undefined);

const optionalApiKeySchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const providerConfigInputSchema = z
  .object({
    apiKey: optionalApiKeySchema,
    clearApiKey: z.boolean().default(false),
    id: nullableIdSchema,
    isDefault: z.boolean(),
    isEnabled: z.boolean(),
    model: z.string().trim().min(1).max(128),
    provider: z.enum(supportedAiProviderValues),
    purpose: z.enum(providerConfigPurposeValues),
  })
  .strict();

export const saveProviderConfigurationsSchema = z
  .object({
    configs: z.array(providerConfigInputSchema).min(1),
  })
  .superRefine((input, context) => {
    const defaultConfigs = input.configs.filter((config) => config.isDefault);
    const enabledFallbackConfigs = input.configs.filter(
      (config) => config.isEnabled && config.purpose === "draft_generation_fallback",
    );
    const compositeKeys = new Set();

    if (defaultConfigs.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["configs"],
        message: "Exactly one enabled primary generation config must be marked as default.",
      });
    }

    if (defaultConfigs[0] && !defaultConfigs[0].isEnabled) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["configs"],
        message: "The default generation config must stay enabled.",
      });
    }

    if (defaultConfigs[0] && defaultConfigs[0].purpose !== "draft_generation") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["configs"],
        message: "The default generation config must use the primary generation purpose.",
      });
    }

    if (enabledFallbackConfigs.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["configs"],
        message: "Exactly one enabled fallback generation config is required.",
      });
    }

    input.configs.forEach((config, index) => {
      const compositeKey = [
        config.provider,
        collapseWhitespace(config.model).toLowerCase(),
        config.purpose,
      ].join(":");

      if (compositeKeys.has(compositeKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["configs", index, "model"],
          message: "Provider, model, and purpose combinations must be unique.",
        });
      } else {
        compositeKeys.add(compositeKey);
      }

      if (config.apiKey && config.clearApiKey) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["configs", index, "apiKey"],
          message: "Choose either a replacement API key or clear the stored key, not both.",
        });
      }
    });
  });

function sanitizeAuditConfigs(configs) {
  return configs.map((config) => ({
    credentialAction: config.apiKey
      ? "replace"
      : config.clearApiKey
        ? "clear"
        : "keep",
    id: config.id || null,
    isDefault: config.isDefault,
    isEnabled: config.isEnabled,
    model: config.model,
    provider: config.provider,
    purpose: config.purpose,
  }));
}

function buildProviderConfigWriteData(inputConfig, existingConfig) {
  const nextData = {
    apiKeyEnvName: getProviderApiKeyEnvName(inputConfig.provider),
    isDefault: inputConfig.isDefault,
    isEnabled: inputConfig.isEnabled,
    model: collapseWhitespace(inputConfig.model),
    provider: inputConfig.provider,
    purpose: inputConfig.purpose,
  };

  if (inputConfig.clearApiKey) {
    return {
      ...nextData,
      apiKeyEncrypted: null,
      apiKeyLast4: null,
      apiKeyUpdatedAt: null,
    };
  }

  if (inputConfig.apiKey) {
    return {
      ...nextData,
      apiKeyEncrypted: encryptProviderApiKey(inputConfig.apiKey),
      apiKeyLast4: getApiKeyLast4(inputConfig.apiKey),
      apiKeyUpdatedAt: new Date(),
    };
  }

  if (existingConfig) {
    return {
      ...nextData,
      apiKeyEncrypted: existingConfig.apiKeyEncrypted || null,
      apiKeyLast4: existingConfig.apiKeyLast4 || null,
      apiKeyUpdatedAt: existingConfig.apiKeyUpdatedAt || null,
    };
  }

  return {
    ...nextData,
    apiKeyEncrypted: null,
    apiKeyLast4: null,
    apiKeyUpdatedAt: null,
  };
}

export async function saveProviderConfigurations(input, options = {}, prisma) {
  const parsedInput = saveProviderConfigurationsSchema.parse(input);
  const db = await resolvePrismaClient(prisma);
  const existingIds = parsedInput.configs
    .map((config) => config.id)
    .filter(Boolean);

  await db.$transaction(async (tx) => {
    const existingConfigs = existingIds.length
      ? await tx.modelProviderConfig.findMany({
          select: {
            apiKeyEncrypted: true,
            apiKeyLast4: true,
            apiKeyUpdatedAt: true,
            id: true,
          },
          where: {
            id: {
              in: existingIds,
            },
          },
        })
      : [];
    const existingConfigMap = new Map(existingConfigs.map((config) => [config.id, config]));

    if (existingConfigMap.size !== existingIds.length) {
      const missingConfigId = existingIds.find((configId) => !existingConfigMap.has(configId));

      throw new ProviderConfigurationError(
        `Provider configuration "${missingConfigId}" is no longer available.`,
        {
          status: "provider_config_not_found",
          statusCode: 404,
        },
      );
    }

    await tx.modelProviderConfig.updateMany({
      data: {
        isDefault: false,
      },
    });

    for (const inputConfig of parsedInput.configs) {
      const existingConfig = inputConfig.id ? existingConfigMap.get(inputConfig.id) || null : null;
      const writeData = buildProviderConfigWriteData(inputConfig, existingConfig);

      if (inputConfig.id) {
        await tx.modelProviderConfig.update({
          data: writeData,
          where: {
            id: inputConfig.id,
          },
        });
      } else {
        await tx.modelProviderConfig.create({
          data: writeData,
        });
      }
    }

    if (options.actorId) {
      await tx.auditEvent.create({
        data: {
          action: "PROVIDER_CONFIG_UPDATED",
          actorId: options.actorId,
          entityId: "provider_configuration_collection",
          entityType: "provider_config",
          payloadJson: {
            configs: sanitizeAuditConfigs(parsedInput.configs),
          },
        },
      });
    }
  });

  return {
    snapshot: await getProviderConfigurationSnapshot(db),
  };
}

export function resolveProviderApiKey(providerConfig) {
  if (!providerConfig) {
    return {
      apiKey: null,
      envName: null,
      source: "missing",
    };
  }

  const decryptedApiKey = providerConfig.apiKeyEncrypted
    ? decryptProviderApiKey(providerConfig.apiKeyEncrypted)
    : null;

  if (decryptedApiKey) {
    return {
      apiKey: decryptedApiKey,
      envName: providerConfig.apiKeyEnvName || getProviderApiKeyEnvName(providerConfig.provider),
      source: "stored",
    };
  }

  return {
    apiKey: null,
    envName: providerConfig.apiKeyEnvName || getProviderApiKeyEnvName(providerConfig.provider),
    source: "missing",
  };
}

export async function getProviderConfigById(providerConfigId, prisma) {
  const db = await resolvePrismaClient(prisma);

  return db.modelProviderConfig.findUnique({
    select: buildProviderConfigSelect(),
    where: {
      id: providerConfigId,
    },
  });
}

export async function findFallbackProviderConfig(prisma, excludeId = null) {
  const db = await resolvePrismaClient(prisma);

  if (typeof db.modelProviderConfig?.findFirst !== "function") {
    return null;
  }

  return db.modelProviderConfig.findFirst({
    orderBy: [{ updatedAt: "desc" }, { model: "asc" }],
    select: buildProviderConfigSelect(),
    where: {
      id: excludeId
        ? {
            not: excludeId,
          }
        : undefined,
      isEnabled: true,
      purpose: "draft_generation_fallback",
    },
  });
}

export function createProviderConfigurationErrorPayload(error) {
  if (error instanceof ProviderConfigurationError) {
    return {
      body: {
        details: error.details || undefined,
        message: error.message,
        status: error.status,
        success: false,
      },
      statusCode: error.statusCode,
    };
  }

  console.error(error);

  return {
    body: {
      message: "An unexpected provider configuration error occurred.",
      status: "internal_error",
      success: false,
    },
    statusCode: 500,
  };
}
