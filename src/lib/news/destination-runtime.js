/**
 * Runtime credential resolution for NewsPub destinations, including Meta env fallbacks and publish readiness checks.
 */

import { env } from "@/lib/env/server";
import { META_AUTH_STRATEGIES } from "@/lib/news/meta-credentials";
import { trimText } from "@/lib/news/shared";
import { tryDecryptSecretValue } from "@/lib/security/secrets";

/**
 * Resolves NewsPub destination credentials into the runtime shape used by Meta publishers.
 *
 * Runtime strategy order:
 * 1. Meta system-user token for Facebook Page automation
 * 2. Refreshable Meta user-token source that can derive a fresh Page token
 * 3. Legacy stored destination token fallback
 */
function normalizeSettings(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function createStoredTokenDecryptionError() {
  return "Stored destination token could not be decrypted with the current encryption key. Clear the saved token or reconnect this destination.";
}

function readStoredDestinationToken(destination) {
  const ciphertext = destination?.encrypted_token_ciphertext;
  const iv = destination?.encrypted_token_iv;
  const tag = destination?.encrypted_token_tag;

  if (!ciphertext || !iv || !tag) {
    return {
      credentialError: null,
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
      credentialError: null,
      value: result.value,
    };
  }

  return {
    credentialError: createStoredTokenDecryptionError(),
    value: null,
  };
}

/** Builds the effective runtime connection details for one destination. */
export function resolveDestinationRuntimeConnection(destination = {}) {
  const settings = normalizeSettings(destination?.settings_json);
  const platform = trimText(destination?.platform).toUpperCase();
  const storedTokenState = readStoredDestinationToken(destination);
  const storedToken = storedTokenState.value;
  const storedAccessToken = trimText(storedToken) || null;
  const storedExternalAccountId = trimText(destination?.external_account_id) || null;
  const storedGraphApiBaseUrl = trimText(settings.graphApiBaseUrl) || null;
  const storedPageId = trimText(settings.pageId) || null;
  const storedProfileId = trimText(settings.profileId) || null;
  const storedInstagramUserId = trimText(settings.instagramUserId) || null;
  const envMetaUserAccessToken =
    ["FACEBOOK", "INSTAGRAM"].includes(platform) ? trimText(env.meta.userAccessToken) || null : null;
  const envMetaSystemUserAccessToken = platform === "FACEBOOK" ? trimText(env.meta.systemUserAccessToken) || null : null;
  const accountId = storedExternalAccountId || storedPageId || storedProfileId || storedInstagramUserId || null;
  const graphApiBaseUrl =
    storedGraphApiBaseUrl
    || trimText(env.meta.graphApiBaseUrl)
    || "https://graph.facebook.com/v25.0";
  const preferredMetaAuthStrategy =
    platform === "FACEBOOK" && envMetaSystemUserAccessToken
      ? META_AUTH_STRATEGIES.SYSTEM_USER
      : platform === "FACEBOOK" && envMetaUserAccessToken && accountId
        ? META_AUTH_STRATEGIES.REFRESHABLE_USER_DERIVED
        : storedAccessToken
          ? META_AUTH_STRATEGIES.LEGACY_STORED_TOKEN
          : null;
  const accessToken =
    preferredMetaAuthStrategy === META_AUTH_STRATEGIES.SYSTEM_USER
      ? envMetaSystemUserAccessToken
      : preferredMetaAuthStrategy === META_AUTH_STRATEGIES.LEGACY_STORED_TOKEN
        ? storedAccessToken
        : platform === "INSTAGRAM"
          ? storedAccessToken || envMetaUserAccessToken || null
          : null;
  const hasRuntimeCredentials =
    platform === "WEBSITE"
      ? true
      : platform === "FACEBOOK"
        ? Boolean(accountId && (envMetaSystemUserAccessToken || envMetaUserAccessToken || storedAccessToken))
        : Boolean(accessToken && accountId);
  const isReadyToPublish = platform === "WEBSITE" ? true : hasRuntimeCredentials;
  const effectiveConnectionStatus = isReadyToPublish
    ? "CONNECTED"
    : storedTokenState.credentialError
      ? "ERROR"
      : trimText(destination?.connection_status) || "DISCONNECTED";

  return {
    accessToken,
    accountId,
    credentialError: storedTokenState.credentialError,
    effectiveConnectionStatus,
    external_account_id: storedExternalAccountId,
    graphApiBaseUrl,
    hasRuntimeCredentials,
    hasCompleteEnvCredentials: Boolean((envMetaSystemUserAccessToken || envMetaUserAccessToken) && accountId),
    instagramUserId: storedInstagramUserId,
    isReadyToPublish,
    metaAuthStrategy: preferredMetaAuthStrategy,
    pageId: storedPageId,
    profileId: storedProfileId,
    usesDestinationCredentialOverrides: settings.useDestinationCredentialOverrides === true,
    usesEnvCredentials: Boolean((envMetaSystemUserAccessToken || envMetaUserAccessToken) && !storedAccessToken),
  };
}

/** Reports whether a destination has enough credential material to attempt publication. */
export function hasDestinationRuntimeCredentials(destination = {}) {
  return resolveDestinationRuntimeConnection(destination).hasRuntimeCredentials;
}

/** Reports whether a destination is currently ready for outbound publication. */
export function isDestinationRuntimeReady(destination = {}) {
  return resolveDestinationRuntimeConnection(destination).isReadyToPublish;
}
