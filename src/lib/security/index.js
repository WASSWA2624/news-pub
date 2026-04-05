const safeAbsoluteProtocols = new Set(["http:", "https:"]);
const safeHrefProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);
const blockedHtmlTags = Object.freeze([
  "base",
  "button",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "select",
  "style",
  "textarea",
]);

function normalizeUrlText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isSafeRootRelativeUrl(value) {
  return value.startsWith("/") && !value.startsWith("//");
}

function escapeHtmlAttribute(value) {
  return `${value}`
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeAbsoluteUrl(value, allowedProtocols) {
  const normalizedValue = normalizeUrlText(value);

  if (!normalizedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalizedValue);

    if (!allowedProtocols.has(parsedUrl.protocol)) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return JSON.parse(JSON.stringify(value));
}

function sanitizeStructuredSection(section) {
  if (!section || typeof section !== "object") {
    return section;
  }

  const nextSection = {
    ...section,
  };

  if (Array.isArray(section.images)) {
    nextSection.images = section.images
      .map((image) => {
        const safeUrl = sanitizeMediaUrl(image?.url || image?.publicUrl || image?.sourceUrl);

        if (!safeUrl) {
          return null;
        }

        return {
          ...image,
          publicUrl: image?.publicUrl ? sanitizeMediaUrl(image.publicUrl) : image?.publicUrl,
          sourceUrl: image?.sourceUrl ? sanitizeMediaUrl(image.sourceUrl) : image?.sourceUrl,
          url: safeUrl,
        };
      })
      .filter(Boolean);
  }

  if (section.kind === "manuals" || section.kind === "references") {
    nextSection.items = Array.isArray(section.items)
      ? section.items.map((item) => ({
          ...item,
          url: sanitizeExternalUrl(item?.url),
        }))
      : [];
  }

  return nextSection;
}

export function sanitizeExternalUrl(value) {
  return normalizeAbsoluteUrl(value, safeAbsoluteProtocols);
}

export function sanitizeHrefUrl(value) {
  const normalizedValue = normalizeUrlText(value);

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.startsWith("#")) {
    return normalizedValue;
  }

  if (isSafeRootRelativeUrl(normalizedValue)) {
    return normalizedValue;
  }

  return normalizeAbsoluteUrl(normalizedValue, safeHrefProtocols);
}

export function sanitizeMediaUrl(value) {
  const normalizedValue = normalizeUrlText(value);

  if (!normalizedValue) {
    return null;
  }

  if (isSafeRootRelativeUrl(normalizedValue)) {
    return normalizedValue;
  }

  if (/^data:image\/[a-z0-9.+-]+(?:;[^,]+)?,/i.test(normalizedValue)) {
    return normalizedValue;
  }

  return sanitizeExternalUrl(normalizedValue);
}

export function sanitizeHtmlFragment(value) {
  if (typeof value !== "string") {
    return "";
  }

  let sanitizedValue = value.replace(/<!--[\s\S]*?-->/g, "");

  for (const tagName of blockedHtmlTags) {
    const pairedTagPattern = new RegExp(
      `<\\s*${tagName}\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*${tagName}\\s*>`,
      "gi",
    );
    const standaloneTagPattern = new RegExp(`<\\s*${tagName}\\b[^>]*\\/?>`, "gi");

    sanitizedValue = sanitizedValue
      .replace(pairedTagPattern, "")
      .replace(standaloneTagPattern, "");
  }

  sanitizedValue = sanitizedValue
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s+(href|src)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (match, attributeName, _quotedValue, doubleQuotedValue, singleQuotedValue, bareValue) => {
        const rawValue = doubleQuotedValue ?? singleQuotedValue ?? bareValue ?? "";
        const safeValue =
          attributeName.toLowerCase() === "src"
            ? sanitizeMediaUrl(rawValue)
            : sanitizeHrefUrl(rawValue);

        return safeValue ? ` ${attributeName}="${escapeHtmlAttribute(safeValue)}"` : "";
      },
    );

  return sanitizedValue.trim();
}

export function sanitizeStructuredContentJson(value) {
  const clonedValue = cloneJsonValue(value);

  if (!clonedValue || typeof clonedValue !== "object") {
    return clonedValue;
  }

  if (Array.isArray(clonedValue.sections)) {
    clonedValue.sections = clonedValue.sections.map(sanitizeStructuredSection);
  }

  return clonedValue;
}
