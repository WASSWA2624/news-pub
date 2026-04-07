function formatDateLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTimeLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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

function formatDisplayText(value, fallback = "") {
  const resolvedValue = decodeHtmlEntities(typeof value === "string" ? value : "");

  return resolvedValue.trim() || fallback;
}

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

function estimateReadingMinutes(value) {
  const words = stripHtmlTags(value).split(" ").filter(Boolean).length;

  return Math.max(1, Math.round(words / 190));
}

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

function getMediaIdentity(media) {
  return `${media?.kind || "unknown"}:${media?.embedUrl || media?.url || media?.sourceUrl || ""}`;
}

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
 * Shared formatting and media helpers used by the public page surfaces.
 */
export const publicPageUtils = Object.freeze({
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
