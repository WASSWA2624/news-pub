import { z } from "zod";

import { syncLocaleRegistryToDatabase } from "@/features/i18n/activation";
import { defaultLocale, isSupportedLocale, supportedLocales } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { sanitizeHtmlFragment, sanitizeStructuredContentJson } from "@/lib/security";

import { loadPostPublicRevalidationSnapshot, revalidatePostPublicSnapshots } from "./public-revalidation";

const EMPTY_FAQ_JSON = Object.freeze([]);

export const emptyStructuredContent = Object.freeze({
  renderArtifacts: {
    html: false,
    markdown: false,
  },
  sections: [],
});

export class LocalizedContentError extends Error {
  constructor(message, { status = "invalid_localized_content", statusCode = 400 } = {}) {
    super(message);
    this.name = "LocalizedContentError";
    this.status = status;
    this.statusCode = statusCode;
  }
}

export const savePostLocaleContentSchema = z.object({
  contentHtml: z.string().optional(),
  contentMd: z.string().optional(),
  disclaimer: z.string().trim().min(1).optional(),
  excerpt: z.string().trim().min(1).optional(),
  faqJson: z.any().optional(),
  isAutoTranslated: z.boolean().optional(),
  locale: z.string().trim().default(defaultLocale),
  postId: z.string().trim().min(1),
  structuredContentJson: z.any().optional(),
  title: z.string().trim().min(1).optional(),
});

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
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

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function toSerializableTranslation(translation) {
  return {
    contentHtml: translation.contentHtml || "",
    contentMd: translation.contentMd || "",
    disclaimer: translation.disclaimer || "",
    excerpt: translation.excerpt || "",
    faqJson: cloneJsonValue(translation.faqJson) ?? cloneJsonValue(EMPTY_FAQ_JSON),
    id: translation.id || null,
    isAutoTranslated: Boolean(translation.isAutoTranslated),
    locale: translation.locale,
    structuredContentJson:
      cloneJsonValue(translation.structuredContentJson) ?? cloneJsonValue(emptyStructuredContent),
    title: translation.title || "",
    updatedAt: serializeDate(translation.updatedAt),
  };
}

function buildBlankTranslationState(locale, disclaimer) {
  return {
    contentHtml: "",
    contentMd: "",
    disclaimer,
    excerpt: "",
    faqJson: cloneJsonValue(EMPTY_FAQ_JSON),
    id: null,
    isAutoTranslated: false,
    locale,
    structuredContentJson: cloneJsonValue({
      ...emptyStructuredContent,
      locale,
    }),
    title: "",
    updatedAt: null,
  };
}

function getRelevantLocaleCodes(locale) {
  return [...new Set([locale, defaultLocale])];
}

function findTranslation(translations, locale) {
  return translations.find((translation) => translation.locale === locale) || null;
}

function createLocaleCatalogEntry(localeRecord) {
  return {
    canEdit: localeRecord.isActive,
    code: localeRecord.code,
    isActive: localeRecord.isActive,
    isDefault: localeRecord.isDefault,
    label: localeRecord.name,
  };
}

function buildPostSummary(post, localeCatalog) {
  const coverage = localeCatalog.map((locale) => {
    const translation = findTranslation(post.translations, locale.code);

    return {
      hasTranslation: Boolean(translation),
      locale: locale.code,
      title: translation?.title || null,
      updatedAt: serializeDate(translation?.updatedAt),
    };
  });

  return {
    coverage,
    equipmentName: post.equipment.name,
    id: post.id,
    slug: post.slug,
    status: post.status,
    updatedAt: serializeDate(post.updatedAt),
  };
}

function createPersistedTranslationRecord(input, existingTranslation, fallbackTranslation, disclaimer) {
  const baseTranslation = existingTranslation
    ? toSerializableTranslation(existingTranslation)
    : fallbackTranslation
      ? {
          ...toSerializableTranslation(fallbackTranslation),
          disclaimer,
          id: null,
          isAutoTranslated: false,
          locale: input.locale,
          updatedAt: null,
        }
      : buildBlankTranslationState(input.locale, disclaimer);

  const record = {
    contentHtml: sanitizeHtmlFragment(input.contentHtml ?? baseTranslation.contentHtml),
    contentMd: input.contentMd ?? baseTranslation.contentMd,
    disclaimer: input.disclaimer ?? baseTranslation.disclaimer,
    excerpt: input.excerpt ?? baseTranslation.excerpt,
    faqJson:
      input.faqJson === undefined ? cloneJsonValue(baseTranslation.faqJson) : cloneJsonValue(input.faqJson),
    isAutoTranslated:
      input.isAutoTranslated ?? existingTranslation?.isAutoTranslated ?? baseTranslation.isAutoTranslated,
    locale: input.locale,
    structuredContentJson:
      input.structuredContentJson === undefined
        ? sanitizeStructuredContentJson(baseTranslation.structuredContentJson)
        : sanitizeStructuredContentJson(input.structuredContentJson),
    title: input.title ?? baseTranslation.title,
  };

  if (!record.title.trim()) {
    throw new LocalizedContentError("A localized title is required before saving.", {
      status: "missing_localized_title",
      statusCode: 400,
    });
  }

  if (!record.excerpt.trim()) {
    throw new LocalizedContentError("A localized excerpt is required before saving.", {
      status: "missing_localized_excerpt",
      statusCode: 400,
    });
  }

  return record;
}

async function getLocaleDefaultDisclaimer(locale) {
  const messages = await getMessages(locale);
  const disclaimer = messages.post?.defaultDisclaimer;

  if (typeof disclaimer !== "string" || !disclaimer.trim()) {
    throw new LocalizedContentError(
      `Locale "${locale}" is missing post.defaultDisclaimer in its message file.`,
      {
        status: "missing_locale_disclaimer",
        statusCode: 500,
      },
    );
  }

  return disclaimer;
}

function assertSupportedPersistenceLocale(locale) {
  if (!isSupportedLocale(locale)) {
    throw new LocalizedContentError(
      `Unsupported locale "${locale}" cannot be used for Release 1 persistence.`,
      {
        status: "unsupported_locale",
        statusCode: 400,
      },
    );
  }
}

function getEditorSeed({ fallbackTranslation, locale, localeDefaultDisclaimer, storedTranslation }) {
  if (storedTranslation) {
    return {
      translation: toSerializableTranslation(storedTranslation),
      translationSource: "stored",
    };
  }

  if (fallbackTranslation) {
    return {
      translation: {
        ...toSerializableTranslation(fallbackTranslation),
        disclaimer: localeDefaultDisclaimer,
        id: null,
        isAutoTranslated: false,
        locale,
        updatedAt: null,
      },
      translationSource: "default_locale_seed",
    };
  }

  return {
    translation: buildBlankTranslationState(locale, localeDefaultDisclaimer),
    translationSource: "blank",
  };
}

async function getPostWithRelevantTranslations(db, postId, locale) {
  return db.post.findUnique({
    where: { id: postId },
    select: {
      equipment: {
        select: {
          name: true,
        },
      },
      id: true,
      publishedAt: true,
      slug: true,
      status: true,
      updatedAt: true,
      translations: {
        orderBy: {
          locale: "asc",
        },
        select: {
          contentHtml: true,
          contentMd: true,
          disclaimer: true,
          excerpt: true,
          faqJson: true,
          id: true,
          isAutoTranslated: true,
          locale: true,
          structuredContentJson: true,
          title: true,
          updatedAt: true,
        },
        where: {
          locale: {
            in: getRelevantLocaleCodes(locale),
          },
        },
      },
    },
  });
}

export function createLocalizedContentErrorPayload(error) {
  if (error instanceof LocalizedContentError) {
    return {
      body: {
        message: error.message,
        status: error.status,
        success: false,
      },
      statusCode: error.statusCode,
    };
  }

  console.error(error);

  return {
    body: {
      message: "An unexpected localization error occurred.",
      status: "internal_error",
      success: false,
    },
    statusCode: 500,
  };
}

export async function getLocalizationManagementSnapshot(
  { locale: requestedLocale, postId: requestedPostId } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);

  await syncLocaleRegistryToDatabase(db);

  const localeRecords = await db.locale.findMany({
    orderBy: [{ isDefault: "desc" }, { isActive: "desc" }, { code: "asc" }],
  });
  const localeCatalog = localeRecords.map(createLocaleCatalogEntry);
  const editableLocales = localeCatalog.filter((locale) => locale.canEdit);
  const resolvedLocale =
    editableLocales.find((locale) => locale.code === requestedLocale)?.code ||
    editableLocales[0]?.code ||
    defaultLocale;

  const posts = await db.post.findMany({
    orderBy: [{ updatedAt: "desc" }, { slug: "asc" }],
    select: {
      equipment: {
        select: {
          name: true,
        },
      },
      id: true,
      slug: true,
      status: true,
      updatedAt: true,
      translations: {
        orderBy: {
          locale: "asc",
        },
        select: {
          locale: true,
          title: true,
          updatedAt: true,
        },
        where: {
          locale: {
            in: supportedLocales,
          },
        },
      },
    },
  });
  const postSummaries = posts.map((post) => buildPostSummary(post, localeCatalog));
  const resolvedPostId =
    postSummaries.find((post) => post.id === requestedPostId)?.id || postSummaries[0]?.id || null;

  return {
    editor: resolvedPostId
      ? await getPostLocalizationEditor({ locale: resolvedLocale, postId: resolvedPostId }, db)
      : null,
    locales: localeCatalog,
    posts: postSummaries,
    selection: {
      locale: resolvedLocale,
      postId: resolvedPostId,
    },
  };
}

export async function getPostLocalizationEditor({ locale = defaultLocale, postId }, prisma) {
  assertSupportedPersistenceLocale(locale);

  const db = await resolvePrismaClient(prisma);

  await syncLocaleRegistryToDatabase(db);

  const post = await getPostWithRelevantTranslations(db, postId, locale);

  if (!post) {
    throw new LocalizedContentError(`Post "${postId}" was not found.`, {
      status: "post_not_found",
      statusCode: 404,
    });
  }

  const localeDefaultDisclaimer = await getLocaleDefaultDisclaimer(locale);
  const storedTranslation = findTranslation(post.translations, locale);
  const fallbackTranslation =
    locale === defaultLocale ? null : findTranslation(post.translations, defaultLocale);
  const editorSeed = getEditorSeed({
    fallbackTranslation,
    locale,
    localeDefaultDisclaimer,
    storedTranslation,
  });

  return {
    post: {
      equipmentName: post.equipment.name,
      id: post.id,
      publishedAt: serializeDate(post.publishedAt),
      slug: post.slug,
      status: post.status,
      updatedAt: serializeDate(post.updatedAt),
    },
    translation: editorSeed.translation,
    translationSource: editorSeed.translationSource,
  };
}

export async function savePostLocaleContent(input, options = {}, prisma) {
  const parsedInput = savePostLocaleContentSchema.parse(input);

  assertSupportedPersistenceLocale(parsedInput.locale);

  const db = await resolvePrismaClient(prisma);

  await syncLocaleRegistryToDatabase(db);

  const post = await getPostWithRelevantTranslations(db, parsedInput.postId, parsedInput.locale);

  if (!post) {
    throw new LocalizedContentError(`Post "${parsedInput.postId}" was not found.`, {
      status: "post_not_found",
      statusCode: 404,
    });
  }

  const localeDefaultDisclaimer = await getLocaleDefaultDisclaimer(parsedInput.locale);
  const existingTranslation = findTranslation(post.translations, parsedInput.locale);
  const fallbackTranslation =
    parsedInput.locale === defaultLocale
      ? null
      : findTranslation(post.translations, defaultLocale);
  const record = createPersistedTranslationRecord(
    parsedInput,
    existingTranslation,
    fallbackTranslation,
    localeDefaultDisclaimer,
  );

  const savedTranslation = await db.$transaction(async (tx) => {
    const persistedTranslation = await tx.postTranslation.upsert({
      where: {
        postId_locale: {
          locale: parsedInput.locale,
          postId: parsedInput.postId,
        },
      },
      update: record,
      create: {
        ...record,
        postId: parsedInput.postId,
      },
    });

    if (parsedInput.locale === defaultLocale) {
      await tx.post.update({
        where: { id: parsedInput.postId },
        data: {
          excerpt: record.excerpt,
        },
      });
    }

    if (options.actorId) {
      await tx.auditEvent.create({
        data: {
          action: existingTranslation ? "POST_TRANSLATION_UPDATED" : "POST_TRANSLATION_CREATED",
          actorId: options.actorId,
          entityId: `${parsedInput.postId}:${parsedInput.locale}`,
          entityType: "post_translation",
          payloadJson: {
            locale: parsedInput.locale,
            renderArtifacts: {
              hasHtml: Boolean(record.contentHtml),
              hasMarkdown: Boolean(record.contentMd),
            },
            sourceLocale:
              existingTranslation?.locale || fallbackTranslation?.locale || defaultLocale,
          },
        },
      });
    }

    return persistedTranslation;
  });
  const nextPublicSnapshot = await loadPostPublicRevalidationSnapshot(parsedInput.postId, db);
  const revalidation = await revalidatePostPublicSnapshots(
    {
      actorId: options.actorId || null,
      afterSnapshot: nextPublicSnapshot,
      beforeSnapshot: nextPublicSnapshot,
      trigger: "localized_content_save",
    },
    {
      revalidate: options.revalidate,
    },
    db,
  );

  return {
    revalidation,
    snapshot: await getLocalizationManagementSnapshot(
      {
        locale: parsedInput.locale,
        postId: parsedInput.postId,
      },
      db,
    ),
    translation: toSerializableTranslation(savedTranslation),
  };
}

export async function getPublishedPostTranslationBySlug(
  { locale = defaultLocale, slug },
  prisma,
) {
  assertSupportedPersistenceLocale(locale);

  const db = await resolvePrismaClient(prisma);

  await syncLocaleRegistryToDatabase(db);

  const post = await db.post.findUnique({
    where: { slug },
    select: {
      id: true,
      publishedAt: true,
      slug: true,
      status: true,
      translations: {
        select: {
          contentHtml: true,
          contentMd: true,
          disclaimer: true,
          excerpt: true,
          faqJson: true,
          id: true,
          isAutoTranslated: true,
          locale: true,
          structuredContentJson: true,
          title: true,
          updatedAt: true,
        },
        where: {
          locale,
        },
      },
    },
  });

  if (!post || post.status !== "PUBLISHED") {
    return null;
  }

  const translation = post.translations[0];

  if (!translation) {
    return null;
  }

  return {
    path: buildLocalizedPath(locale, publicRouteSegments.blogPost(post.slug)),
    postId: post.id,
    publishedAt: serializeDate(post.publishedAt),
    slug: post.slug,
    translation: toSerializableTranslation(translation),
  };
}
