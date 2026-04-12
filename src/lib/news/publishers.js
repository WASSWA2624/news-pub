/**
 * Destination publisher adapters for NewsPub website and Meta publication attempts.
 */

import { env } from "@/lib/env/server";
import { resolveDestinationRuntimeConnection } from "@/lib/news/destination-runtime";
import {
  isMetaTokenExpiredError,
  refreshFacebookPublishCredential,
  resolveFacebookPublishCredential,
} from "@/lib/news/meta-credentials";
import { fetchWithTimeoutAndRetry } from "@/lib/news/outbound-fetch";
import { NewsPubError, trimText } from "@/lib/news/shared";
import { getDestinationValidationIssues } from "@/lib/validation/configuration";

const defaultGraphApiBaseUrl = "https://graph.facebook.com/v25.0";

/**
 * Error type used when an outbound NewsPub destination publish attempt fails.
 */
export class DestinationPublishError extends NewsPubError {
  constructor(
    message,
    {
      response_json = null,
      retryable = false,
      status = "destination_publish_failed",
      statusCode = 502,
    } = {},
  ) {
    super(message, {
      status,
      statusCode,
    });
    this.name = "DestinationPublishError";
    this.response_json = response_json;
    this.retryable = retryable;
  }
}

function normalizeBaseUrl(value = defaultGraphApiBaseUrl) {
  return `${trimText(value).replace(/\/+$/, "")}/`;
}

function isRootRelativeUrl(value) {
  return value.startsWith("/") && !value.startsWith("//");
}

function normalizePublishUrl(value) {
  const normalizedValue = trimText(value);

  if (!normalizedValue) {
    return null;
  }

  try {
    if (isRootRelativeUrl(normalizedValue)) {
      return new URL(normalizedValue, env.app.url).toString();
    }

    return new URL(normalizedValue).toString();
  } catch {
    return normalizedValue;
  }
}

function isPrivateIpv4Hostname(hostname) {
  const octets = hostname.split(".").map((part) => Number.parseInt(part, 10));

  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  return (
    octets[0] === 0 ||
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function isPrivateIpv6Hostname(hostname) {
  const normalizedHostname = hostname.toLowerCase();

  return (
    normalizedHostname === "::1" ||
    normalizedHostname.startsWith("fc") ||
    normalizedHostname.startsWith("fd") ||
    normalizedHostname.startsWith("fe80:")
  );
}

function resolveMetaPublishUrl(value) {
  const normalizedUrl = normalizePublishUrl(value);

  if (!normalizedUrl) {
    return {
      hostname: null,
      issue: "missing",
      normalizedUrl: null,
    };
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local") ||
      isPrivateIpv4Hostname(hostname) ||
      isPrivateIpv6Hostname(hostname)
    ) {
      return {
        hostname,
        issue: "not_public",
        normalizedUrl: parsedUrl.toString(),
      };
    }

    return {
      hostname,
      issue: null,
      normalizedUrl: parsedUrl.toString(),
    };
  } catch {
    return {
      hostname: null,
      issue: "invalid",
      normalizedUrl,
    };
  }
}

function createMetaPublicUrlError(platformLabel, fieldLabel, resolution) {
  const resolvedUrl = trimText(resolution?.normalizedUrl);
  const host = trimText(resolution?.hostname);
  const isNotPublic = resolution?.issue === "not_public";
  const message = isNotPublic
    ? `${platformLabel} publishing requires a publicly reachable ${fieldLabel}. Resolved host "${host || "unknown"}" is not public. Set NEXT_PUBLIC_APP_URL to a public domain or tunnel before publishing.`
    : `${platformLabel} publishing requires a valid public ${fieldLabel}.`;

  return new DestinationPublishError(message, {
    response_json: {
      error: "destination_publish_public_url_required",
      field: fieldLabel,
      host: host || null,
      issue: resolution?.issue || "invalid",
      platform: platformLabel.toUpperCase(),
      resolvedUrl: resolvedUrl || null,
    },
    retryable: false,
    status: "destination_publish_public_url_required",
    statusCode: 400,
  });
}

function buildFacebookFeedPostValues({ accessToken, link, message }) {
  return {
    access_token: accessToken,
    ...(link ? { link } : {}),
    message,
  };
}

function joinPublishText(parts, maxLength = 2200) {
  const resolvedParts = [];
  const seenParts = new Set();

  for (const part of parts) {
    const trimmedPart = trimText(part);

    if (!trimmedPart) {
      continue;
    }

    const normalizedPart = trimmedPart.replace(/\s+/g, " ").toLowerCase();

    if (seenParts.has(normalizedPart)) {
      continue;
    }

    seenParts.add(normalizedPart);
    resolvedParts.push(trimmedPart);
  }

  return resolvedParts.join("\n\n").slice(0, maxLength);
}

function normalizeBodyText(value) {
  return trimText(`${value || ""}`)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function splitBodySections(value) {
  return normalizeBodyText(value)
    .split(/\n{2,}/)
    .map((section) =>
      section
        .split("\n")
        .map((line) => trimText(line))
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean);
}

function normalizeSectionKey(value) {
  return normalizeBodyText(value)
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function sectionContainsValue(section, value) {
  const normalizedValue = normalizeSectionKey(value);

  return Boolean(normalizedValue) && normalizeSectionKey(section).includes(normalizedValue);
}

/**
 * Formats a NewsPub Facebook headline using the bounded bold-title convention.
 */
export function formatFacebookTitle(value) {
  const normalizedValue = trimText(value);

  if (!normalizedValue) {
    return "";
  }

  return `**${normalizedValue.replace(/^\*+|\*+$/g, "")}**`;
}

function extractFacebookBodySections(payload) {
  const summaryKey = normalizeSectionKey(payload.summary);
  const sourceReferenceKey = normalizeSectionKey(payload.sourceReference);
  const canonical_url = trimText(payload.canonical_url);
  const extraLinkUrl = trimText(payload.extraLinkUrl);

  return splitBodySections(payload.body).filter((section) => {
    const sectionKey = normalizeSectionKey(section);

    if (!sectionKey) {
      return false;
    }

    if (
      sectionKey === normalizeSectionKey(payload.title)
      || sectionKey === normalizeSectionKey(formatFacebookTitle(payload.title))
      || sectionKey === summaryKey
      || sectionKey === sourceReferenceKey
      || sectionKey.startsWith("source:")
      || sectionKey.startsWith("read more:")
    ) {
      return false;
    }

    if (sectionContainsValue(section, canonical_url) || sectionContainsValue(section, extraLinkUrl)) {
      return false;
    }

    return true;
  });
}

function isRetryableGraphFailure(response, payload) {
  const statusCode = response?.status || 0;
  const graphError = payload?.error || null;

  return (
    statusCode === 429 ||
    statusCode >= 500 ||
    Boolean(graphError?.is_transient) ||
    [1, 2, 4, 17, 32, 613].includes(graphError?.code)
  );
}

async function parseJsonResponse(response) {
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

async function getGraphJson(runtimeConnection, path, values) {
  const base_url = normalizeBaseUrl(runtimeConnection?.graphApiBaseUrl || defaultGraphApiBaseUrl);
  const url = new URL(path.replace(/^\/+/, ""), base_url);

  Object.entries(values || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, `${value}`);
  });

  let response;

  try {
    response = await fetchWithTimeoutAndRetry(url, {
      headers: {
        accept: "application/json",
      },
      method: "GET",
    });
  } catch (error) {
    throw new DestinationPublishError(
      `Destination publish request failed before a response: ${error instanceof Error ? error.message : "network error"}.`,
      {
        response_json: {
          error: "destination_publish_network_failed",
        },
        retryable: true,
        status: "destination_publish_network_failed",
        statusCode: 502,
      },
    );
  }

  const payload = await parseJsonResponse(response);

  if (!response.ok || payload?.error) {
    throw new DestinationPublishError(
      payload?.error?.message || `Destination publish failed with status ${response.status}.`,
      {
        response_json: payload,
        retryable: isRetryableGraphFailure(response, payload),
        status: "destination_publish_failed",
        statusCode: response.status || 502,
      },
    );
  }

  return payload || {};
}

async function postGraphForm(runtimeConnection, path, values) {
  const base_url = normalizeBaseUrl(runtimeConnection?.graphApiBaseUrl || defaultGraphApiBaseUrl);
  const body = new URLSearchParams();

  Object.entries(values || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    body.set(key, `${value}`);
  });

  let response;

  try {
    response = await fetchWithTimeoutAndRetry(new URL(path.replace(/^\/+/, ""), base_url), {
      body,
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      method: "POST",
    });
  } catch (error) {
    throw new DestinationPublishError(
      `Destination publish request failed before a response: ${error instanceof Error ? error.message : "network error"}.`,
      {
        response_json: {
          error: "destination_publish_network_failed",
        },
        retryable: true,
        status: "destination_publish_network_failed",
        statusCode: 502,
      },
    );
  }

  const payload = await parseJsonResponse(response);

  if (!response.ok || payload?.error) {
    throw new DestinationPublishError(
      payload?.error?.message || `Destination publish failed with status ${response.status}.`,
      {
        response_json: payload,
        retryable: isRetryableGraphFailure(response, payload),
        status: "destination_publish_failed",
        statusCode: response.status || 502,
      },
    );
  }

  return payload || {};
}

function requireRuntimeAccessToken(runtimeConnection) {
  if (!runtimeConnection?.accessToken) {
    throw new DestinationPublishError("Destination token is missing or unreadable.", {
      response_json: {
        error: "destination_token_missing",
      },
      retryable: false,
      status: "destination_token_missing",
      statusCode: 400,
    });
  }

  return runtimeConnection.accessToken;
}

function classifyMetaPublishFailure(error) {
  const responseError = error?.response_json?.error || error?.response_json || {};
  const responseMessage = trimText(responseError?.message || error?.message).toLowerCase();
  const responseCode = Number(responseError?.code || 0);

  if (responseCode === 190) {
    if (responseMessage.includes("revoked") || responseMessage.includes("invalidated")) {
      return {
        status: "destination_token_revoked",
        statusCode: 401,
      };
    }

    return {
      status: "destination_token_expired_reconnect_required",
      statusCode: 401,
    };
  }

  if (
    [10, 200].includes(responseCode)
    || responseMessage.includes("permission")
    || responseMessage.includes("not authorized")
  ) {
    return {
      status: "destination_page_permission_missing",
      statusCode: 403,
    };
  }

  if (
    responseCode === 803
    || responseMessage.includes("unsupported get request")
    || responseMessage.includes("object does not exist")
  ) {
    return {
      status: "destination_account_missing",
      statusCode: 400,
    };
  }

  return {
    status: error?.status || "destination_publish_failed",
    statusCode: error?.statusCode || 502,
  };
}

function createActionableMetaPublishError(error) {
  if (!(error instanceof DestinationPublishError)) {
    return error;
  }

  const classification = classifyMetaPublishFailure(error);

  return new DestinationPublishError(error.message, {
    response_json: error.response_json,
    retryable: error.retryable,
    status: classification.status,
    statusCode: classification.statusCode,
  });
}

async function verifyFacebookDestination(runtimeConnection, accessToken) {
  return getGraphJson(runtimeConnection, `${runtimeConnection.accountId}`, {
    access_token: accessToken,
    fields: "id,name",
  });
}

async function verifyInstagramDestination(runtimeConnection, accessToken) {
  return getGraphJson(runtimeConnection, `${runtimeConnection.accountId}`, {
    access_token: accessToken,
    fields: "id,username,account_type",
  });
}

async function executeFacebookPublish(runtimeConnection, accessToken, destination, payload) {
  const targetId = runtimeConnection.accountId;
  const canonicalUrlResolution = resolveMetaPublishUrl(payload.canonical_url);
  const mediaUrlResolution = resolveMetaPublishUrl(payload.mediaUrl);
  const verifiedDestination = await verifyFacebookDestination(runtimeConnection, accessToken);
  const normalizedPayload = {
    ...payload,
    canonical_url: canonicalUrlResolution.normalizedUrl || trimText(payload.canonical_url) || null,
    mediaUrl: mediaUrlResolution.issue ? null : mediaUrlResolution.normalizedUrl,
  };
  const linkUrl = canonicalUrlResolution.issue ? null : canonicalUrlResolution.normalizedUrl;
  const message = buildFacebookMessage(normalizedPayload);

  if (normalizedPayload.mediaUrl && destination.kind === "FACEBOOK_PAGE") {
    try {
      const photoPayload = await postGraphForm(runtimeConnection, `${targetId}/photos`, {
        access_token: accessToken,
        caption: message,
        published: "true",
        url: normalizedPayload.mediaUrl,
      });

      return {
        published_at: new Date(),
        remote_id: photoPayload.post_id || photoPayload.id || null,
        response_json: {
          channel: "facebook_photo",
          targetId: verifiedDestination?.id || targetId,
          ...photoPayload,
        },
      };
    } catch (error) {
      if (!(error instanceof DestinationPublishError)) {
        throw error;
      }

      if (isMetaTokenExpiredError(error)) {
        throw error;
      }

      const feedPayload = await postGraphForm(
        runtimeConnection,
        `${targetId}/feed`,
        buildFacebookFeedPostValues({
          accessToken,
          link: linkUrl,
          message,
        }),
      );

      return {
        published_at: new Date(),
        remote_id: feedPayload.id || null,
        response_json: {
          channel: "facebook_feed_fallback",
          fallbackReason: error.message,
          fallbackResponse: feedPayload,
          photoError: error.response_json,
          targetId: verifiedDestination?.id || targetId,
        },
      };
    }
  }

  const feedPayload = await postGraphForm(
    runtimeConnection,
    `${targetId}/feed`,
    buildFacebookFeedPostValues({
      accessToken,
      link: linkUrl,
      message,
    }),
  );

  return {
    published_at: new Date(),
    remote_id: feedPayload.id || null,
    response_json: {
      channel: "facebook_feed",
      targetId: verifiedDestination?.id || targetId,
      ...feedPayload,
    },
  };
}

/**
 * Builds the bounded Facebook post body from the resolved NewsPub social payload.
 */
export function buildFacebookMessage(payload) {
  const bodySections = extractFacebookBodySections(payload);
  const summarySections = splitBodySections(payload.summary);
  const contentSections = bodySections.length ? bodySections : summarySections;

  return joinPublishText([
    formatFacebookTitle(payload.title),
    ...contentSections,
  ]);
}

function buildInstagramCaption(payload) {
  return joinPublishText(
    [
      payload.caption || payload.body || payload.summary || payload.title,
      payload.source_attribution || payload.sourceReference,
      payload.canonical_url || payload.extraLinkUrl,
      payload.hashtags,
    ],
    2200,
  );
}

function normalizeMetaAccountType(value) {
  return trimText(value).toUpperCase();
}

async function publishFacebookDestination(destination, payload, prisma) {
  if (destination.kind === "FACEBOOK_PROFILE") {
    throw new DestinationPublishError(
      "Facebook profile destinations cannot be published automatically. Use a Facebook page destination instead.",
      {
        response_json: {
          error: "facebook_profile_not_supported",
        },
        retryable: false,
        status: "facebook_profile_not_supported",
        statusCode: 400,
      },
    );
  }

  const runtimeConnection = resolveDestinationRuntimeConnection(destination);
  const targetId = runtimeConnection.accountId;

  if (!targetId) {
    throw new DestinationPublishError("Facebook destinations require an external account or page ID.", {
      response_json: {
        error: "destination_account_missing",
      },
      retryable: false,
      status: "destination_account_missing",
      statusCode: 400,
    });
  }

  let credential = await resolveFacebookPublishCredential(destination, prisma);

  try {
    return await executeFacebookPublish(
      {
        ...runtimeConnection,
        accessToken: credential.accessToken,
        accountId: credential.accountId || runtimeConnection.accountId,
        graphApiBaseUrl: credential.graphApiBaseUrl || runtimeConnection.graphApiBaseUrl,
      },
      credential.accessToken,
      destination,
      payload,
    );
  } catch (error) {
    if (!isMetaTokenExpiredError(error)) {
      throw createActionableMetaPublishError(error);
    }

    credential = await refreshFacebookPublishCredential(destination, prisma);

    try {
      return await executeFacebookPublish(
        {
          ...runtimeConnection,
          accessToken: credential.accessToken,
          accountId: credential.accountId || runtimeConnection.accountId,
          graphApiBaseUrl: credential.graphApiBaseUrl || runtimeConnection.graphApiBaseUrl,
        },
        credential.accessToken,
        destination,
        payload,
      );
    } catch (retryError) {
      throw createActionableMetaPublishError(retryError);
    }
  }
}

async function publishInstagramDestination(destination, payload) {
  if (destination.kind === "INSTAGRAM_PERSONAL") {
    throw new DestinationPublishError(
      "Instagram personal destinations cannot be published automatically. Use a business destination instead.",
      {
        response_json: {
          error: "instagram_personal_not_supported",
        },
        retryable: false,
        status: "instagram_personal_not_supported",
        statusCode: 400,
      },
    );
  }

  if (!payload.mediaUrl) {
    throw new DestinationPublishError(
      "Instagram publication requires a media asset URL. Attach a usable image before retrying.",
      {
        response_json: {
          error: "instagram_media_required",
        },
        retryable: false,
        status: "instagram_media_required",
        statusCode: 400,
      },
    );
  }

  const mediaUrlResolution = resolveMetaPublishUrl(payload.mediaUrl);

  if (mediaUrlResolution.issue) {
    throw createMetaPublicUrlError("Instagram", "media URL", mediaUrlResolution);
  }

  const runtimeConnection = resolveDestinationRuntimeConnection(destination);
  const targetId = runtimeConnection.accountId;

  if (!targetId) {
    throw new DestinationPublishError("Instagram destinations require an external account ID.", {
      response_json: {
        error: "destination_account_missing",
      },
      retryable: false,
      status: "destination_account_missing",
      statusCode: 400,
    });
  }

  const accessToken = requireRuntimeAccessToken(runtimeConnection);
  const verifiedDestination = await verifyInstagramDestination(runtimeConnection, accessToken);
  const accountType = normalizeMetaAccountType(verifiedDestination?.account_type);

  if (!["BUSINESS", "CREATOR", "MEDIA_CREATOR"].includes(accountType)) {
    throw new DestinationPublishError(
      "Instagram publishing requires a Meta-verified professional account. Connect a business or creator account before retrying.",
      {
        response_json: {
          accountType: verifiedDestination?.account_type || null,
          error: "instagram_professional_account_required",
        },
        retryable: false,
        status: "instagram_professional_account_required",
        statusCode: 400,
      },
    );
  }

  const caption = buildInstagramCaption(payload);
  const creationPayload = await postGraphForm(runtimeConnection, `${targetId}/media`, {
    access_token: accessToken,
    caption,
    image_url: mediaUrlResolution.normalizedUrl,
  });
  const publishPayload = await postGraphForm(runtimeConnection, `${targetId}/media_publish`, {
    access_token: accessToken,
    creation_id: creationPayload.id,
  });

  return {
    published_at: new Date(),
    remote_id: publishPayload.id || creationPayload.id || null,
    response_json: {
      channel: "instagram_media_publish",
      creation: creationPayload,
      publish: publishPayload,
      targetId: verifiedDestination?.id || targetId,
    },
  };
}

/**
 * Publishes a prepared payload to the configured external destination adapter.
 *
 * Validation happens first so unsupported platform or destination combinations
 * fail before any outbound Meta requests are attempted.
 */
export async function publishExternalDestination({ destination, payload, prisma = null }) {
  const validationIssues = getDestinationValidationIssues(destination);

  if (validationIssues.length) {
    throw new DestinationPublishError(validationIssues[0].message, {
      response_json: {
        error: "destination_configuration_invalid",
        issues: validationIssues,
      },
      retryable: false,
      status: "destination_configuration_invalid",
      statusCode: 400,
    });
  }

  if (destination?.platform === "FACEBOOK") {
    return publishFacebookDestination(destination, payload, prisma);
  }

  if (destination?.platform === "INSTAGRAM") {
    return publishInstagramDestination(destination, payload);
  }

  throw new DestinationPublishError(`Unsupported external destination platform "${destination?.platform || "unknown"}".`, {
    response_json: {
      error: "destination_platform_unsupported",
      platform: destination?.platform || null,
    },
    retryable: false,
    status: "destination_platform_unsupported",
    statusCode: 400,
  });
}
