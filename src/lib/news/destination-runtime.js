import crypto from "node:crypto";

import { env } from "@/lib/env/server";
import { trimText } from "@/lib/news/shared";
import { decryptSecretValue } from "@/lib/security/secrets";

/**
 * Resolves NewsPub destination credentials into the runtime shape used by Meta publishers.
 *
 * Env-backed credentials override stored values so operators can rotate access
 * without editing the dashboard, while persisted connection state still gates
 * whether stored tokens are considered publish-ready.
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

/** Returns any env-backed credential override configured for the destination slug. */
export function getMetaDestinationEnvCredential(destination = {}) {
  if (!destination?.slug || !["FACEBOOK", "INSTAGRAM"].includes(destination?.platform)) {
    return null;
  }

  const credential = env.meta.destinationCredentials?.[destination.slug];

  return credential && typeof credential === "object" && !Array.isArray(credential) ? credential : null;
}

/** Builds the effective runtime connection details for one destination. */
export function resolveDestinationRuntimeConnection(destination = {}) {
  const envCredential = getMetaDestinationEnvCredential(destination) || {};
  const settings = normalizeSettings(destination?.settingsJson);
  const storedToken = decryptDestinationToken(destination);
  const envAccessToken = trimText(envCredential.accessToken) || null;
  const storedAccessToken = trimText(storedToken) || null;
  const envExternalAccountId = trimText(envCredential.externalAccountId) || null;
  const envPageId = trimText(envCredential.pageId) || null;
  const envProfileId = trimText(envCredential.profileId) || null;
  const envInstagramUserId = trimText(envCredential.instagramUserId) || null;
  const storedExternalAccountId = trimText(destination?.externalAccountId) || null;
  const storedPageId = trimText(settings.pageId) || null;
  const storedProfileId = trimText(settings.profileId) || null;
  const storedInstagramUserId = trimText(settings.instagramUserId) || null;
  const accessToken = envAccessToken || storedAccessToken || null;
  const envAccountId =
    envExternalAccountId || envPageId || envProfileId || envInstagramUserId || null;
  const storedAccountId =
    storedExternalAccountId || storedPageId || storedProfileId || storedInstagramUserId || null;
  const accountId = envAccountId || storedAccountId || null;
  const graphApiBaseUrl =
    trimText(envCredential.graphApiBaseUrl)
    || trimText(settings.graphApiBaseUrl)
    || trimText(env.meta.graphApiBaseUrl)
    || "https://graph.facebook.com/v22.0";
  const usesEnvCredentials = Boolean(
    envAccessToken || envExternalAccountId || envPageId || envProfileId || envInstagramUserId,
  );
  const hasCompleteEnvCredentials = Boolean(envAccessToken && envAccountId);
  const hasRuntimeCredentials =
    destination?.platform === "WEBSITE" ? true : Boolean(accessToken && accountId);
  const isReadyToPublish =
    destination?.platform === "WEBSITE"
      ? true
      : hasCompleteEnvCredentials
        ? hasRuntimeCredentials
        : hasRuntimeCredentials && trimText(destination?.connectionStatus) === "CONNECTED";
  const effectiveConnectionStatus = isReadyToPublish
    ? "CONNECTED"
    : trimText(destination?.connectionStatus) || "DISCONNECTED";

  return {
    accessToken,
    accountId,
    effectiveConnectionStatus,
    externalAccountId: envExternalAccountId || storedExternalAccountId,
    graphApiBaseUrl,
    hasRuntimeCredentials,
    hasCompleteEnvCredentials,
    instagramUserId: envInstagramUserId || storedInstagramUserId,
    isReadyToPublish,
    pageId: envPageId || storedPageId,
    profileId: envProfileId || storedProfileId,
    usesEnvCredentials,
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

/** Returns the Meta app access token used for token validation calls. */
export function getMetaAppAccessToken() {
  if (!env.meta.app.id || !env.meta.app.secret) {
    return null;
  }

  return `${env.meta.app.id}|${env.meta.app.secret}`;
}

/** Creates the Meta `appsecret_proof` value for the given user or page token. */
export function getMetaAppSecretProof(accessToken) {
  const token = trimText(accessToken);

  if (!token || !env.meta.app.secret) {
    return null;
  }

  return crypto.createHmac("sha256", env.meta.app.secret).update(token).digest("hex");
}
