/**
 * Media ingestion helpers for NewsPub remote image discovery, validation, and storage preparation.
 */

import { sanitizeMediaUrl } from "@/lib/security";

const imageProxyPath = "/api/media/proxy";

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeImageDimension(value, fallback) {
  const parsedValue = Number.parseInt(`${value ?? ""}`.trim(), 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function escapeSvgText(value) {
  return trimText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createPreviewLabel({ alt, caption }) {
  const label = trimText(alt) || trimText(caption);

  return (label || "Generated image preview").slice(0, 90);
}

function createPreviewDescription({ caption, sourceUrl }) {
  const description = trimText(caption);

  if (description) {
    return description.slice(0, 150);
  }

  if (trimText(sourceUrl)) {
    return "The original source could not be loaded here, so a placeholder preview is shown instead.";
  }

  return "The original image could not be loaded, so a placeholder preview is shown instead.";
}

function normalizeHostname(value) {
  const normalizedValue = trimText(value);

  if (!normalizedValue) {
    return "";
  }

  try {
    return new URL(normalizedValue).hostname.toLowerCase();
  } catch {
    return normalizedValue
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim()
      .toLowerCase();
  }
}

function getDirectImageHostnames() {
  return new Set(
    [
      "flagcdn.com",
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.S3_MEDIA_BASE_URL,
      ...`${process.env.NEXT_IMAGE_REMOTE_HOSTS || ""}`.split(","),
    ]
      .map(normalizeHostname)
      .filter(Boolean),
  );
}

function isSameOriginOrApprovedRemoteImageUrl(url) {
  try {
    const parsedUrl = new URL(url);

    return getDirectImageHostnames().has(parsedUrl.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function createEditorialImageProxyUrl(url) {
  const safeUrl = sanitizeMediaUrl(url);

  if (!safeUrl || safeUrl.startsWith("/") || safeUrl.startsWith("data:image/")) {
    return safeUrl || "";
  }

  return `${imageProxyPath}?url=${encodeURIComponent(safeUrl)}`;
}
/**
 * Returns whether a URL points to one of NewsPub's reserved fixture images.
 */

export function isReservedFixtureImageUrl(url) {
  const normalizedUrl = trimText(url);

  if (!normalizedUrl) {
    return false;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);

    return parsedUrl.protocol.startsWith("http") && /\.example$/i.test(parsedUrl.hostname);
  } catch {
    return false;
  }
}
/**
 * Creates an inline placeholder image data URL for NewsPub media fallbacks.
 */

export function createImagePlaceholderDataUrl(options = {}) {
  const width = normalizeImageDimension(options.width, 1400);
  const height = normalizeImageDimension(options.height, 900);
  const label = escapeSvgText(createPreviewLabel(options));
  const description = escapeSvgText(createPreviewDescription(options));
  let sourceHost = "";

  try {
    sourceHost = options.sourceUrl ? new URL(options.sourceUrl).hostname : "";
  } catch {
    sourceHost = "";
  }

  const safeSourceHost = escapeSvgText(sourceHost);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f2d3f" />
          <stop offset="50%" stop-color="#17697a" />
          <stop offset="100%" stop-color="#d08a42" />
        </linearGradient>
        <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.24)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.08)" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" rx="38" ry="38" />
      <g opacity="0.22">
        <circle cx="${Math.round(width * 0.84)}" cy="${Math.round(height * 0.2)}" r="${Math.round(width * 0.14)}" fill="#ffffff" />
        <circle cx="${Math.round(width * 0.12)}" cy="${Math.round(height * 0.78)}" r="${Math.round(width * 0.1)}" fill="#ffffff" />
      </g>
      <rect x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.12)}" width="${Math.round(width * 0.84)}" height="${Math.round(height * 0.76)}" fill="url(#panel)" stroke="rgba(255,255,255,0.28)" rx="30" ry="30" />
      <g fill="#ffffff">
        <text x="${Math.round(width * 0.12)}" y="${Math.round(height * 0.3)}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(width * 0.03)}" font-weight="700" letter-spacing="2">IMAGE PREVIEW</text>
        <text x="${Math.round(width * 0.12)}" y="${Math.round(height * 0.42)}" font-family="Georgia, Times New Roman, serif" font-size="${Math.round(width * 0.05)}" font-weight="700">${label}</text>
        <text x="${Math.round(width * 0.12)}" y="${Math.round(height * 0.54)}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(width * 0.023)}">${description}</text>
        ${safeSourceHost ? `<text x="${Math.round(width * 0.12)}" y="${Math.round(height * 0.68)}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(width * 0.02)}" opacity="0.85">Source host: ${safeSourceHost}</text>` : ""}
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
/**
 * Returns the safest renderable image URL for a NewsPub media reference.
 */

export function getRenderableImageUrl(url, options = {}) {
  const normalizedUrl = sanitizeMediaUrl(url);

  if (!normalizedUrl) {
    return "";
  }

  if (isReservedFixtureImageUrl(normalizedUrl)) {
    return createImagePlaceholderDataUrl({
      ...options,
      sourceUrl: normalizedUrl,
    });
  }

  if (normalizedUrl.startsWith("/") || normalizedUrl.startsWith("data:image/")) {
    return normalizedUrl;
  }

  return isSameOriginOrApprovedRemoteImageUrl(normalizedUrl)
    ? normalizedUrl
    : createEditorialImageProxyUrl(normalizedUrl);
}

function extractHtmlAttribute(tag, attributeName) {
  const pattern = new RegExp(`${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = `${tag || ""}`.match(pattern);

  return trimText(match?.[1] || match?.[2] || match?.[3] || "");
}

function resolveRemoteImageCandidate(candidateUrl, pageUrl) {
  const normalizedCandidate = trimText(candidateUrl);

  if (!normalizedCandidate) {
    return "";
  }

  try {
    return sanitizeMediaUrl(new URL(normalizedCandidate, pageUrl).toString()) || "";
  } catch {
    return sanitizeMediaUrl(normalizedCandidate) || "";
  }
}

function appendUniqueImageCandidate(target, candidateUrl, pageUrl) {
  const resolvedCandidate = resolveRemoteImageCandidate(candidateUrl, pageUrl);

  if (!resolvedCandidate || target.includes(resolvedCandidate)) {
    return target;
  }

  target.push(resolvedCandidate);

  return target;
}

function extractImageCandidatesFromMetaTags(html, pageUrl) {
  const primaryCandidates = [];
  const secondaryCandidates = [];
  const metaTags = `${html || ""}`.match(/<meta\b[^>]*>/gi) || [];
  const linkTags = `${html || ""}`.match(/<link\b[^>]*>/gi) || [];
  const primaryMetaKeys = new Set([
    "og:image",
    "twitter:image",
    "twitter:image:src",
  ]);
  const secondaryMetaKeys = new Set([
    "image",
    "thumbnailurl",
  ]);

  for (const tag of metaTags) {
    const key = trimText(
      extractHtmlAttribute(tag, "property")
      || extractHtmlAttribute(tag, "name")
      || extractHtmlAttribute(tag, "itemprop"),
    ).toLowerCase();
    const content = extractHtmlAttribute(tag, "content");

    if (primaryMetaKeys.has(key)) {
      appendUniqueImageCandidate(primaryCandidates, content, pageUrl);
      continue;
    }

    if (secondaryMetaKeys.has(key)) {
      appendUniqueImageCandidate(secondaryCandidates, content, pageUrl);
    }
  }

  for (const tag of linkTags) {
    const relation = trimText(extractHtmlAttribute(tag, "rel")).toLowerCase();
    const asValue = trimText(extractHtmlAttribute(tag, "as")).toLowerCase();

    if (!(asValue === "image" || relation.includes("image_src"))) {
      continue;
    }

    appendUniqueImageCandidate(secondaryCandidates, extractHtmlAttribute(tag, "href"), pageUrl);

    const imageSrcSet = extractHtmlAttribute(tag, "imagesrcset") || extractHtmlAttribute(tag, "srcset");
    const firstSrcSetCandidate = trimText(imageSrcSet.split(",")[0]?.split(/\s+/)[0] || "");

    appendUniqueImageCandidate(secondaryCandidates, firstSrcSetCandidate, pageUrl);
  }

  return [...primaryCandidates, ...secondaryCandidates];
}

function collectJsonLdImageCandidates(node, pageUrl, candidates = []) {
  if (!node) {
    return candidates;
  }

  if (typeof node === "string") {
    appendUniqueImageCandidate(candidates, node, pageUrl);
    return candidates;
  }

  if (Array.isArray(node)) {
    for (const entry of node) {
      collectJsonLdImageCandidates(entry, pageUrl, candidates);
    }

    return candidates;
  }

  if (typeof node !== "object") {
    return candidates;
  }

  if (typeof node.url === "string") {
    appendUniqueImageCandidate(candidates, node.url, pageUrl);
  }

  if (node.image !== undefined) {
    collectJsonLdImageCandidates(node.image, pageUrl, candidates);
  }

  if (node.thumbnailUrl !== undefined) {
    collectJsonLdImageCandidates(node.thumbnailUrl, pageUrl, candidates);
  }

  return candidates;
}

function extractImageCandidatesFromJsonLd(html, pageUrl) {
  const candidates = [];
  const scriptMatches = `${html || ""}`.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of scriptMatches) {
    const scriptContent = trimText(match?.[1] || "");

    if (!scriptContent) {
      continue;
    }

    try {
      collectJsonLdImageCandidates(JSON.parse(scriptContent), pageUrl, candidates);
    } catch {
      continue;
    }
  }

  return candidates;
}
/**
 * Extracts the best remote image URL candidate from a block of HTML.
 */

export function extractRemoteImageUrlFromHtml(html, pageUrl = "") {
  const page = trimText(pageUrl);

  if (!trimText(html) || !page) {
    return "";
  }

  const candidates = [
    ...extractImageCandidatesFromMetaTags(html, page),
    ...extractImageCandidatesFromJsonLd(html, page),
  ];

  return candidates[0] || "";
}

/**
 * Validates a remote media URL without downloading the full asset so publish
 * workflows can safely decide whether a destination should use or hold media.
 */
export async function validateRemoteMediaUrl(url, options = {}) {
  const safeUrl = sanitizeMediaUrl(url);

  if (!safeUrl) {
    return {
      errorCode: "media_url_invalid",
      message: "The media URL is missing or invalid.",
      ok: false,
      url: null,
    };
  }

  if (safeUrl.startsWith("data:image/")) {
    return {
      contentLength: null,
      mimeType: "image/data-url",
      ok: true,
      url: safeUrl,
    };
  }

  const maxBytes = Number.isFinite(options.maxBytes) ? Math.max(1, Math.trunc(options.maxBytes)) : 5 * 1024 * 1024;
  const requestHeaders = {
    accept: "image/*,*/*;q=0.8",
    "user-agent": "NewsPub/1.0 (+media-validation)",
  };
  const timeoutSignal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(options.timeoutMs || 8000)
      : undefined;

  async function inspectResponse(response) {
    const mimeType = trimText(response.headers.get("content-type") || "").toLowerCase();
    const contentLength = Number.parseInt(response.headers.get("content-length") || "", 10);

    if (!response.ok) {
      return {
        errorCode: "media_unreachable",
        message: `The media URL returned ${response.status}.`,
        ok: false,
        statusCode: response.status,
        url: safeUrl,
      };
    }

    if (mimeType && !mimeType.startsWith("image/")) {
      return {
        contentLength: Number.isFinite(contentLength) ? contentLength : null,
        errorCode: "media_type_invalid",
        message: `Expected an image response but received "${mimeType}".`,
        mimeType,
        ok: false,
        url: safeUrl,
      };
    }

    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return {
        contentLength,
        errorCode: "media_too_large",
        message: `The media file exceeds the ${maxBytes}-byte limit.`,
        mimeType: mimeType || null,
        ok: false,
        url: safeUrl,
      };
    }

    return {
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
      mimeType: mimeType || null,
      ok: true,
      statusCode: response.status,
      url: safeUrl,
    };
  }

  try {
    const headResponse = await fetch(safeUrl, {
      headers: requestHeaders,
      method: "HEAD",
      next: {
        revalidate: 0,
      },
      redirect: "follow",
      signal: options.signal || timeoutSignal,
    });
    const inspectedHead = await inspectResponse(headResponse);

    if (inspectedHead.ok || inspectedHead.errorCode === "media_type_invalid" || inspectedHead.errorCode === "media_too_large") {
      return inspectedHead;
    }
  } catch {
    // Some providers reject HEAD requests. Fall back to a small ranged GET.
  }

  try {
    const getResponse = await fetch(safeUrl, {
      headers: {
        ...requestHeaders,
        range: "bytes=0-0",
      },
      method: "GET",
      next: {
        revalidate: 0,
      },
      redirect: "follow",
      signal: options.signal || timeoutSignal,
    });

    return inspectResponse(getResponse);
  } catch {
    return {
      errorCode: "media_unreachable",
      message: "The media URL could not be reached.",
      ok: false,
      url: safeUrl,
    };
  }
}
/**
 * Discovers the best remote image URL for a NewsPub source page.
 */

export async function discoverRemoteImageUrl(pageUrl, options = {}) {
  const safePageUrl = sanitizeMediaUrl(pageUrl);

  if (!safePageUrl) {
    return "";
  }

  const timeoutSignal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(options.timeoutMs || 8000)
      : undefined;

  try {
    const response = await fetch(safePageUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "NewsPub/1.0 (+image-discovery)",
      },
      next: {
        revalidate: 0,
      },
      redirect: "follow",
      signal: options.signal || timeoutSignal,
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();

    return extractRemoteImageUrlFromHtml(html, safePageUrl);
  } catch {
    return "";
  }
}
