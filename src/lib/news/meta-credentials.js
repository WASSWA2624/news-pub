/**
 * Meta credential resolution helpers for NewsPub Facebook publishing and credential refresh metadata.
 */

import { env } from "@/lib/env/server";
import {
  buildCredentialSourceKey,
  discoverAssetsFromSource,
  getMetaCredentialSourceByKey,
  getMetaGraphRequestBaseUrl,
} from "@/features/destinations/meta-config";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";
import { tryDecryptSecretValue } from "@/lib/security/secrets";

const defaultGraphApiBaseUrl = "https://graph.facebook.com/v25.0";

export const META_AUTH_STRATEGIES = Object.freeze({
  LEGACY_STORED_TOKEN: "legacy-stored-token-fallback",
  REFRESHABLE_USER_DERIVED: "refreshable-user-derived",
  SYSTEM_USER: "system-user",
});

function normalizeSettings(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function createStoredTokenDecryptionError() {
  return new NewsPubError(
    "The stored destination token could not be decrypted with the current encryption key. Clear it and reconnect the destination or configure Meta env credentials.",
    {
      status: "destination_token_reconnect_required",
      statusCode: 400,
    },
  );
}

function readStoredDestinationToken(destination) {
  const ciphertext = destination?.encrypted_token_ciphertext;
  const iv = destination?.encrypted_token_iv;
  const tag = destination?.encrypted_token_tag;

  if (!ciphertext || !iv || !tag) {
    return {
      error: null,
      value: null,
    };
  }

  const result = tryDecryptSecretValue({
    ciphertext,
    iv,
    tag,
  });

  if (!result.error) {
    return {
      error: null,
      value: result.value,
    };
  }

  return {
    error: createStoredTokenDecryptionError(),
    value: null,
  };
}

function getDestinationGraphApiBaseUrl(destination) {
  const settings = normalizeSettings(destination?.settings_json);

  return trimText(settings.graphApiBaseUrl) || trimText(env.meta.graphApiBaseUrl) || defaultGraphApiBaseUrl;
}

function getFacebookAccountId(destination) {
  const settings = normalizeSettings(destination?.settings_json);

  return (
    trimText(settings.pageId)
    || trimText(destination?.external_account_id)
    || null
  );
}

function getMetaCredentialSourceKey(destination) {
  const settings = normalizeSettings(destination?.settings_json);

  return trimText(settings.metaCredentialSourceKey) || buildCredentialSourceKey("meta-user-access-token");
}

function getMetaCredentialMetadataPatch(currentSettings, nextMetadata = {}) {
  return {
    ...currentSettings,
    metaAuthStrategy: nextMetadata.metaAuthStrategy || currentSettings.metaAuthStrategy || null,
    metaCredentialSourceKey:
      nextMetadata.metaCredentialSourceKey !== undefined
        ? nextMetadata.metaCredentialSourceKey
        : currentSettings.metaCredentialSourceKey || null,
    metaCredentialSourceLabel:
      nextMetadata.metaCredentialSourceLabel !== undefined
        ? nextMetadata.metaCredentialSourceLabel
        : currentSettings.metaCredentialSourceLabel || null,
    metaLastRefreshAttemptAt:
      nextMetadata.metaLastRefreshAttemptAt !== undefined
        ? nextMetadata.metaLastRefreshAttemptAt
        : currentSettings.metaLastRefreshAttemptAt || null,
    metaLastRefreshError:
      nextMetadata.metaLastRefreshError !== undefined
        ? nextMetadata.metaLastRefreshError
        : currentSettings.metaLastRefreshError || null,
    metaTokenExpiresAt:
      nextMetadata.metaTokenExpiresAt !== undefined
        ? nextMetadata.metaTokenExpiresAt
        : currentSettings.metaTokenExpiresAt || null,
    metaTokenLastValidatedAt:
      nextMetadata.metaTokenLastValidatedAt !== undefined
        ? nextMetadata.metaTokenLastValidatedAt
        : currentSettings.metaTokenLastValidatedAt || null,
  };
}

function buildResolvedCredential({
  accessToken,
  accountId,
  destination,
  metaAuthStrategy,
  metaCredentialSourceKey = null,
  metaCredentialSourceLabel = null,
}) {
  return {
    accessToken,
    accountId,
    graphApiBaseUrl: getDestinationGraphApiBaseUrl(destination),
    metaAuthStrategy,
    metaCredentialSourceKey,
    metaCredentialSourceLabel,
    metaLastRefreshError: null,
    metaTokenExpiresAt: null,
    metaTokenLastValidatedAt: new Date().toISOString(),
  };
}

function createMissingAccountError() {
  return new NewsPubError("Facebook page destinations require a page ID or external account ID.", {
    status: "destination_account_missing",
    statusCode: 400,
  });
}

function createMisconfiguredMetaEnvError() {
  return new NewsPubError(
    "Facebook publishing requires META_SYSTEM_USER_ACCESS_TOKEN, META_USER_ACCESS_TOKEN, or an explicit destination token override.",
    {
      status: "destination_meta_env_missing",
      statusCode: 400,
    },
  );
}

/**
 * Returns whether a Meta API failure is the token-expired condition that should trigger credential refresh handling.
 */
export function isMetaTokenExpiredError(error) {
  const responseError = error?.response_json?.error || error?.response_json || {};

  return Number(responseError?.code) === 190;
}

/**
 * Persists refreshed Meta credential metadata back onto the destination record when possible.
 */
export async function persistResolvedMetaCredential(destination, metadata = {}, prisma) {
  const currentSettings = normalizeSettings(destination?.settings_json);
  const nextSettingsJson = getMetaCredentialMetadataPatch(currentSettings, metadata);

  if (!destination?.id || !prisma?.destination?.update) {
    return nextSettingsJson;
  }

  await prisma.destination.update({
    where: {
      id: destination.id,
    },
    data: {
      settings_json: nextSettingsJson,
    },
  });

  destination.settings_json = nextSettingsJson;

  return nextSettingsJson;
}

async function resolveFacebookPageCredentialFromUserSource(destination, source, prisma, { markRefreshAttempt = false } = {}) {
  const accountId = getFacebookAccountId(destination);

  if (!accountId) {
    throw createMissingAccountError();
  }

  const discoveredAssets = await discoverAssetsFromSource(source);
  const pageRecord = discoveredAssets.pages.find((page) => page.id === accountId);

  if (!pageRecord?.accessToken) {
    throw new NewsPubError(
      "The selected Facebook page is no longer available from the configured Meta credential source. Refresh connected assets or verify Page permissions.",
      {
        status: "destination_page_permission_missing",
        statusCode: 400,
      },
    );
  }

  const resolvedCredential = buildResolvedCredential({
    accessToken: pageRecord.accessToken,
    accountId,
    destination,
    metaAuthStrategy: META_AUTH_STRATEGIES.REFRESHABLE_USER_DERIVED,
    metaCredentialSourceKey: source.sourceKey,
    metaCredentialSourceLabel: source.sourceLabel,
  });

  await persistResolvedMetaCredential(
    destination,
    {
      ...resolvedCredential,
      metaLastRefreshAttemptAt: markRefreshAttempt ? new Date().toISOString() : undefined,
      metaLastRefreshError: null,
    },
    prisma,
  );

  return resolvedCredential;
}

/**
 * Resolves the credential NewsPub should use for the next Facebook publish attempt.
 */
export async function resolveFacebookPublishCredential(destination, prismaArg) {
  const prisma = prismaArg ? await resolvePrismaClient(prismaArg) : null;
  const accountId = getFacebookAccountId(destination);

  if (!accountId) {
    throw createMissingAccountError();
  }

  const systemUserAccessToken = trimText(env.meta.systemUserAccessToken);

  if (systemUserAccessToken) {
    const resolvedCredential = buildResolvedCredential({
      accessToken: systemUserAccessToken,
      accountId,
      destination,
      metaAuthStrategy: META_AUTH_STRATEGIES.SYSTEM_USER,
      metaCredentialSourceKey: buildCredentialSourceKey("meta-system-user-access-token"),
      metaCredentialSourceLabel: "META_SYSTEM_USER_ACCESS_TOKEN",
    });

    await persistResolvedMetaCredential(destination, resolvedCredential, prisma);

    return resolvedCredential;
  }

  const source = getMetaCredentialSourceByKey(getMetaCredentialSourceKey(destination));

  if (source?.sourceType === "env") {
    return resolveFacebookPageCredentialFromUserSource(destination, source, prisma);
  }

  const storedTokenState = readStoredDestinationToken(destination);
  const storedAccessToken = trimText(storedTokenState.value);

  if (storedAccessToken) {
    const resolvedCredential = buildResolvedCredential({
      accessToken: storedAccessToken,
      accountId,
      destination,
      metaAuthStrategy: META_AUTH_STRATEGIES.LEGACY_STORED_TOKEN,
      metaCredentialSourceKey: null,
      metaCredentialSourceLabel: null,
    });

    await persistResolvedMetaCredential(destination, resolvedCredential, prisma);

    return resolvedCredential;
  }

  if (storedTokenState.error) {
    throw storedTokenState.error;
  }

  throw createMisconfiguredMetaEnvError();
}

/**
 * Refreshes the Facebook publish credential after a token-expired failure or explicit retry.
 */
export async function refreshFacebookPublishCredential(destination, prismaArg) {
  const prisma = prismaArg ? await resolvePrismaClient(prismaArg) : null;
  const systemUserAccessToken = trimText(env.meta.systemUserAccessToken);
  const source = getMetaCredentialSourceByKey(getMetaCredentialSourceKey(destination));

  try {
    if (systemUserAccessToken) {
      const resolvedCredential = buildResolvedCredential({
        accessToken: systemUserAccessToken,
        accountId: getFacebookAccountId(destination),
        destination,
        metaAuthStrategy: META_AUTH_STRATEGIES.SYSTEM_USER,
        metaCredentialSourceKey: buildCredentialSourceKey("meta-system-user-access-token"),
        metaCredentialSourceLabel: "META_SYSTEM_USER_ACCESS_TOKEN",
      });

      await persistResolvedMetaCredential(
        destination,
        {
          ...resolvedCredential,
          metaLastRefreshAttemptAt: new Date().toISOString(),
          metaLastRefreshError: null,
        },
        prisma,
      );

      return resolvedCredential;
    }

    if (source?.sourceType === "env") {
      return resolveFacebookPageCredentialFromUserSource(destination, source, prisma, {
        markRefreshAttempt: true,
      });
    }
  } catch (error) {
    await persistResolvedMetaCredential(
      destination,
      {
        metaLastRefreshAttemptAt: new Date().toISOString(),
        metaLastRefreshError: trimText(error?.message) || "Meta credential refresh failed.",
      },
      prisma,
    );

    throw error;
  }

  throw new NewsPubError(
    "No refreshable Meta credential source is configured for this Facebook destination. Reconnect the destination or configure Meta env credentials.",
    {
      status: "destination_token_expired_reconnect_required",
      statusCode: 400,
    },
  );
}
