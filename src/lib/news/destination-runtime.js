import crypto from "node:crypto";

import { env } from "@/lib/env/server";
import { trimText } from "@/lib/news/shared";
import { decryptSecretValue } from "@/lib/security/secrets";

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

export function getMetaDestinationEnvCredential(destination = {}) {
  if (!destination?.slug || !["FACEBOOK", "INSTAGRAM"].includes(destination?.platform)) {
    return null;
  }

  const credential = env.meta.destinationCredentials?.[destination.slug];

  return credential && typeof credential === "object" && !Array.isArray(credential) ? credential : null;
}

export function resolveDestinationRuntimeConnection(destination = {}) {
  const envCredential = getMetaDestinationEnvCredential(destination) || {};
  const settings = normalizeSettings(destination?.settingsJson);
  const storedToken = decryptDestinationToken(destination);
  const accessToken = trimText(envCredential.accessToken) || trimText(storedToken) || null;
  const externalAccountId = trimText(envCredential.externalAccountId) || trimText(destination?.externalAccountId) || null;
  const pageId = trimText(envCredential.pageId) || trimText(settings.pageId) || null;
  const profileId = trimText(envCredential.profileId) || trimText(settings.profileId) || null;
  const instagramUserId =
    trimText(envCredential.instagramUserId) || trimText(settings.instagramUserId) || null;
  const accountId = externalAccountId || pageId || profileId || instagramUserId || null;
  const graphApiBaseUrl =
    trimText(envCredential.graphApiBaseUrl)
    || trimText(settings.graphApiBaseUrl)
    || trimText(env.meta.graphApiBaseUrl)
    || "https://graph.facebook.com/v22.0";
  const usesEnvCredentials = Boolean(
    trimText(envCredential.accessToken)
    || trimText(envCredential.externalAccountId)
    || trimText(envCredential.pageId)
    || trimText(envCredential.profileId)
    || trimText(envCredential.instagramUserId),
  );
  const hasRuntimeCredentials =
    destination?.platform === "WEBSITE" ? true : Boolean(accessToken && accountId);
  const isReadyToPublish =
    destination?.platform === "WEBSITE"
      ? true
      : usesEnvCredentials
        ? hasRuntimeCredentials
        : hasRuntimeCredentials && trimText(destination?.connectionStatus) === "CONNECTED";
  const effectiveConnectionStatus = isReadyToPublish
    ? "CONNECTED"
    : trimText(destination?.connectionStatus) || "DISCONNECTED";

  return {
    accessToken,
    accountId,
    effectiveConnectionStatus,
    externalAccountId,
    graphApiBaseUrl,
    hasRuntimeCredentials,
    instagramUserId,
    isReadyToPublish,
    pageId,
    profileId,
    usesEnvCredentials,
  };
}

export function hasDestinationRuntimeCredentials(destination = {}) {
  return resolveDestinationRuntimeConnection(destination).hasRuntimeCredentials;
}

export function isDestinationRuntimeReady(destination = {}) {
  return resolveDestinationRuntimeConnection(destination).isReadyToPublish;
}

export function getMetaAppAccessToken() {
  if (!env.meta.app.id || !env.meta.app.secret) {
    return null;
  }

  return `${env.meta.app.id}|${env.meta.app.secret}`;
}

export function getMetaAppSecretProof(accessToken) {
  const token = trimText(accessToken);

  if (!token || !env.meta.app.secret) {
    return null;
  }

  return crypto.createHmac("sha256", env.meta.app.secret).update(token).digest("hex");
}
