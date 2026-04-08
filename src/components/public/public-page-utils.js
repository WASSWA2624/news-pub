/**
 * Formats a calendar-only date for public-facing labels.
 *
 * @param {string} locale - Active locale code.
 * @param {string|Date|null} value - Date-like value to format.
 * @returns {string|null} Localized date text or `null` when the value is missing.
 */
function formatDateLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

/**
 * Formats a date-time stamp for compact story inventory rows.
 *
 * @param {string} locale - Active locale code.
 * @param {string|Date|null} value - Date-like value to format.
 * @returns {string|null} Localized date-time text or `null` when the value is missing.
 */
function formatDateTimeLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Removes HTML tags from stored rich text before the string is reused for copy-only helpers.
 *
 * @param {string} value - Potentially rich-text content.
 * @returns {string} Plain-text output with collapsed whitespace.
 */
function stripHtmlTags(value) {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

const namedHtmlEntities = Object.freeze({
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
});

/**
 * Decodes the subset of HTML entities that commonly appear in source-fed titles and summaries.
 *
 * @param {string} entity - Entity body without wrapping ampersand/semicolon characters.
 * @returns {string|null} Decoded entity value or `null` when it is unknown.
 */
function decodeHtmlEntity(entity) {
  const normalizedEntity = `${entity || ""}`.toLowerCase();

  if (namedHtmlEntities[normalizedEntity]) {
    return namedHtmlEntities[normalizedEntity];
  }

  try {
    if (normalizedEntity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalizedEntity.slice(2), 16));
    }

    if (normalizedEntity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalizedEntity.slice(1), 10));
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Normalizes HTML entity encoding so stored copy can be reused safely in UI labels.
 *
 * @param {string} value - Encoded text from stored article fields.
 * @returns {string} Decoded display text.
 */
function decodeHtmlEntities(value) {
  if (typeof value !== "string") {
    return "";
  }

  let result = value;

  for (let iteration = 0; iteration < 2; iteration += 1) {
    result = result.replace(/&(#x?[0-9a-f]+|amp|apos|gt|lt|nbsp|quot);/gi, (match, entity) => {
      const decodedValue = decodeHtmlEntity(entity);

      return decodedValue ?? match;
    });
  }

  return result;
}

/**
 * Resolves a display-safe text value while preserving intentional fallbacks.
 *
 * @param {string} value - Candidate display value.
 * @param {string} [fallback=""] - Fallback text when the candidate is blank.
 * @returns {string} Decoded, trimmed text for the UI.
 */
function formatDisplayText(value, fallback = "") {
  const resolvedValue = decodeHtmlEntities(typeof value === "string" ? value : "");

  return resolvedValue.trim() || fallback;
}

/**
 * Normalizes provider identifiers into human-readable labels for editorial surfaces.
 *
 * @param {string} value - Provider key or provider label candidate.
 * @returns {string} Human-readable provider label or an empty string.
 */
function formatProviderLabel(value) {
  const resolvedValue = formatDisplayText(value);

  if (!resolvedValue) {
    return "";
  }

  return resolvedValue
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

/**
 * Estimates a reading time from rich-text article content.
 *
 * @param {string} value - HTML or plain-text story content.
 * @returns {number} Rounded reading time in minutes with a minimum of one minute.
 */
function estimateReadingMinutes(value) {
  const words = stripHtmlTags(value).split(" ").filter(Boolean).length;

  return Math.max(1, Math.round(words / 190));
}

/**
 * Creates external share URLs for story pages.
 *
 * @param {string} title - Story title used in the share payload.
 * @param {string} url - Canonical story URL.
 * @returns {Array<{href: string, label: string}>} Share destinations that can be rendered directly in the UI.
 */
function createShareLinks(title, url) {
  const safeTitle = typeof title === "string" && title.trim() ? title.trim() : "NewsPub story";
  const safeUrl = typeof url === "string" && url.trim() ? url.trim() : "";

  if (!safeUrl) {
    return [];
  }

  const encodedTitle = encodeURIComponent(safeTitle);
  const encodedUrl = encodeURIComponent(safeUrl);

  return [
    {
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      label: "X",
    },
    {
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      label: "Facebook",
    },
    {
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
      label: "LinkedIn",
    },
    {
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      label: "WhatsApp",
    },
    {
      href: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${safeTitle}\n\n${safeUrl}`)}`,
      label: "Email",
    },
  ];
}

/**
 * Removes stored boilerplate sections that would otherwise duplicate the custom story-page chrome.
 *
 * @param {string} value - Stored rich HTML for a public story.
 * @returns {string} Trimmed HTML that keeps the article body focused on unique content.
 */
function trimStoryContentHtml(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/<article>\s*<header>[\s\S]*?<\/header>/i, "<article>")
    .replace(/<section>\s*<h2>Story<\/h2>\s*/i, "<section>")
    .replace(/<section><h2>Categories<\/h2>[\s\S]*?<\/section>/gi, "")
    .replace(/<section><h2>Source Attribution<\/h2>[\s\S]*?<\/section>/gi, "")
    .trim();
}

/**
 * Returns a stable identity string for media gallery items.
 *
 * @param {object} media - Media item from the public story model.
 * @returns {string} Stable identity string used for React keys and dedupe checks.
 */
function getMediaIdentity(media) {
  return `${media?.kind || "unknown"}:${media?.embedUrl || media?.url || media?.sourceUrl || ""}`;
}

/**
 * Picks the best compact thumbnail candidate for story cards and related-story lists.
 *
 * @param {object} item - Public story card model.
 * @returns {{alt: string, url: string}|null} Compact media metadata or `null` when no thumbnail is available.
 */
function resolveCompactStoryMedia(item) {
  const image = item.image?.url ? { ...item.image, kind: "image" } : null;
  const primaryMedia = image || item.primaryMedia || null;

  if (!primaryMedia) {
    return null;
  }

  if (primaryMedia.kind === "image" && primaryMedia.url) {
    return {
      alt: primaryMedia.alt || primaryMedia.caption || item.title,
      url: primaryMedia.url,
    };
  }

  if (primaryMedia.posterUrl) {
    return {
      alt: primaryMedia.alt || primaryMedia.title || item.title,
      url: primaryMedia.posterUrl,
    };
  }

  return null;
}

/**
 * Hides source-attribution copy that only repeats the already-visible source name or URL.
 *
 * @param {string} value - Stored attribution copy.
 * @param {{sourceName?: string, sourceUrl?: string}} [context={}] - Source values already rendered elsewhere on the page.
 * @returns {string} Distinct attribution text or an empty string when the value is redundant.
 */
function buildSourceAttributionNote(value, { sourceName = "", sourceUrl = "" } = {}) {
  const note = formatDisplayText(stripHtmlTags(value));

  if (!note) {
    return "";
  }

  const normalizedNote = note
    .toLowerCase()
    .replace(/^source:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedSourceName = formatDisplayText(sourceName).toLowerCase();
  const normalizedSourceUrl = formatDisplayText(sourceUrl).toLowerCase();
  const redundantValues = new Set(
    [
      normalizedSourceName,
      normalizedSourceUrl,
      [normalizedSourceName, normalizedSourceUrl].filter(Boolean).join(" "),
      [normalizedSourceName, normalizedSourceUrl].filter(Boolean).join(" - "),
      [normalizedSourceName, normalizedSourceUrl].filter(Boolean).join(" | "),
    ].filter(Boolean),
  );

  return redundantValues.has(normalizedNote) ? "" : note;
}

/**
 * Shared formatting and media helpers used by the public page surfaces.
 */
export const publicPageUtils = Object.freeze({
  buildSourceAttributionNote,
  createShareLinks,
  estimateReadingMinutes,
  formatDateLabel,
  formatDateTimeLabel,
  formatDisplayText,
  formatProviderLabel,
  getMediaIdentity,
  resolveCompactStoryMedia,
  trimStoryContentHtml,
});
