/**
 * Destination management feature services for admin snapshots, Meta-aware
 * credential handling, and destination CRUD.
 */

import { createAuditEventRecord } from "@/lib/analytics";
import { env } from "@/lib/env/server";
import { META_AUTH_STRATEGIES } from "@/lib/news/meta-credentials";
import { isDestinationRuntimeReady, resolveDestinationRuntimeConnection } from "@/lib/news/destination-runtime";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";
import { decryptSecretValue, encryptSecretValue } from "@/lib/security/secrets";
import { getDestinationValidationIssues } from "@/lib/validation/configuration";
import {
  getDestinationSocialGuardrailOverrideFields,
  getDestinationSocialGuardrails,
  resolveMetaDiscoverySelection,
  buildDestinationSettingsPayload,
  usesDestinationCredentialOverrides,
} from "./meta-config";

const managedMetaCredentialSettingKeys = Object.freeze([
  "metaAuthStrategy",
  "metaCredentialSourceKey",
  "metaCredentialSourceLabel",
  "metaLastRefreshAttemptAt",
  "metaLastRefreshError",
  "metaTokenExpiresAt",
  "metaTokenLastValidatedAt",
]);

function createTokenHint(value) {
  const normalizedValue = trimText(value);

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(-4);
}

function normalizeSettings(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function pickManagedMetaCredentialSettings(...settingsValues) {
  return settingsValues.reduce((result, settingsValue) => {
    const settings = normalizeSettings(settingsValue);

    managedMetaCredentialSettingKeys.forEach((key) => {
      if (settings[key] !== undefined) {
        result[key] = settings[key];
      }
    });

    return result;
  }, {});
}

/**
 * Returns the destination-management snapshot consumed by the admin route.
 *
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Destination directory snapshot.
 */
export async function getDestinationManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const destinations = await db.destination.findMany({
    include: {
      articleMatches: {
        select: {
          id: true,
        },
      },
      publishAttempts: {
        select: {
          id: true,
        },
      },
      streams: {
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: [{ platform: "asc" }, { name: "asc" }],
  });

  return {
    destinations: destinations.map((destination) => {
      const runtimeConnection = resolveDestinationRuntimeConnection(destination);

      return {
        ...destination,
        effectiveSocialGuardrails: getDestinationSocialGuardrails(destination),
        effectiveConnectionStatus: runtimeConnection.effectiveConnectionStatus,
        hasRuntimeCredentials: runtimeConnection.hasRuntimeCredentials,
        socialGuardrailOverrides: getDestinationSocialGuardrailOverrideFields(destination),
        hasStoredToken: Boolean(destination.encryptedTokenCiphertext),
        articleMatchCount: destination.articleMatches.length,
        publishAttemptCount: destination.publishAttempts.length,
        streamCount: destination.streams.length,
        usesDestinationCredentialOverrides: usesDestinationCredentialOverrides(destination),
        usesRuntimeCredentials: runtimeConnection.usesEnvCredentials,
        validationIssues: getDestinationValidationIssues(destination),
        storedTokenPreview: destination.encryptedTokenCiphertext
          ? decryptSecretValue({
              ciphertext: destination.encryptedTokenCiphertext,
              iv: destination.encryptedTokenIv,
              tag: destination.encryptedTokenTag,
            })?.slice(0, 0) ?? true
          : false,
      };
    }),
    summary: {
      connectedCount: destinations.filter((destination) => isDestinationRuntimeReady(destination)).length,
      errorCount: destinations.filter((destination) => destination.connectionStatus === "ERROR").length,
      totalCount: destinations.length,
    },
  };
}

/**
 * Creates or updates one destination record, including stored token metadata
 * and any Meta discovery-derived settings.
 *
 * @param {object} input - Submitted destination data.
 * @param {object} [options] - Save options.
 * @param {string|null} [options.actorId] - Acting admin id.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Saved destination record.
 */
export async function saveDestinationRecord(input, { actorId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const slug = trimText(input.slug);
  const name = trimText(input.name);
  const platform = trimText(input.platform).toUpperCase();
  const kind = trimText(input.kind).toUpperCase();

  if (!slug || !name || !platform || !kind) {
    throw new NewsPubError("Destination name, slug, platform, and kind are required.", {
      status: "destination_validation_failed",
      statusCode: 400,
    });
  }

  const validationIssues = getDestinationValidationIssues({
    kind,
    platform,
  });

  if (validationIssues.length) {
    throw new NewsPubError(validationIssues[0].message, {
      status: "destination_validation_failed",
      statusCode: 400,
    });
  }

  const existingDestination = await db.destination.findUnique({
    where: {
      slug,
    },
    select: {
      settingsJson: true,
    },
  });

  const resolvedSelection = await resolveMetaDiscoverySelection({
    sourceKey: input.metaDiscoverySourceKey,
    targetId: input.metaDiscoveryTargetId,
    targetType: input.metaDiscoveryTargetType,
  });
  const inputSettingsJson =
    input.settingsJson && typeof input.settingsJson === "object" && !Array.isArray(input.settingsJson)
      ? input.settingsJson
      : {};
  const nextSettingsJson = buildDestinationSettingsPayload({
    advancedSettings: inputSettingsJson,
    graphApiBaseUrl: input.graphApiBaseUrl,
    instagramUserId: input.instagramUserId || resolvedSelection?.settingsJsonPatch?.instagramUserId,
    kind,
    pageId: input.pageId || resolvedSelection?.settingsJsonPatch?.pageId,
    profileId: input.profileId,
    socialGuardrails: input.socialGuardrails,
    useDestinationCredentialOverrides: inputSettingsJson.useDestinationCredentialOverrides === true,
  });
  const useDestinationCredentialOverrides = inputSettingsJson.useDestinationCredentialOverrides === true;
  const nextToken = trimText(input.token);
  const discoveredToken = !nextToken && !input.clearToken ? trimText(resolvedSelection?.accessToken) : "";
  const shouldPersistResolvedSelectionToken = useDestinationCredentialOverrides && Boolean(discoveredToken);
  const tokenToEncrypt = nextToken || (shouldPersistResolvedSelectionToken ? discoveredToken : "");
  const encryptedToken = tokenToEncrypt ? encryptSecretValue(tokenToEncrypt) : null;
  const nextExternalAccountId =
    trimText(input.externalAccountId) || trimText(resolvedSelection?.externalAccountId) || null;
  const nextAccountHandle =
    trimText(input.accountHandle) || trimText(resolvedSelection?.accountHandle) || null;
  const shouldPersistToken = Boolean(nextToken || shouldPersistResolvedSelectionToken || input.clearToken);
  const nextMetaAuthStrategy =
    platform === "FACEBOOK" && kind === "FACEBOOK_PAGE" && trimText(env.meta.systemUserAccessToken)
      ? META_AUTH_STRATEGIES.SYSTEM_USER
      : platform === "FACEBOOK" && kind === "FACEBOOK_PAGE" && trimText(resolvedSelection?.sourceKey || "")
        ? META_AUTH_STRATEGIES.REFRESHABLE_USER_DERIVED
        : tokenToEncrypt
          ? META_AUTH_STRATEGIES.LEGACY_STORED_TOKEN
          : pickManagedMetaCredentialSettings(existingDestination?.settingsJson, inputSettingsJson).metaAuthStrategy || null;
  const credentialMetadataSettings = {
    ...pickManagedMetaCredentialSettings(existingDestination?.settingsJson, inputSettingsJson),
    ...(resolvedSelection?.sourceKey
      ? {
          metaCredentialSourceKey: resolvedSelection.sourceKey,
          metaCredentialSourceLabel: resolvedSelection.sourceLabel || null,
        }
      : {}),
    ...(nextMetaAuthStrategy
      ? {
          metaAuthStrategy: nextMetaAuthStrategy,
        }
      : {}),
    metaLastRefreshError: null,
  };
  const nextSettingsJsonWithMetadata = {
    ...nextSettingsJson,
    ...credentialMetadataSettings,
  };
  const destination = await db.destination.upsert({
    where: {
      slug,
    },
    update: {
      accountHandle: nextAccountHandle,
      connectionError: trimText(input.connectionError) || null,
      connectionStatus: trimText(input.connectionStatus) || "DISCONNECTED",
      encryptedTokenCiphertext: shouldPersistToken ? encryptedToken?.ciphertext || null : undefined,
      encryptedTokenIv: shouldPersistToken ? encryptedToken?.iv || null : undefined,
      encryptedTokenTag: shouldPersistToken ? encryptedToken?.tag || null : undefined,
      externalAccountId: nextExternalAccountId,
      kind,
      lastConnectedAt:
        trimText(input.connectionStatus) === "CONNECTED" ? new Date() : input.lastConnectedAt || null,
      name,
      platform,
      settingsJson: nextSettingsJsonWithMetadata,
      tokenHint: tokenToEncrypt ? createTokenHint(tokenToEncrypt) : input.clearToken ? null : undefined,
    },
    create: {
      accountHandle: nextAccountHandle,
      connectionError: trimText(input.connectionError) || null,
      connectionStatus: trimText(input.connectionStatus) || "DISCONNECTED",
      encryptedTokenCiphertext: encryptedToken?.ciphertext || null,
      encryptedTokenIv: encryptedToken?.iv || null,
      encryptedTokenTag: encryptedToken?.tag || null,
      externalAccountId: nextExternalAccountId,
      kind,
      lastConnectedAt: trimText(input.connectionStatus) === "CONNECTED" ? new Date() : null,
      name,
      platform,
      settingsJson: nextSettingsJsonWithMetadata,
      slug,
      tokenHint: createTokenHint(tokenToEncrypt),
    },
  });

  await createAuditEventRecord(
    {
      action: "DESTINATION_SAVED",
      actorId,
      entityId: destination.id,
      entityType: "destination",
      payloadJson: {
        connectionStatus: destination.connectionStatus,
        kind: destination.kind,
        platform: destination.platform,
        socialGuardrailOverrides: getDestinationSocialGuardrailOverrideFields(destination),
        usesDestinationCredentialOverrides: usesDestinationCredentialOverrides(destination),
      },
    },
    db,
  );

  return destination;
}

/**
 * Deletes one destination record and records the audit event payload.
 *
 * @param {string} id - Destination id.
 * @param {object} [options] - Delete options.
 * @param {string|null} [options.actorId] - Acting admin id.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Deleted destination record.
 */
export async function deleteDestinationRecord(id, { actorId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const destination = await db.destination.findUnique({
    include: {
      articleMatches: {
        select: {
          id: true,
        },
      },
      publishAttempts: {
        select: {
          id: true,
        },
      },
      streams: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    where: {
      id,
    },
  });

  if (!destination) {
    throw new NewsPubError("Destination not found.", {
      status: "destination_not_found",
      statusCode: 404,
    });
  }

  const deletedDestination = await db.destination.delete({
    where: {
      id: destination.id,
    },
  });

  await createAuditEventRecord(
    {
      action: "DESTINATION_DELETED",
      actorId,
      entityId: deletedDestination.id,
      entityType: "destination",
      payloadJson: {
        kind: deletedDestination.kind,
        platform: deletedDestination.platform,
        slug: deletedDestination.slug,
      },
    },
    db,
  );

  return deletedDestination;
}
