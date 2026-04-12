/**
 * Shared normalization and payload helpers for the destination editor, with
 * special handling for Meta credential discovery and guardrail overrides.
 */

import { formatEnumLabel } from "@/components/admin/news-admin-ui";
import { getDestinationPlatformForKind } from "@/lib/validation/configuration";

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDisplayText(value) {
  return trimText(value).replace(/\s+/g, " ");
}

function createDestinationSlug(value, fallback = "destination") {
  const normalized = normalizeDisplayText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function normalizeSettings(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toPositiveInteger(value, fallbackValue = null) {
  const parsedValue = Number.parseInt(`${value ?? ""}`, 10);

  if (Number.isInteger(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return fallbackValue;
}

function safeParseJsonObject(value) {
  const normalizedValue = trimText(value);

  if (!normalizedValue) {
    return {
      error: "",
      value: {},
    };
  }

  try {
    const parsedValue = JSON.parse(normalizedValue);

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {
        error: "Advanced settings must be a valid JSON object.",
        value: {},
      };
    }

    return {
      error: "",
      value: parsedValue,
    };
  } catch {
    return {
      error: "Advanced settings must be valid JSON before saving.",
      value: {},
    };
  }
}

function buildKindOptions(kindOptions, platform) {
  return kindOptions.map((option) => {
    const compatiblePlatform = getDestinationPlatformForKind(option.value);
    const compatible = !platform || !compatiblePlatform || compatiblePlatform === platform;

    return {
      ...option,
      description: compatible
        ? option.description
        : `${option.description} Compatible with ${formatEnumLabel(compatiblePlatform)} destinations only.`,
      disabled: !compatible,
    };
  });
}

function encodeDiscoveryValue(sourceKey, targetId) {
  const normalizedSourceKey = trimText(sourceKey);
  const normalizedTargetId = trimText(targetId);

  if (!normalizedSourceKey || !normalizedTargetId) {
    return "";
  }

  return `${normalizedSourceKey}|${normalizedTargetId}`;
}

function decodeDiscoveryValue(value) {
  const normalizedValue = trimText(value);
  const separatorIndex = normalizedValue.indexOf("|");

  if (separatorIndex <= 0) {
    return {
      sourceKey: "",
      targetId: "",
    };
  }

  return {
    sourceKey: normalizedValue.slice(0, separatorIndex),
    targetId: normalizedValue.slice(separatorIndex + 1),
  };
}

function removeKnownMetaSettings(settings_json) {
  const nextSettings = {
    ...normalizeSettings(settings_json),
  };

  ["graphApiBaseUrl", "instagramUserId", "pageId", "profileId", "socialGuardrails", "useDestinationCredentialOverrides"].forEach((key) => {
    delete nextSettings[key];
  });

  return nextSettings;
}

function buildInitialSocialGuardrails(settings_json, defaults) {
  const settings = normalizeSettings(settings_json);
  const overrides = normalizeSettings(settings.socialGuardrails);

  return Object.entries(defaults || {}).reduce((result, [key, fallbackValue]) => {
    result[key] = `${toPositiveInteger(overrides[key], fallbackValue) || fallbackValue}`;
    return result;
  }, {});
}

function normalizeMetaCredentialDefaults(metaConfig, slug) {
  const normalizedSlug = trimText(slug);
  const credentialDefaults = metaConfig?.credentialDefaultsBySlug?.[normalizedSlug];

  if (!credentialDefaults || typeof credentialDefaults !== "object" || Array.isArray(credentialDefaults)) {
    return null;
  }

  return {
    external_account_id: trimText(credentialDefaults.external_account_id),
    graphApiBaseUrl: trimText(credentialDefaults.graphApiBaseUrl),
    hasAccessToken: Boolean(credentialDefaults.hasAccessToken),
    instagramUserId: trimText(credentialDefaults.instagramUserId),
    pageId: trimText(credentialDefaults.pageId),
    profileId: trimText(credentialDefaults.profileId),
    sourceLabel: trimText(credentialDefaults.sourceLabel),
  };
}

function hasMetaCredentialDefaults(credentialDefaults) {
  return Boolean(
    credentialDefaults
      && (
        credentialDefaults.hasAccessToken
        || credentialDefaults.external_account_id
        || credentialDefaults.graphApiBaseUrl
        || credentialDefaults.instagramUserId
        || credentialDefaults.pageId
        || credentialDefaults.profileId
      ),
  );
}

function getPrimaryAccountIdForKind(kind, values = {}) {
  const normalizedKind = trimText(kind).toUpperCase();
  const normalizedExternalAccountId = trimText(values.external_account_id);

  if (normalizedExternalAccountId) {
    return normalizedExternalAccountId;
  }

  if (normalizedKind === "FACEBOOK_PAGE") {
    return trimText(values.pageId);
  }

  if (normalizedKind === "FACEBOOK_PROFILE") {
    return trimText(values.profileId);
  }

  if (["INSTAGRAM_BUSINESS", "INSTAGRAM_PERSONAL"].includes(normalizedKind)) {
    return trimText(values.instagramUserId);
  }

  return "";
}

function buildEffectiveCredentialState({
  destination = null,
  kind = "",
  metaConfig = {},
  slug = "",
} = {}) {
  const settings_json = normalizeSettings(destination?.settings_json);
  const credentialDefaults = normalizeMetaCredentialDefaults(metaConfig, slug);
  const hasCredentialDefaults = hasMetaCredentialDefaults(credentialDefaults);
  const useDestinationCredentialOverrides =
    settings_json.useDestinationCredentialOverrides === true || !hasCredentialDefaults;
  const sourceValues = useDestinationCredentialOverrides
    ? {
        external_account_id: trimText(destination?.external_account_id),
        graphApiBaseUrl: trimText(settings_json.graphApiBaseUrl),
        instagramUserId: trimText(settings_json.instagramUserId),
        pageId: trimText(settings_json.pageId),
        profileId: trimText(settings_json.profileId),
      }
    : {
        external_account_id: credentialDefaults?.external_account_id || "",
        graphApiBaseUrl: credentialDefaults?.graphApiBaseUrl || "",
        instagramUserId: credentialDefaults?.instagramUserId || "",
        pageId: credentialDefaults?.pageId || "",
        profileId: credentialDefaults?.profileId || "",
      };

  return {
    credentialDefaults,
    external_account_id:
      getPrimaryAccountIdForKind(kind, sourceValues)
      || trimText(sourceValues.external_account_id),
    graphApiBaseUrl:
      trimText(sourceValues.graphApiBaseUrl)
      || metaConfig?.defaultGraphApiBaseUrl
      || "https://graph.facebook.com/v25.0",
    hasCredentialDefaults,
    instagramUserId: trimText(sourceValues.instagramUserId),
    pageId: trimText(sourceValues.pageId),
    profileId: trimText(sourceValues.profileId),
    useDestinationCredentialOverrides,
  };
}

function buildMetaCredentialDefaultsPreview(credentialDefaults) {
  if (!hasMetaCredentialDefaults(credentialDefaults)) {
    return "{}";
  }

  return JSON.stringify(
    {
      accessToken: credentialDefaults.hasAccessToken ? "[Configured in environment]" : null,
      external_account_id: credentialDefaults.external_account_id || null,
      graphApiBaseUrl: credentialDefaults.graphApiBaseUrl || null,
      instagramUserId: credentialDefaults.instagramUserId || null,
      pageId: credentialDefaults.pageId || null,
      profileId: credentialDefaults.profileId || null,
    },
    null,
    2,
  );
}

function buildDestinationSettingsPayload({
  advancedSettings = {},
  defaults = {},
  graphApiBaseUrl = "",
  instagramUserId = "",
  kind = "",
  pageId = "",
  profileId = "",
  socialGuardrails = {},
  useDestinationCredentialOverrides = false,
} = {}) {
  const nextSettings = {
    ...normalizeSettings(advancedSettings),
  };
  const normalizedKind = trimText(kind).toUpperCase();
  const normalizedGraphApiBaseUrl = trimText(graphApiBaseUrl);
  const normalizedPageId = trimText(pageId);
  const normalizedProfileId = trimText(profileId);
  const normalizedInstagramUserId = trimText(instagramUserId);
  const nextSocialGuardrails = Object.entries(defaults).reduce((result, [key, fallbackValue]) => {
    const nextValue = toPositiveInteger(socialGuardrails[key]);

    if (nextValue && nextValue !== fallbackValue && key !== "defaultGraphApiBaseUrl") {
      result[key] = nextValue;
    }

    return result;
  }, {});

  if (normalizedGraphApiBaseUrl && normalizedGraphApiBaseUrl !== trimText(defaults.defaultGraphApiBaseUrl)) {
    nextSettings.graphApiBaseUrl = normalizedGraphApiBaseUrl;
  }

  if (Object.keys(nextSocialGuardrails).length) {
    nextSettings.socialGuardrails = nextSocialGuardrails;
  }

  if (useDestinationCredentialOverrides) {
    nextSettings.useDestinationCredentialOverrides = true;
  }

  if (normalizedKind === "FACEBOOK_PAGE" && normalizedPageId) {
    nextSettings.pageId = normalizedPageId;
  }

  if (normalizedKind === "FACEBOOK_PROFILE" && normalizedProfileId) {
    nextSettings.profileId = normalizedProfileId;
  }

  if (["INSTAGRAM_BUSINESS", "INSTAGRAM_PERSONAL"].includes(normalizedKind) && normalizedInstagramUserId) {
    nextSettings.instagramUserId = normalizedInstagramUserId;
  }

  if (normalizedKind === "INSTAGRAM_BUSINESS" && normalizedPageId) {
    nextSettings.pageId = normalizedPageId;
  }

  return nextSettings;
}

function formatAccountHandle(username, fallbackValue = "") {
  const normalizedUsername = trimText(username);

  if (normalizedUsername) {
    return normalizedUsername.startsWith("@") ? normalizedUsername : `@${normalizedUsername}`;
  }

  return trimText(fallbackValue);
}

function buildFacebookPageOptions(discoverySnapshot) {
  return (discoverySnapshot?.pages || []).map((page) => ({
    badge: page.username || page.sourceLabel || "page",
    description: [
      page.tasks?.length ? `Tasks: ${page.tasks.join(", ")}.` : "Meta did not report publish tasks for this page.",
      page.instagramAccounts?.length
        ? `Linked Instagram: ${page.instagramAccounts
            .map((instagramAccount) => {
              const username = trimText(instagramAccount.username);

              return username ? `@${username}` : instagramAccount.id;
            })
            .join(", ")}.`
        : "No linked Instagram account reported.",
    ]
      .filter(Boolean)
      .join(" "),
    label: page.name || page.username || page.id,
    pageId: page.id,
    sourceKey: page.sourceKey,
    username: page.username,
    value: encodeDiscoveryValue(page.sourceKey, page.id),
  }));
}

function buildInstagramAccountOptions(discoverySnapshot) {
  return (discoverySnapshot?.instagramAccounts || []).map((instagramAccount) => ({
    badge: instagramAccount.accountType || instagramAccount.sourceLabel || "instagram",
    connectedPageId: instagramAccount.connectedPageId || "",
    description: [
      instagramAccount.accountType ? `Account type: ${formatEnumLabel(instagramAccount.accountType)}.` : "",
      instagramAccount.connectedPageName ? `Connected page: ${instagramAccount.connectedPageName}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    label: instagramAccount.username ? `@${instagramAccount.username}` : instagramAccount.id,
    sourceKey: instagramAccount.sourceKey,
    username: instagramAccount.username,
    value: encodeDiscoveryValue(instagramAccount.sourceKey, instagramAccount.id),
  }));
}

/**
 * Shared field definitions for editable Meta publishing guardrail overrides.
 */
export const socialGuardrailFieldDefinitions = Object.freeze([
  {
    envField: "META_SOCIAL_MIN_POST_INTERVAL_MINUTES",
    key: "minPostIntervalMinutes",
    label: "Minimum post interval",
    suffix: "minutes",
  },
  {
    envField: "META_SOCIAL_DUPLICATE_COOLDOWN_HOURS",
    key: "duplicateCooldownHours",
    label: "Duplicate cooldown",
    suffix: "hours",
  },
  {
    envField: "META_FACEBOOK_MAX_POSTS_PER_24H",
    key: "facebookMaxPostsPer24Hours",
    label: "Facebook daily cap",
    suffix: "posts",
  },
  {
    envField: "META_INSTAGRAM_MAX_POSTS_PER_24H",
    key: "instagramMaxPostsPer24Hours",
    label: "Instagram daily cap",
    suffix: "posts",
  },
  {
    envField: "META_INSTAGRAM_MAX_HASHTAGS",
    key: "instagramMaxHashtags",
    label: "Instagram hashtag limit",
    suffix: "hashtags",
  },
]);

/**
 * Shared helper collection used by the destination form card.
 */
export const destinationFormUtils = Object.freeze({
  buildDestinationSettingsPayload,
  buildEffectiveCredentialState,
  buildFacebookPageOptions,
  buildInitialSocialGuardrails,
  buildInstagramAccountOptions,
  buildKindOptions,
  buildMetaCredentialDefaultsPreview,
  createDestinationSlug,
  decodeDiscoveryValue,
  formatAccountHandle,
  hasMetaCredentialDefaults,
  normalizeMetaCredentialDefaults,
  normalizeDisplayText,
  normalizeSettings,
  removeKnownMetaSettings,
  safeParseJsonObject,
  toPositiveInteger,
  trimText,
});
