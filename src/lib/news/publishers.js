import { decryptSecretValue } from "@/lib/security/secrets";
import { NewsPubError, trimText } from "@/lib/news/shared";

const defaultGraphApiBaseUrl = "https://graph.facebook.com/v22.0";

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

function getDestinationAccessToken(destination) {
  const token = decryptSecretValue({
    ciphertext: destination?.encryptedTokenCiphertext,
    iv: destination?.encryptedTokenIv,
    tag: destination?.encryptedTokenTag,
  });

  if (!token) {
    throw new DestinationPublishError("Destination token is missing or unreadable.", {
      responseJson: {
        error: "destination_token_missing",
      },
      retryable: false,
      status: "destination_token_missing",
      statusCode: 400,
    });
  }

  return token;
}

function getDestinationExternalId(destination, settingsKeys = []) {
  const settings = destination?.settingsJson && typeof destination.settingsJson === "object"
    ? destination.settingsJson
    : {};
  const externalId = trimText(destination?.externalAccountId);

  if (externalId) {
    return externalId;
  }

  for (const key of settingsKeys) {
    const value = trimText(settings?.[key]);

    if (value) {
      return value;
    }
  }

  return null;
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

async function postGraphForm(destination, path, values) {
  const baseUrl = normalizeBaseUrl(destination?.settingsJson?.graphApiBaseUrl || defaultGraphApiBaseUrl);
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

async function publishFacebookDestination(destination, payload) {
  const targetId = getDestinationExternalId(destination, ["pageId", "profileId"]);

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

  const accessToken = getDestinationAccessToken(destination);
  const message = buildFacebookMessage(payload);

  if (payload.mediaUrl && destination.kind === "FACEBOOK_PAGE") {
    try {
      const photoPayload = await postGraphForm(destination, `${targetId}/photos`, {
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
          ...photoPayload,
        },
      };
    } catch (error) {
      if (!(error instanceof DestinationPublishError) || !payload.canonicalUrl) {
        throw error;
      }

      const feedPayload = await postGraphForm(destination, `${targetId}/feed`, {
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
        },
      };
    }
  }

  const feedPayload = await postGraphForm(destination, `${targetId}/feed`, {
    access_token: accessToken,
    link: payload.canonicalUrl,
    message,
  });

  return {
    publishedAt: new Date(),
    remoteId: feedPayload.id || null,
    responseJson: {
      channel: "facebook_feed",
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

  const targetId = getDestinationExternalId(destination, ["instagramUserId", "pageId"]);

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

  const accessToken = getDestinationAccessToken(destination);
  const caption = buildInstagramCaption(payload);
  const creationPayload = await postGraphForm(destination, `${targetId}/media`, {
    access_token: accessToken,
    caption,
    image_url: payload.mediaUrl,
  });
  const publishPayload = await postGraphForm(destination, `${targetId}/media_publish`, {
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
    },
  };
}

/** Publishes a prepared payload to the configured external destination adapter. */
export async function publishExternalDestination({ destination, payload }) {
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
