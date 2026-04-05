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
