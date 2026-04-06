import { env } from "@/lib/env/server";
import { NewsPubError, trimText } from "@/lib/news/shared";

const defaultGraphApiBaseUrl = "https://graph.facebook.com/v25.0";

const socialGuardrailDefaults = Object.freeze({
  duplicateCooldownHours: 72,
  facebookMaxPostsPer24Hours: 12,
  instagramMaxHashtags: 8,
  instagramMaxPostsPer24Hours: 20,
  minPostIntervalMinutes: 90,
});

const socialGuardrailFieldMapping = Object.freeze({
  duplicateCooldownHours: "META_SOCIAL_DUPLICATE_COOLDOWN_HOURS",
  facebookMaxPostsPer24Hours: "META_FACEBOOK_MAX_POSTS_PER_24H",
  instagramMaxHashtags: "META_INSTAGRAM_MAX_HASHTAGS",
  instagramMaxPostsPer24Hours: "META_INSTAGRAM_MAX_POSTS_PER_24H",
  minPostIntervalMinutes: "META_SOCIAL_MIN_POST_INTERVAL_MINUTES",
});

const knownMetaSettingKeys = Object.freeze([
  "graphApiBaseUrl",
  "instagramUserId",
  "pageId",
  "profileId",
  "socialGuardrails",
  "useDestinationCredentialOverrides",
]);

const metaInstagramFields = "account_type,id,profile_picture_url,username";
const requiredFacebookPageTasks = new Set(["CREATE_CONTENT", "MANAGE", "MODERATE"]);
const metaPageFields = [
  "access_token",
  "id",
  "link",
  "name",
  "tasks",
  "username",
  `connected_instagram_account{${metaInstagramFields}}`,
  `instagram_business_account{${metaInstagramFields}}`,
].join(",");

class MetaDiscoveryError extends Error {
  constructor(message, { responseJson = null, sourceKey = null, sourceLabel = null, statusCode = 502 } = {}) {
    super(message);
    this.name = "MetaDiscoveryError";
    this.responseJson = responseJson;
    this.sourceKey = sourceKey;
    this.sourceLabel = sourceLabel;
    this.statusCode = statusCode;
  }
}

function normalizeSettings(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeBaseUrl(value = defaultGraphApiBaseUrl) {
  return `${trimText(value).replace(/\/+$/, "")}/`;
}

function toPositiveInteger(value) {
  const parsedValue = Number.parseInt(`${value ?? ""}`, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function sortByLabel(leftValue, rightValue) {
  return `${leftValue || ""}`.localeCompare(`${rightValue || ""}`, undefined, {
    sensitivity: "base",
  });
}

function normalizeAccountHandle(value, fallbackValue = "") {
  const normalizedValue = trimText(value);

  if (!normalizedValue) {
    return trimText(fallbackValue);
  }

  if (normalizedValue.startsWith("@") || normalizedValue.includes(" ")) {
    return normalizedValue;
  }

  return `@${normalizedValue}`;
}

function buildCredentialSourceKey(credentialKey) {
  return `env:${credentialKey}`;
}

function getMetaGraphRequestBaseUrl(value) {
  return trimText(value) || trimText(env.meta.graphApiBaseUrl) || defaultGraphApiBaseUrl;
}

function getMetaCredentialSources() {
  const sources = [];
  const normalizedUserAccessToken = trimText(env.meta.userAccessToken);

  if (normalizedUserAccessToken) {
    sources.push({
      accessToken: normalizedUserAccessToken,
      credentialKey: "meta-user-access-token",
      externalAccountId: null,
      graphApiBaseUrl: getMetaGraphRequestBaseUrl(),
      instagramUserId: null,
      pageId: null,
      sourceKey: buildCredentialSourceKey("meta-user-access-token"),
      sourceLabel: "META_USER_ACCESS_TOKEN",
      sourceType: "env",
    });
  }

  return sources;
}

function getMetaCredentialSourceByKey(sourceKey) {
  return getMetaCredentialSources().find((source) => source.sourceKey === trimText(sourceKey)) || null;
}

function createMetaDiscoveryError(source, message, responseJson = null, statusCode = 502) {
  return new MetaDiscoveryError(message, {
    responseJson,
    sourceKey: source?.sourceKey || null,
    sourceLabel: source?.sourceLabel || null,
    statusCode,
  });
}

async function parseMetaJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

async function getMetaGraphJson(source, path, values = {}) {
  if (!source?.accessToken) {
    throw createMetaDiscoveryError(source, "No Meta access token is configured for this credential source.", {
      error: "meta_access_token_missing",
    }, 400);
  }

  const baseUrl = normalizeBaseUrl(source.graphApiBaseUrl || defaultGraphApiBaseUrl);
  const url = new URL(path.replace(/^\/+/, ""), baseUrl);

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, `${value}`);
  });

  url.searchParams.set("access_token", source.accessToken);

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    method: "GET",
  });
  const payload = await parseMetaJsonResponse(response);

  if (!response.ok || payload?.error) {
    throw createMetaDiscoveryError(
      source,
      payload?.error?.message || `Meta discovery failed with status ${response.status}.`,
      payload,
      response.status || 502,
    );
  }

  return payload || {};
}

function buildInstagramDiscoveryRecord(instagramRecord, source, page = null, accessToken = null) {
  const id = trimText(instagramRecord?.id);

  if (!id) {
    return null;
  }

  return {
    accessToken: trimText(accessToken) || null,
    accountType: trimText(instagramRecord?.account_type) || null,
    connectedPageId: trimText(page?.id) || null,
    connectedPageName: trimText(page?.name) || null,
    id,
    profilePictureUrl: trimText(instagramRecord?.profile_picture_url) || null,
    sourceKey: source.sourceKey,
    sourceLabel: source.sourceLabel,
    username: trimText(instagramRecord?.username) || null,
  };
}

function buildPageDiscoveryRecord(pageRecord, source) {
  const id = trimText(pageRecord?.id);

  if (!id) {
    return null;
  }

  const instagramAccounts = [
    buildInstagramDiscoveryRecord(
      pageRecord?.instagram_business_account,
      source,
      pageRecord,
      trimText(pageRecord?.access_token) || source.accessToken,
    ),
    buildInstagramDiscoveryRecord(
      pageRecord?.connected_instagram_account,
      source,
      pageRecord,
      trimText(pageRecord?.access_token) || source.accessToken,
    ),
  ].filter(Boolean);
  const uniqueInstagramAccounts = [...new Map(instagramAccounts.map((record) => [record.id, record])).values()];

  return {
    accessToken: trimText(pageRecord?.access_token) || source.accessToken,
    id,
    instagramAccounts: uniqueInstagramAccounts,
    link: trimText(pageRecord?.link) || null,
    name: trimText(pageRecord?.name) || trimText(pageRecord?.username) || id,
    sourceKey: source.sourceKey,
    sourceLabel: source.sourceLabel,
    tasks: [...new Set((Array.isArray(pageRecord?.tasks) ? pageRecord.tasks : [])
      .map((task) => trimText(task).toUpperCase())
      .filter(Boolean))],
    username: trimText(pageRecord?.username) || null,
  };
}

function isAllowedFacebookPage(pageRecord) {
  const allowedPageIds = new Set((env.meta.allowedPageIds || []).map((value) => trimText(value)).filter(Boolean));
  const pageId = trimText(pageRecord?.id);
  const pageTasks = Array.isArray(pageRecord?.tasks) ? pageRecord.tasks : [];
  const normalizedPageTasks = new Set(pageTasks.map((task) => trimText(task).toUpperCase()).filter(Boolean));
  const hasRequiredPublishingTasks = [...requiredFacebookPageTasks].every((task) =>
    normalizedPageTasks.has(task),
  );

  if (!pageId || !hasRequiredPublishingTasks) {
    return false;
  }

  if (!allowedPageIds.size) {
    return true;
  }

  return allowedPageIds.has(pageId);
}

async function discoverAssetsFromSource(source) {
  if (!source?.accessToken) {
    throw createMetaDiscoveryError(
      source,
      "No Meta access token is configured for this discovery source. Set META_USER_ACCESS_TOKEN first.",
      { error: "meta_access_token_missing" },
      400,
    );
  }

  let discoveredPages = [];
  let lastError = null;

  try {
    const payload = await getMetaGraphJson(source, "me/accounts", {
      fields: metaPageFields,
      limit: 100,
    });

    discoveredPages = (payload?.data || [])
      .map((record) => buildPageDiscoveryRecord(record, source))
      .filter(Boolean)
      .filter(isAllowedFacebookPage);
  } catch (error) {
    lastError = error;
  }

  if (!discoveredPages.length && (source.pageId || source.externalAccountId)) {
    try {
      const pagePayload = await getMetaGraphJson(source, source.pageId || source.externalAccountId, {
        fields: metaPageFields,
      });
      const fallbackPage = buildPageDiscoveryRecord(pagePayload, source);

      discoveredPages = fallbackPage && isAllowedFacebookPage(fallbackPage) ? [fallbackPage] : [];
      lastError = null;
    } catch (error) {
      lastError = error;
    }
  }

  let discoveredInstagramAccounts = discoveredPages.flatMap((page) => page.instagramAccounts || []);

  if (!discoveredInstagramAccounts.length && (source.instagramUserId || source.externalAccountId)) {
    try {
      const instagramPayload = await getMetaGraphJson(source, source.instagramUserId || source.externalAccountId, {
        fields: metaInstagramFields,
      });
      const fallbackInstagramAccount = buildInstagramDiscoveryRecord(
        instagramPayload,
        source,
        null,
        source.accessToken,
      );

      discoveredInstagramAccounts = fallbackInstagramAccount ? [fallbackInstagramAccount] : [];
      lastError = null;
    } catch (error) {
      lastError = error;
    }
  }

  if (!discoveredPages.length && !discoveredInstagramAccounts.length && lastError) {
    throw lastError;
  }

  return {
    instagramAccounts: [...new Map(discoveredInstagramAccounts.map((record) => [record.id, record])).values()],
    pages: [...new Map(discoveredPages.map((record) => [record.id, record])).values()],
  };
}

function toClientDiscoveryPageRecord(pageRecord) {
  return {
    id: pageRecord.id,
    instagramAccounts: (pageRecord.instagramAccounts || []).map((instagramAccount) => ({
      accountType: instagramAccount.accountType,
      id: instagramAccount.id,
      username: instagramAccount.username,
    })),
    link: pageRecord.link,
    name: pageRecord.name,
    sourceKey: pageRecord.sourceKey,
    sourceLabel: pageRecord.sourceLabel,
    tasks: pageRecord.tasks || [],
    username: pageRecord.username,
  };
}

function toClientDiscoveryInstagramRecord(instagramRecord) {
  return {
    accountType: instagramRecord.accountType,
    connectedPageId: instagramRecord.connectedPageId,
    connectedPageName: instagramRecord.connectedPageName,
    id: instagramRecord.id,
    profilePictureUrl: instagramRecord.profilePictureUrl,
    sourceKey: instagramRecord.sourceKey,
    sourceLabel: instagramRecord.sourceLabel,
    username: instagramRecord.username,
  };
}

function createDiscoveryErrorRecord(source, error) {
  return {
    message:
      trimText(error?.message)
      || "Meta discovery failed while loading connected pages and accounts.",
    sourceKey: source?.sourceKey || error?.sourceKey || null,
    sourceLabel: source?.sourceLabel || error?.sourceLabel || null,
  };
}

function removeKnownMetaSettings(settingsJson) {
  const nextSettings = {
    ...normalizeSettings(settingsJson),
  };

  knownMetaSettingKeys.forEach((key) => {
    delete nextSettings[key];
  });

  return nextSettings;
}

function buildSocialGuardrailOverrides(values = {}, defaults = getDestinationSocialGuardrailDefaults()) {
  return Object.entries(defaults).reduce((result, [key, fallbackValue]) => {
    const nextValue = toPositiveInteger(values[key]);

    if (nextValue && nextValue !== fallbackValue) {
      result[key] = nextValue;
    }

    return result;
  }, {});
}

function sanitizeDestinationSettingsByKind(settingsJson = {}, kind = "") {
  const sanitizedSettings = {
    ...removeKnownMetaSettings(settingsJson),
  };
  const normalizedKind = trimText(kind).toUpperCase();
  const nextGraphApiBaseUrl = trimText(settingsJson.graphApiBaseUrl);
  const nextSocialGuardrails = normalizeSettings(settingsJson.socialGuardrails);
  const useDestinationCredentialOverrides = settingsJson.useDestinationCredentialOverrides === true;

  if (nextGraphApiBaseUrl) {
    sanitizedSettings.graphApiBaseUrl = nextGraphApiBaseUrl;
  }

  if (Object.keys(nextSocialGuardrails).length) {
    sanitizedSettings.socialGuardrails = nextSocialGuardrails;
  }

  if (useDestinationCredentialOverrides) {
    sanitizedSettings.useDestinationCredentialOverrides = true;
  }

  if (normalizedKind === "FACEBOOK_PAGE") {
    const pageId = trimText(settingsJson.pageId);

    if (pageId) {
      sanitizedSettings.pageId = pageId;
    }

    return sanitizedSettings;
  }

  if (normalizedKind === "FACEBOOK_PROFILE") {
    const profileId = trimText(settingsJson.profileId);

    if (profileId) {
      sanitizedSettings.profileId = profileId;
    }

    return sanitizedSettings;
  }

  if (normalizedKind === "INSTAGRAM_BUSINESS" || normalizedKind === "INSTAGRAM_PERSONAL") {
    const instagramUserId = trimText(settingsJson.instagramUserId);
    const pageId = trimText(settingsJson.pageId);

    if (instagramUserId) {
      sanitizedSettings.instagramUserId = instagramUserId;
    }

    if (pageId) {
      sanitizedSettings.pageId = pageId;
    }

    return sanitizedSettings;
  }

  return sanitizedSettings;
}

export function getMetaDestinationFormConfig() {
  return {
    credentialDefaultsBySlug: {},
    defaultGraphApiBaseUrl: getMetaGraphRequestBaseUrl(),
    hasDiscoveryAccessToken: Boolean(trimText(env.meta.userAccessToken)),
    socialGuardrails: getDestinationSocialGuardrailDefaults(),
  };
}

export function getDestinationSocialGuardrailDefaults() {
  return {
    ...socialGuardrailDefaults,
    ...Object.entries(env.meta.socialGuardrails || {}).reduce((result, [key, value]) => {
      const nextValue = toPositiveInteger(value);

      if (nextValue) {
        result[key] = nextValue;
      }

      return result;
    }, {}),
  };
}

export function getDestinationSocialGuardrails(destination = {}) {
  const defaults = getDestinationSocialGuardrailDefaults();
  const settings = normalizeSettings(destination?.settingsJson);
  const overrides = normalizeSettings(settings.socialGuardrails);

  return Object.entries(defaults).reduce((result, [key, fallbackValue]) => {
    result[key] = toPositiveInteger(overrides[key]) || fallbackValue;
    return result;
  }, {});
}

export function usesDestinationCredentialOverrides(destination = {}) {
  return normalizeSettings(destination?.settingsJson).useDestinationCredentialOverrides === true;
}

export function getDestinationSocialGuardrailOverrideFields(destination = {}) {
  const settings = normalizeSettings(destination?.settingsJson);
  const overrides = normalizeSettings(settings.socialGuardrails);

  return Object.entries(socialGuardrailFieldMapping).reduce((result, [key, envField]) => {
    const nextValue = toPositiveInteger(overrides[key]);

    if (nextValue) {
      result[key] = {
        envField,
        value: nextValue,
      };
    }

    return result;
  }, {});
}

export function buildDestinationSettingsPayload({
  advancedSettings = {},
  defaults = getDestinationSocialGuardrailDefaults(),
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
  const overrides = buildSocialGuardrailOverrides(socialGuardrails, defaults);

  if (normalizedGraphApiBaseUrl && normalizedGraphApiBaseUrl !== getMetaGraphRequestBaseUrl()) {
    nextSettings.graphApiBaseUrl = normalizedGraphApiBaseUrl;
  }

  if (Object.keys(overrides).length) {
    nextSettings.socialGuardrails = overrides;
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

  if (["INSTAGRAM_BUSINESS", "INSTAGRAM_PERSONAL"].includes(normalizedKind) && normalizedPageId) {
    nextSettings.pageId = normalizedPageId;
  }

  return sanitizeDestinationSettingsByKind(nextSettings, kind);
}

export async function getMetaDiscoverySnapshot() {
  const sources = getMetaCredentialSources();
  const pageRecords = new Map();
  const instagramRecords = new Map();
  const errors = [];

  if (!sources.length) {
    errors.push({
      message:
        "No Meta discovery access token is configured. Set META_USER_ACCESS_TOKEN to a long-lived User access token to fetch connected pages and Instagram accounts automatically.",
      sourceKey: null,
      sourceLabel: null,
    });
  }

  for (const source of sources) {
    try {
      const discoveredAssets = await discoverAssetsFromSource(source);

      if (!discoveredAssets.pages.length && !discoveredAssets.instagramAccounts.length) {
        errors.push({
          message:
            "Meta returned no connected Facebook pages or Instagram accounts for this credential source.",
          sourceKey: source.sourceKey,
          sourceLabel: source.sourceLabel,
        });
      }

      for (const pageRecord of discoveredAssets.pages) {
        if (!pageRecords.has(pageRecord.id)) {
          pageRecords.set(pageRecord.id, toClientDiscoveryPageRecord(pageRecord));
        }
      }

      for (const instagramRecord of discoveredAssets.instagramAccounts) {
        if (!instagramRecords.has(instagramRecord.id)) {
          instagramRecords.set(instagramRecord.id, toClientDiscoveryInstagramRecord(instagramRecord));
        }
      }
    } catch (error) {
      errors.push(createDiscoveryErrorRecord(source, error));
    }
  }

  return {
    allowedPageIds: [...(env.meta.allowedPageIds || [])],
    defaultGraphApiBaseUrl: getMetaGraphRequestBaseUrl(),
    errors,
    instagramAccounts: [...instagramRecords.values()].sort((leftRecord, rightRecord) =>
      sortByLabel(
        leftRecord.username || leftRecord.connectedPageName || leftRecord.id,
        rightRecord.username || rightRecord.connectedPageName || rightRecord.id,
      ),
    ),
    pages: [...pageRecords.values()].sort((leftRecord, rightRecord) =>
      sortByLabel(leftRecord.name || leftRecord.username || leftRecord.id, rightRecord.name || rightRecord.username || rightRecord.id),
    ),
    sourceCount: sources.length,
  };
}

export async function resolveMetaDiscoverySelection({ sourceKey, targetId, targetType } = {}) {
  const normalizedSourceKey = trimText(sourceKey);
  const normalizedTargetId = trimText(targetId);
  const normalizedTargetType = trimText(targetType);
  const source = getMetaCredentialSourceByKey(normalizedSourceKey);

  if (!normalizedSourceKey || !normalizedTargetId || !normalizedTargetType) {
    return null;
  }

  if (!source) {
    throw new NewsPubError(
      "The selected Meta credential source is no longer available. Refresh the connected assets list and choose the page or account again.",
      {
        status: "destination_meta_source_not_found",
        statusCode: 400,
      },
    );
  }

  const discoveredAssets = await discoverAssetsFromSource(source);

  if (normalizedTargetType === "FACEBOOK_PAGE") {
    const pageRecord = discoveredAssets.pages.find((record) => record.id === normalizedTargetId);

    if (!pageRecord) {
      throw new NewsPubError(
        "The selected Facebook page could not be resolved from the current Meta credential source. Refresh the connected assets list and try again.",
        {
          status: "destination_meta_page_not_found",
          statusCode: 400,
        },
      );
    }

    return {
      accessToken: trimText(pageRecord.accessToken) || source.accessToken,
      accountHandle: normalizeAccountHandle(pageRecord.username, pageRecord.name),
      externalAccountId: pageRecord.id,
      settingsJsonPatch: sanitizeDestinationSettingsByKind(
        {
          graphApiBaseUrl: source.graphApiBaseUrl,
          pageId: pageRecord.id,
        },
        "FACEBOOK_PAGE",
      ),
    };
  }

  if (normalizedTargetType === "INSTAGRAM_ACCOUNT") {
    const instagramRecord = discoveredAssets.instagramAccounts.find((record) => record.id === normalizedTargetId);

    if (!instagramRecord) {
      throw new NewsPubError(
        "The selected Instagram account could not be resolved from the current Meta credential source. Refresh the connected assets list and try again.",
        {
          status: "destination_meta_instagram_not_found",
          statusCode: 400,
        },
      );
    }

    return {
      accessToken: trimText(instagramRecord.accessToken) || source.accessToken,
      accountHandle: normalizeAccountHandle(instagramRecord.username, instagramRecord.connectedPageName),
      externalAccountId: instagramRecord.id,
      settingsJsonPatch: sanitizeDestinationSettingsByKind(
        {
          graphApiBaseUrl: source.graphApiBaseUrl,
          instagramUserId: instagramRecord.id,
          pageId: instagramRecord.connectedPageId,
        },
        "INSTAGRAM_BUSINESS",
      ),
    };
  }

  throw new NewsPubError(`Unsupported Meta discovery target type "${normalizedTargetType}".`, {
    status: "destination_meta_target_type_invalid",
    statusCode: 400,
  });
}
