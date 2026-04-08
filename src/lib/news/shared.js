/**
 * Shared NewsPub primitives used across ingest, review, publishing, and admin workflows.
 */

import crypto from "node:crypto";

import { defaultLocale } from "@/features/i18n/config";
import { buildHtmlFromStructuredArticle, buildMarkdownFromStructuredArticle } from "@/lib/markdown";

/**
 * Base error type for NewsPub runtime, API, and workflow failures.
 */
export class NewsPubError extends Error {
  constructor(message, { status = "news_pub_error", statusCode = 500 } = {}) {
    super(message);
    this.name = "NewsPubError";
    this.status = status;
    this.statusCode = statusCode;
  }
}

/**
 * Trims a string-like value into the normalized NewsPub text shape.
 */
export function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Collapses display text into one trimmed, whitespace-normalized string.
 */
export function normalizeDisplayText(value) {
  return trimText(value).replace(/\s+/g, " ");
}

/**
 * Normalizes text into the lowercase, accent-insensitive search form used by NewsPub matching.
 */
export function normalizeSearchText(value) {
  return normalizeDisplayText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Creates a URL-safe slug for NewsPub stories, categories, and related records.
 */
export function createSlug(value, fallback = "story") {
  const normalized = normalizeSearchText(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

/**
 * Creates a deterministic SHA-256 hash for NewsPub cache and deduplication keys.
 */
export function createContentHash(...values) {
  const hash = crypto.createHash("sha256");

  for (const value of values) {
    hash.update(normalizeDisplayText(`${value || ""}`));
    hash.update("|");
  }

  return hash.digest("hex");
}

/**
 * Returns a trimmed, order-preserving list of unique strings.
 */
export function dedupeStrings(values = []) {
  return [...new Set((values || []).map((value) => trimText(`${value}`)).filter(Boolean))];
}

/**
 * Serializes a Date instance to ISO-8601 when one is present.
 */
export function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

/**
 * Resolves the Prisma client used by NewsPub runtime helpers.
 */
export async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

/**
 * Builds pagination metadata for NewsPub admin and public listings.
 */
export function createPagination(totalItems, currentPage = 1, pageSize = 12) {
  const resolvedPageSize = Math.max(1, Number.parseInt(`${pageSize || 12}`, 10) || 12);
  const resolvedCurrentPage = Math.max(1, Number.parseInt(`${currentPage || 1}`, 10) || 1);
  const totalPages = Math.max(1, Math.ceil(totalItems / resolvedPageSize));
  const safePage = Math.min(resolvedCurrentPage, totalPages);
  const startItem = totalItems ? (safePage - 1) * resolvedPageSize + 1 : 0;
  const endItem = totalItems ? Math.min(totalItems, safePage * resolvedPageSize) : 0;

  return {
    currentPage: safePage,
    endItem,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
    pageSize: resolvedPageSize,
    startItem,
    totalItems,
    totalPages,
  };
}

/**
 * Normalizes array input into a trimmed unique string list.
 */
export function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeStrings(value);
}

/**
 * Builds the structured article payload and render artifacts used by canonical NewsPub stories.
 */
export function buildStoryStructuredArticle({
  body,
  categoryNames = [],
  sourceName,
  sourceUrl,
  summary,
  title,
}) {
  const sections = [
    {
      kind: "text",
      paragraphs: dedupeStrings((body || "").split(/\n{2,}/)),
      title: "Story",
    },
  ];

  if (categoryNames.length) {
    sections.push({
      intro: "Internal story categories assigned during review.",
      items: categoryNames.map((name) => ({
        title: name,
      })),
      kind: "list",
      title: "Categories",
    });
  }

  sections.push({
    items: [
      {
        title: sourceName || "Source",
        url: sourceUrl || null,
      },
    ],
    kind: "references",
    title: "Source Attribution",
  });

  const article = {
    excerpt: summary,
    sections,
    title,
  };

  return {
    article,
    contentHtml: buildHtmlFromStructuredArticle(article),
    contentMd: buildMarkdownFromStructuredArticle(article),
  };
}

/** Picks the most appropriate translation for a requested locale. */
export function pickTranslation(translations = [], locale = defaultLocale) {
  return (
    translations.find((entry) => entry.locale === locale)
    || translations.find((entry) => entry.locale === defaultLocale)
    || translations[0]
    || null
  );
}

/** Expands `{{key}}` placeholders using a minimal string-template contract. */
export function renderTemplateString(template, values = {}) {
  return `${template || ""}`.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) =>
    trimText(values[key]) || "",
  );
}
