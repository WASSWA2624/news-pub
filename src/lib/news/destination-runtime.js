import { env } from "@/lib/env/server";
import { trimText } from "@/lib/news/shared";
import { decryptSecretValue } from "@/lib/security/secrets";

/**
 * Resolves NewsPub destination credentials into the runtime shape used by Meta publishers.
 *
 * Stored destination credentials are preferred when present. When they are not
 * available, NewsPub can fall back to the env-backed Meta user access token so
 * localhost and lightly configured installs can still attempt publication.
 */
function normalizeSettings(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function decryptDestinationToken(destination) {
  const ciphertext = destination?.encryptedTokenCiphertext;
  const iv = destination?.encryptedTokenIv;
  const tag = destination?.encryptedTokenTag;

  if (!ciphertext || !iv || !tag) {
    return null;
  }

  try {
    return decryptSecretValue({
      ciphertext,
      iv,
      tag,
    });
  } catch {
    return null;
  }
}

/** Builds the effective runtime connection details for one destination. */
export function resolveDestinationRuntimeConnection(destination = {}) {
  const settings = normalizeSettings(destination?.settingsJson);
  const platform = trimText(destination?.platform).toUpperCase();
  const storedToken = decryptDestinationToken(destination);
  const storedAccessToken = trimText(storedToken) || null;
  const storedExternalAccountId = trimText(destination?.externalAccountId) || null;
  const storedGraphApiBaseUrl = trimText(settings.graphApiBaseUrl) || null;
  const storedPageId = trimText(settings.pageId) || null;
  const storedProfileId = trimText(settings.profileId) || null;
  const storedInstagramUserId = trimText(settings.instagramUserId) || null;
  const envMetaAccessToken =
    ["FACEBOOK", "INSTAGRAM"].includes(platform) ? trimText(env.meta.userAccessToken) || null : null;
  const accessToken = storedAccessToken || envMetaAccessToken || null;
  const accountId = storedExternalAccountId || storedPageId || storedProfileId || storedInstagramUserId || null;
  const graphApiBaseUrl =
    storedGraphApiBaseUrl
    || trimText(env.meta.graphApiBaseUrl)
    || "https://graph.facebook.com/v25.0";
  const hasRuntimeCredentials =
    platform === "WEBSITE" ? true : Boolean(accessToken && accountId);
  const isReadyToPublish = platform === "WEBSITE" ? true : hasRuntimeCredentials;
  const effectiveConnectionStatus = isReadyToPublish
    ? "CONNECTED"
    : trimText(destination?.connectionStatus) || "DISCONNECTED";

  return {
    accessToken,
    accountId,
    effectiveConnectionStatus,
    externalAccountId: storedExternalAccountId,
    graphApiBaseUrl,
    hasRuntimeCredentials,
    hasCompleteEnvCredentials: Boolean(envMetaAccessToken && accountId),
    instagramUserId: storedInstagramUserId,
    isReadyToPublish,
    pageId: storedPageId,
    profileId: storedProfileId,
    usesDestinationCredentialOverrides: settings.useDestinationCredentialOverrides === true,
    usesEnvCredentials: Boolean(envMetaAccessToken && !storedAccessToken),
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
