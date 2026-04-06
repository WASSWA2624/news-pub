import { sanitizeMediaUrl } from "@/lib/security";

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

  return normalizedUrl;
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
