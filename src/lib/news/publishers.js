import { resolveDestinationRuntimeConnection } from "@/lib/news/destination-runtime";
import { NewsPubError, trimText } from "@/lib/news/shared";
import { getDestinationValidationIssues } from "@/lib/validation/configuration";

const defaultGraphApiBaseUrl = "https://graph.facebook.com/v25.0";

/**
 * Outbound destination publishers for Facebook and Instagram.
 *
 * The adapters keep platform quirks isolated from the main NewsPub workflow so
 * publish history, retries, and audit logging can stay consistent.
 */
export class DestinationPublishError extends NewsPubError {
  constructor(
    message,
    {
      responseJson = null,
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
    this.responseJson = responseJson;
    this.retryable = retryable;
  }
}

function normalizeBaseUrl(value = defaultGraphApiBaseUrl) {
  return `${trimText(value).replace(/\/+$/, "")}/`;
}

function joinPublishText(parts, maxLength = 2200) {
  return parts
    .map((part) => trimText(part))
    .filter(Boolean)
    .join("\n\n")
    .slice(0, maxLength);
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
  const baseUrl = normalizeBaseUrl(runtimeConnection?.graphApiBaseUrl || defaultGraphApiBaseUrl);
  const url = new URL(path.replace(/^\/+/, ""), baseUrl);

  Object.entries(values || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, `${value}`);
  });

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    method: "GET",
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok || payload?.error) {
    throw new DestinationPublishError(
      payload?.error?.message || `Destination publish failed with status ${response.status}.`,
      {
        responseJson: payload,
        retryable: isRetryableGraphFailure(response, payload),
        status: "destination_publish_failed",
        statusCode: response.status || 502,
      },
    );
  }

  return payload || {};
}

async function postGraphForm(runtimeConnection, path, values) {
  const baseUrl = normalizeBaseUrl(runtimeConnection?.graphApiBaseUrl || defaultGraphApiBaseUrl);
  const body = new URLSearchParams();

  Object.entries(values || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    body.set(key, `${value}`);
  });

  const response = await fetch(new URL(path.replace(/^\/+/, ""), baseUrl), {
    body,
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    method: "POST",
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok || payload?.error) {
    throw new DestinationPublishError(
      payload?.error?.message || `Destination publish failed with status ${response.status}.`,
      {
        responseJson: payload,
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
      responseJson: {
        error: "destination_token_missing",
      },
      retryable: false,
      status: "destination_token_missing",
      statusCode: 400,
    });
  }

  return runtimeConnection.accessToken;
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

function buildFacebookMessage(payload) {
  return joinPublishText([
    payload.title,
    payload.summary,
    payload.canonicalUrl,
    payload.sourceReference,
  ]);
}

function buildInstagramCaption(payload) {
  return joinPublishText(
    [
      payload.title,
      payload.summary,
      payload.sourceReference,
      payload.canonicalUrl,
      payload.hashtags,
    ],
    2200,
  );
}

function normalizeMetaAccountType(value) {
  return trimText(value).toUpperCase();
}

async function publishFacebookDestination(destination, payload) {
  if (destination.kind === "FACEBOOK_PROFILE") {
    throw new DestinationPublishError(
      "Facebook profile destinations cannot be published automatically. Use a Facebook page destination instead.",
      {
        responseJson: {
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
      responseJson: {
        error: "destination_account_missing",
      },
      retryable: false,
      status: "destination_account_missing",
      statusCode: 400,
    });
  }

  const accessToken = requireRuntimeAccessToken(runtimeConnection);
  const verifiedDestination = await verifyFacebookDestination(runtimeConnection, accessToken);
  const message = buildFacebookMessage(payload);

  if (payload.mediaUrl && destination.kind === "FACEBOOK_PAGE") {
    try {
      const photoPayload = await postGraphForm(runtimeConnection, `${targetId}/photos`, {
        access_token: accessToken,
        caption: message,
        published: "true",
        url: payload.mediaUrl,
      });

      return {
        publishedAt: new Date(),
        remoteId: photoPayload.post_id || photoPayload.id || null,
        responseJson: {
          channel: "facebook_photo",
          targetId: verifiedDestination?.id || targetId,
          ...photoPayload,
        },
      };
    } catch (error) {
      if (!(error instanceof DestinationPublishError) || !payload.canonicalUrl) {
        throw error;
      }

      const feedPayload = await postGraphForm(runtimeConnection, `${targetId}/feed`, {
        access_token: accessToken,
        link: payload.canonicalUrl,
        message,
      });

      return {
        publishedAt: new Date(),
        remoteId: feedPayload.id || null,
        responseJson: {
          channel: "facebook_feed_fallback",
          fallbackReason: error.message,
          fallbackResponse: feedPayload,
          photoError: error.responseJson,
          targetId: verifiedDestination?.id || targetId,
        },
      };
    }
  }

  const feedPayload = await postGraphForm(runtimeConnection, `${targetId}/feed`, {
    access_token: accessToken,
    link: payload.canonicalUrl,
    message,
  });

  return {
    publishedAt: new Date(),
    remoteId: feedPayload.id || null,
    responseJson: {
      channel: "facebook_feed",
      targetId: verifiedDestination?.id || targetId,
      ...feedPayload,
    },
  };
}

async function publishInstagramDestination(destination, payload) {
  if (destination.kind === "INSTAGRAM_PERSONAL") {
    throw new DestinationPublishError(
      "Instagram personal destinations cannot be published automatically. Use a business destination instead.",
      {
        responseJson: {
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
        responseJson: {
          error: "instagram_media_required",
        },
        retryable: false,
        status: "instagram_media_required",
        statusCode: 400,
      },
    );
  }

  const runtimeConnection = resolveDestinationRuntimeConnection(destination);
  const targetId = runtimeConnection.accountId;

  if (!targetId) {
    throw new DestinationPublishError("Instagram destinations require an external account ID.", {
      responseJson: {
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
        responseJson: {
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
    image_url: payload.mediaUrl,
  });
  const publishPayload = await postGraphForm(runtimeConnection, `${targetId}/media_publish`, {
    access_token: accessToken,
    creation_id: creationPayload.id,
  });

  return {
    publishedAt: new Date(),
    remoteId: publishPayload.id || creationPayload.id || null,
    responseJson: {
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
export async function publishExternalDestination({ destination, payload }) {
  const validationIssues = getDestinationValidationIssues(destination);

  if (validationIssues.length) {
    throw new DestinationPublishError(validationIssues[0].message, {
      responseJson: {
        error: "destination_configuration_invalid",
        issues: validationIssues,
      },
      retryable: false,
      status: "destination_configuration_invalid",
      statusCode: 400,
    });
  }

  if (destination?.platform === "FACEBOOK") {
    return publishFacebookDestination(destination, payload);
  }

  if (destination?.platform === "INSTAGRAM") {
    return publishInstagramDestination(destination, payload);
  }

  throw new DestinationPublishError(`Unsupported external destination platform "${destination?.platform || "unknown"}".`, {
    responseJson: {
      error: "destination_platform_unsupported",
      platform: destination?.platform || null,
    },
    retryable: false,
    status: "destination_platform_unsupported",
    statusCode: 400,
  });
}
