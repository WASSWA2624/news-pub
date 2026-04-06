import { defaultLocale } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { createAuditEventRecord } from "@/lib/analytics";
import {
  buildStoryStructuredArticle,
  createContentHash,
  NewsPubError,
  pickTranslation,
  resolvePrismaClient,
} from "@/lib/news/shared";
import { createSlug } from "@/lib/normalization";
import { getStreamValidationIssues } from "@/lib/validation/configuration";
import { publishArticleMatch } from "@/lib/news/workflows";

/**
 * Admin post inventory, editor, and publication-control helpers for canonical NewsPub stories.
 */
export const editorialStageOrder = Object.freeze([
  "INGESTED",
  "REVIEWED",
  "EDITED",
  "APPROVED",
]);

export const postInventoryScopeValues = Object.freeze(["review", "published", "all"]);
export const postStatusValues = Object.freeze(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const manualProviderKey = "manual";

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeScope(value) {
  const normalizedValue = trimText(value).toLowerCase();

  return postInventoryScopeValues.includes(normalizedValue) ? normalizedValue : "review";
}

function normalizePage(value) {
  const parsedValue = Number.parseInt(`${value || 1}`.trim(), 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function dedupeStrings(values = []) {
  return [...new Set((values || []).map((value) => trimText(value)).filter(Boolean))];
}

function createPagination(totalItems, page, pageSize = 15) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(normalizePage(page), totalPages);
  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems ? Math.min(totalItems, currentPage * pageSize) : 0;

  return {
    currentPage,
    endItem,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    pageSize,
    startItem,
    totalItems,
    totalPages,
  };
}

function createPostErrorPayload(error) {
  if (error instanceof NewsPubError) {
    return {
      body: {
        message: error.message,
        status: error.status,
        success: false,
      },
      statusCode: error.statusCode,
    };
  }

  return {
    body: {
      message: error instanceof Error ? error.message : "A NewsPub post workflow error occurred.",
      status: "post_workflow_error",
      success: false,
    },
    statusCode: 500,
  };
}

async function createUniquePostSlug(db, rawSlug, currentPostId = null) {
  const baseSlug = createSlug(rawSlug || "story", "story");
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existingPost = await db.post.findUnique({
      select: {
        id: true,
      },
      where: {
        slug,
      },
    });

    if (!existingPost || existingPost.id === currentPostId) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function selectTranslation(post, locale = defaultLocale) {
  return pickTranslation(post?.translations || [], locale);
}

function mapImage(asset) {
  if (!asset) {
    return null;
  }

  return {
    alt: asset.alt || asset.caption || "Story image",
    caption: asset.caption || null,
    height: asset.height || null,
    id: asset.id,
    url: asset.sourceUrl || asset.publicUrl || null,
    width: asset.width || null,
  };
}

function mapRemoteImage(url, fallbackAlt = "Story image") {
  const normalizedUrl = trimText(url);

  if (!normalizedUrl) {
    return null;
  }

  return {
    alt: fallbackAlt,
    caption: null,
    height: null,
    id: null,
    url: normalizedUrl,
    width: null,
  };
}

function mapPostImage(post, fallbackAlt = "Story image") {
  return mapRemoteImage(post?.sourceArticle?.imageUrl, fallbackAlt) || mapImage(post?.featuredImage);
}

function mapCategory(category, locale = defaultLocale) {
  return {
    id: category.id,
    name: category.name,
    path: buildLocalizedPath(locale, publicRouteSegments.category(category.slug)),
    slug: category.slug,
  };
}

function mapManualPublishingStream(stream) {
  return {
    destinationName: stream.destination?.name || "Website",
    id: stream.id,
    locale: stream.locale,
    mode: stream.mode,
    name: stream.name,
    status: stream.status,
    templateName: stream.defaultTemplate?.name || null,
    validationIssues: stream.validationIssues || [],
  };
}

function mapPublishAttempt(attempt) {
  return {
    completedAt: serializeDate(attempt.completedAt),
    createdAt: serializeDate(attempt.createdAt),
    errorMessage: attempt.errorMessage || null,
    id: attempt.id,
    platform: attempt.platform,
    publishedAt: serializeDate(attempt.publishedAt),
    queuedAt: serializeDate(attempt.queuedAt),
    remoteId: attempt.remoteId || null,
    retryCount: attempt.retryCount,
    status: attempt.status,
  };
}

function mapArticleMatch(match) {
  return {
    destination: match.destination
      ? {
          id: match.destination.id,
          kind: match.destination.kind,
          name: match.destination.name,
          platform: match.destination.platform,
          slug: match.destination.slug,
        }
      : null,
    failedAt: serializeDate(match.failedAt),
    fetchedArticle: match.fetchedArticle
      ? {
          id: match.fetchedArticle.id,
          publishedAt: serializeDate(match.fetchedArticle.publishedAt),
          sourceName: match.fetchedArticle.sourceName,
          sourceUrl: match.fetchedArticle.sourceUrl,
          summary: match.fetchedArticle.summary || null,
          title: match.fetchedArticle.title,
        }
      : null,
    holdReasons: Array.isArray(match.holdReasonsJson) ? match.holdReasonsJson : [],
    id: match.id,
    publishAttempts: (match.publishAttempts || []).map(mapPublishAttempt),
    publishedAt: serializeDate(match.publishedAt),
    queuedAt: serializeDate(match.queuedAt),
    reasons: Array.isArray(match.filterReasonsJson) ? match.filterReasonsJson : [],
    status: match.status,
    stream: match.stream
      ? {
          id: match.stream.id,
          locale: match.stream.locale,
          mode: match.stream.mode,
          name: match.stream.name,
          status: match.stream.status,
        }
      : null,
  };
}

function mapInventoryPost(post, locale = defaultLocale) {
  const translation = selectTranslation(post, locale);
  const websitePublished = (post.publishAttempts || []).some(
    (attempt) => attempt.platform === "WEBSITE" && attempt.status === "SUCCEEDED",
  );

  return {
    articleMatches: (post.articleMatches || []).map(mapArticleMatch),
    categories: (post.categories || []).map(({ category }) => mapCategory(category, locale)),
    editorialStage: post.editorialStage,
    excerpt: post.excerpt,
    featuredImage: mapPostImage(post, translation?.title || post.slug),
    id: post.id,
    locale: translation?.locale || locale,
    path: buildLocalizedPath(translation?.locale || locale, publicRouteSegments.newsPost(post.slug)),
    providerKey: post.providerKey,
    publishedAt: serializeDate(post.publishedAt),
    scheduledPublishAt: serializeDate(post.scheduledPublishAt),
    slug: post.slug,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    status: post.status,
    summary: translation?.summary || post.excerpt,
    title: translation?.title || post.slug,
    updatedAt: serializeDate(post.updatedAt),
    websitePublished,
  };
}

function buildInventoryWhere(scope, search) {
  const normalizedScope = normalizeScope(scope);
  const normalizedSearch = trimText(search);

  return {
    ...(normalizedScope === "published"
      ? {
          status: "PUBLISHED",
        }
      : normalizedScope === "review"
        ? {
            status: {
              in: ["DRAFT", "SCHEDULED"],
            },
          }
        : {
            status: {
              not: "ARCHIVED",
            },
          }),
    ...(normalizedSearch
      ? {
          OR: [
            {
              slug: {
                contains: normalizedSearch,
              },
            },
            {
              sourceName: {
                contains: normalizedSearch,
              },
            },
            {
              sourceUrl: {
                contains: normalizedSearch,
              },
            },
            {
              excerpt: {
                contains: normalizedSearch,
              },
            },
            {
              translations: {
                some: {
                  OR: [
                    {
                      title: {
                        contains: normalizedSearch,
                      },
                    },
                    {
                      summary: {
                        contains: normalizedSearch,
                      },
                    },
                    {
                      contentMd: {
                        contains: normalizedSearch,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

const postInventoryInclude = Object.freeze({
  articleMatches: {
    include: {
      destination: {
        select: {
          id: true,
          kind: true,
          name: true,
          platform: true,
          slug: true,
        },
      },
      fetchedArticle: {
        select: {
          id: true,
          publishedAt: true,
          sourceName: true,
          sourceUrl: true,
          summary: true,
          title: true,
        },
      },
      publishAttempts: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          completedAt: true,
          createdAt: true,
          errorMessage: true,
          id: true,
          platform: true,
          publishedAt: true,
          queuedAt: true,
          remoteId: true,
          retryCount: true,
          status: true,
        },
        take: 6,
      },
      stream: {
        select: {
          id: true,
          locale: true,
          mode: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  categories: {
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      category: {
        name: "asc",
      },
    },
  },
  featuredImage: {
    select: {
      alt: true,
      caption: true,
      height: true,
      id: true,
      publicUrl: true,
      sourceUrl: true,
      width: true,
    },
  },
  sourceArticle: {
    select: {
      imageUrl: true,
    },
  },
  publishAttempts: {
    orderBy: {
      createdAt: "desc",
    },
    select: {
      completedAt: true,
      createdAt: true,
      errorMessage: true,
      id: true,
      platform: true,
      publishedAt: true,
      queuedAt: true,
      remoteId: true,
      retryCount: true,
      status: true,
    },
    take: 10,
  },
  translations: {
    include: {
      seoRecord: true,
    },
    orderBy: {
      locale: "asc",
    },
  },
});

function mapEditorTranslation(translation) {
  if (!translation) {
    return null;
  }

  return {
    contentHtml: translation.contentHtml,
    contentMd: translation.contentMd,
    id: translation.id,
    locale: translation.locale,
    seo: translation.seoRecord
      ? {
          canonicalUrl: translation.seoRecord.canonicalUrl,
          keywords: Array.isArray(translation.seoRecord.keywordsJson)
            ? translation.seoRecord.keywordsJson
            : [],
          metaDescription: translation.seoRecord.metaDescription,
          metaTitle: translation.seoRecord.metaTitle,
          noindex: Boolean(translation.seoRecord.noindex),
        }
      : null,
    sourceAttribution: translation.sourceAttribution,
    structuredContentJson: translation.structuredContentJson,
    summary: translation.summary,
    title: translation.title,
    updatedAt: serializeDate(translation.updatedAt),
  };
}

async function rebuildTranslationArtifacts(db, post, locale, nextCategoryIds, overrides = {}) {
  const categories = nextCategoryIds.length
    ? await db.category.findMany({
        where: {
          id: {
            in: nextCategoryIds,
          },
        },
      })
    : [];
  const currentTranslation = pickTranslation(post.translations, locale) || null;
  const title = trimText(overrides.title) || currentTranslation?.title || post.slug;
  const summary = trimText(overrides.summary) || currentTranslation?.summary || post.excerpt || title;
  const body = trimText(overrides.contentMd) || currentTranslation?.contentMd || summary;
  const article = buildStoryStructuredArticle({
    body,
    categoryNames: categories.map((category) => category.name),
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    summary,
    title,
  });

  const translation = await db.postTranslation.upsert({
    where: {
      postId_locale: {
        locale,
        postId: post.id,
      },
    },
    update: {
      contentHtml: article.contentHtml,
      contentMd: body,
      sourceAttribution: `Source: ${post.sourceName} - ${post.sourceUrl}`,
      structuredContentJson: article.article,
      summary,
      title,
    },
    create: {
      contentHtml: article.contentHtml,
      contentMd: body,
      locale,
      postId: post.id,
      sourceAttribution: `Source: ${post.sourceName} - ${post.sourceUrl}`,
      structuredContentJson: article.article,
      summary,
      title,
    },
  });
  const canonicalUrl = buildLocalizedPath(locale, publicRouteSegments.newsPost(post.slug));

  await db.sEORecord.upsert({
    where: {
      postTranslationId: translation.id,
    },
    update: {
      authorsJson: ["NewsPub Editorial"],
      canonicalUrl,
      keywordsJson: dedupeStrings([
        post.sourceName,
        ...categories.map((category) => category.name),
      ]),
      metaDescription: summary,
      metaTitle: title,
      ogDescription: summary,
      ogImageId: post.featuredImageId || null,
      ogTitle: title,
      twitterDescription: summary,
      twitterTitle: title,
    },
    create: {
      authorsJson: ["NewsPub Editorial"],
      canonicalUrl,
      keywordsJson: dedupeStrings([
        post.sourceName,
        ...categories.map((category) => category.name),
      ]),
      metaDescription: summary,
      metaTitle: title,
      ogDescription: summary,
      ogImageId: post.featuredImageId || null,
      ogTitle: title,
      postTranslationId: translation.id,
      twitterDescription: summary,
      twitterTitle: title,
    },
  });
}

async function syncPostCategories(db, postId, categoryIds) {
  await db.postCategory.deleteMany({
    where: {
      postId,
    },
  });

  for (const categoryId of categoryIds) {
    await db.postCategory.create({
      data: {
        categoryId,
        postId,
      },
    });
  }
}

function selectPublishableArticleMatch(post, articleMatchId = null) {
  if (articleMatchId) {
    return post.articleMatches.find((match) => match.id === articleMatchId) || null;
  }

  return (
    post.articleMatches.find(
      (match) =>
        match.destination?.platform === "WEBSITE" &&
        !["PUBLISHED", "FAILED", "DUPLICATE", "SKIPPED"].includes(match.status),
    ) ||
    post.articleMatches.find(
      (match) => !["PUBLISHED", "FAILED", "DUPLICATE", "SKIPPED"].includes(match.status),
    ) ||
    null
  );
}

async function listWebsitePublishingStreams(db) {
  const streams = await db.publishingStream.findMany({
    include: {
      activeProvider: {
        select: {
          id: true,
          providerKey: true,
        },
      },
      defaultTemplate: {
        select: {
          id: true,
          name: true,
          platform: true,
        },
      },
      destination: {
        select: {
          id: true,
          kind: true,
          name: true,
          platform: true,
          slug: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return streams
    .filter((stream) => stream.destination?.platform === "WEBSITE" && stream.destination?.kind === "WEBSITE")
    .map((stream) => ({
      ...stream,
      validationIssues: getStreamValidationIssues({
        destination: stream.destination,
        mode: stream.mode,
        template: stream.defaultTemplate,
      }),
    }));
}

async function resolveManualPostWebsiteStream(db, streamId = null) {
  const websiteStreams = await listWebsitePublishingStreams(db);

  if (!websiteStreams.length) {
    throw new NewsPubError("Create a website stream before creating manual stories.", {
      status: "manual_post_stream_not_found",
      statusCode: 400,
    });
  }

  const selectedStream = streamId
    ? websiteStreams.find((stream) => stream.id === streamId) || null
    : websiteStreams.find((stream) => !stream.validationIssues.length && stream.status === "ACTIVE")
      || websiteStreams.find((stream) => !stream.validationIssues.length)
      || null;

  if (!selectedStream) {
    throw new NewsPubError("No publish-ready website stream is available for manual stories.", {
      status: "manual_post_stream_not_ready",
      statusCode: 400,
    });
  }

  if (selectedStream.validationIssues.length) {
    throw new NewsPubError(selectedStream.validationIssues[0].message, {
      status: "manual_post_stream_not_ready",
      statusCode: 400,
    });
  }

  return selectedStream;
}

function parsePublishAt(value) {
  const rawValue = trimText(value);

  if (!rawValue) {
    return null;
  }

  const publishAt = new Date(rawValue);

  if (Number.isNaN(publishAt.getTime())) {
    throw new NewsPubError("Publish time must be a valid date.", {
      status: "manual_post_validation_failed",
      statusCode: 400,
    });
  }

  return publishAt;
}

export async function getPostInventorySnapshot(options = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const scope = normalizeScope(options.scope);
  const locale = trimText(options.locale).toLowerCase() || defaultLocale;
  const paginationPage = normalizePage(options.page);
  const where = buildInventoryWhere(scope, options.search);
  const totalItems = await db.post.count({ where });
  const pagination = createPagination(totalItems, paginationPage);
  const posts = await db.post.findMany({
    include: postInventoryInclude,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
    take: pagination.pageSize,
    where,
  });
  const [reviewCount, publishedCount, scheduledCount, archivedCount] = await Promise.all([
    db.post.count({
      where: {
        status: {
          in: ["DRAFT", "SCHEDULED"],
        },
      },
    }),
    db.post.count({
      where: {
        status: "PUBLISHED",
      },
    }),
    db.post.count({
      where: {
        status: "SCHEDULED",
      },
    }),
    db.post.count({
      where: {
        status: "ARCHIVED",
      },
    }),
  ]);

  return {
    items: posts.map((post) => mapInventoryPost(post, locale)),
    pagination,
    scope,
    summary: {
      archivedCount,
      publishedCount,
      reviewCount,
      scheduledCount,
      totalCount: reviewCount + publishedCount + archivedCount,
    },
  };
}

export async function getManualPostCreationSnapshot({ locale = defaultLocale } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const [categories, websiteStreams] = await Promise.all([
    db.category.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    listWebsitePublishingStreams(db),
  ]);
  const availableStreams = websiteStreams.filter((stream) => !stream.validationIssues.length);
  const defaultStream =
    availableStreams.find((stream) => stream.status === "ACTIVE") || availableStreams[0] || null;

  return {
    categories: categories.map((category) => mapCategory(category, locale)),
    defaultStreamId: defaultStream?.id || null,
    locale,
    websiteStreams: websiteStreams.map(mapManualPublishingStream),
  };
}

/** Returns the editor payload for one canonical post and one active locale. */
export async function getPostEditorSnapshot({ locale = defaultLocale, postId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const post = await db.post.findUnique({
    include: {
      ...postInventoryInclude,
      sourceArticle: {
        select: {
          author: true,
          body: true,
          id: true,
          imageUrl: true,
          language: true,
          providerArticleId: true,
          providerCategoriesJson: true,
          providerCountriesJson: true,
          providerRegionsJson: true,
          publishedAt: true,
          sourceName: true,
          sourceUrl: true,
          summary: true,
          tagsJson: true,
          title: true,
        },
      },
    },
    where: {
      id: postId,
    },
  });

  if (!post) {
    throw new NewsPubError("The requested post was not found.", {
      status: "post_not_found",
      statusCode: 404,
    });
  }

  const categories = await db.category.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
  const activeTranslation = selectTranslation(post, locale);

  return {
    categories: categories.map((category) => mapCategory(category, locale)),
    editorialStageValues: editorialStageOrder,
    post: {
      articleMatches: (post.articleMatches || []).map(mapArticleMatch),
      categories: (post.categories || []).map(({ category }) => mapCategory(category, locale)),
      editorialStage: post.editorialStage,
      excerpt: post.excerpt,
      featuredImage: mapPostImage(post, activeTranslation?.title || post.slug),
      id: post.id,
      providerKey: post.providerKey,
      publishedAt: serializeDate(post.publishedAt),
      scheduledPublishAt: serializeDate(post.scheduledPublishAt),
      slug: post.slug,
      sourceArticle: post.sourceArticle
        ? {
            author: post.sourceArticle.author || null,
            body: post.sourceArticle.body || null,
            id: post.sourceArticle.id,
            imageUrl: post.sourceArticle.imageUrl || null,
            language: post.sourceArticle.language || null,
            providerArticleId: post.sourceArticle.providerArticleId || null,
            providerCategories: Array.isArray(post.sourceArticle.providerCategoriesJson)
              ? post.sourceArticle.providerCategoriesJson
              : [],
            providerCountries: Array.isArray(post.sourceArticle.providerCountriesJson)
              ? post.sourceArticle.providerCountriesJson
              : [],
            providerRegions: Array.isArray(post.sourceArticle.providerRegionsJson)
              ? post.sourceArticle.providerRegionsJson
              : [],
            publishedAt: serializeDate(post.sourceArticle.publishedAt),
            sourceName: post.sourceArticle.sourceName,
            sourceUrl: post.sourceArticle.sourceUrl,
            summary: post.sourceArticle.summary || null,
            tags: Array.isArray(post.sourceArticle.tagsJson) ? post.sourceArticle.tagsJson : [],
            title: post.sourceArticle.title,
          }
        : null,
      sourceName: post.sourceName,
      sourceUrl: post.sourceUrl,
      status: post.status,
      translations: post.translations.map(mapEditorTranslation),
      websitePath: buildLocalizedPath(
        activeTranslation?.locale || locale,
        publicRouteSegments.newsPost(post.slug),
      ),
    },
    selectedTranslation: mapEditorTranslation(activeTranslation),
    statusValues: postStatusValues,
  };
}

export async function createManualPostRecord(input = {}, { actorId = null } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const action = trimText(input.action).toLowerCase();
  const requestedStatus = trimText(input.status).toUpperCase();
  const shouldSchedule = requestedStatus === "SCHEDULED" || action === "schedule";
  const shouldPublish = requestedStatus === "PUBLISHED" || shouldSchedule || action === "publish";
  const stream = await resolveManualPostWebsiteStream(db, trimText(input.streamId) || null);
  const locale = trimText(input.locale).toLowerCase() || trimText(stream.locale).toLowerCase() || defaultLocale;
  const title = trimText(input.title);
  const sourceName = trimText(input.sourceName);
  const sourceUrl = trimText(input.sourceUrl);
  const summary = trimText(input.summary) || title;
  const contentMd = trimText(input.contentMd) || summary || title;
  const publishAt = parsePublishAt(input.publishAt);
  const nextCategoryIds = Array.isArray(input.categoryIds)
    ? dedupeStrings(input.categoryIds).filter(Boolean)
    : [];

  if (!title || !sourceName || !sourceUrl) {
    throw new NewsPubError("Title, source name, and source URL are required for manual stories.", {
      status: "manual_post_validation_failed",
      statusCode: 400,
    });
  }

  if (shouldSchedule && (!publishAt || publishAt <= new Date())) {
    throw new NewsPubError("Choose a future publish time to schedule the story.", {
      status: "manual_post_validation_failed",
      statusCode: 400,
    });
  }

  const slug = await createUniquePostSlug(db, input.slug || title);
  const createdAt = new Date();
  const fingerprint = createContentHash(
    "manual_post",
    slug,
    sourceUrl,
    actorId || "",
    createdAt.toISOString(),
  );
  const sourceArticle = await db.fetchedArticle.create({
    data: {
      body: contentMd,
      dedupeFingerprint: fingerprint,
      imageUrl: null,
      language: locale,
      normalizedTitleHash: createContentHash(title),
      providerArticleId: `manual-${fingerprint.slice(0, 24)}`,
      providerCategoriesJson: [],
      providerConfigId: stream.activeProvider.id,
      providerCountriesJson: [],
      providerRegionsJson: [],
      publishedAt: createdAt,
      rawPayloadJson: {
        createdBy: actorId,
        manualEntry: true,
        streamId: stream.id,
      },
      sourceName,
      sourceUrl,
      sourceUrlHash: createContentHash(sourceUrl),
      summary,
      tagsJson: [],
      title,
    },
  });
  const post = await db.post.create({
    data: {
      authorId: actorId || null,
      excerpt: summary,
      providerKey: manualProviderKey,
      slug,
      sourceArticleId: sourceArticle.id,
      sourceName,
      sourceUrl,
      status: "DRAFT",
    },
  });

  await syncPostCategories(db, post.id, nextCategoryIds);
  await rebuildTranslationArtifacts(
    db,
    {
      ...post,
      translations: [],
    },
    locale,
    nextCategoryIds,
    {
      contentMd,
      summary,
      title,
    },
  );

  const articleMatch = await db.articleMatch.create({
    data: {
      canonicalPostId: post.id,
      destinationId: stream.destinationId,
      fetchedArticleId: sourceArticle.id,
      holdReasonsJson: shouldPublish ? [] : ["manual_story_pending_editorial_review"],
      overrideNotes: "Created manually from the admin story form.",
      status: shouldPublish ? "ELIGIBLE" : "HELD_FOR_REVIEW",
      streamId: stream.id,
    },
  });

  await createAuditEventRecord(
    {
      action: "MANUAL_POST_CREATED",
      actorId,
      entityId: post.id,
      entityType: "post",
      payloadJson: {
        destinationId: stream.destinationId,
        locale,
        sourceArticleId: sourceArticle.id,
        streamId: stream.id,
      },
    },
    db,
  );

  if (shouldPublish) {
    await publishArticleMatch(articleMatch.id, publishAt ? { publishAt } : {}, db);
  }

  return {
    locale,
    postId: post.id,
  };
}

/** Applies editorial updates and optionally publishes or schedules the linked article match. */
export async function updatePostEditorialRecord(input = {}, { actorId = null } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const locale = trimText(input.locale).toLowerCase() || defaultLocale;
  const action = trimText(input.action).toLowerCase();
  const post = await db.post.findUnique({
    include: {
      articleMatches: {
        include: {
          destination: true,
          stream: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      categories: {
        select: {
          categoryId: true,
        },
      },
      translations: true,
    },
    where: {
      id: input.postId,
    },
  });

  if (!post) {
    throw new NewsPubError("The requested post was not found.", {
      status: "post_not_found",
      statusCode: 404,
    });
  }

  const nextCategoryIds = Array.isArray(input.categoryIds)
    ? dedupeStrings(input.categoryIds).filter(Boolean)
    : post.categories.map((entry) => entry.categoryId);
  const nextSlug = input.slug ? await createUniquePostSlug(db, input.slug, post.id) : post.slug;
  const requestedStatus = trimText(input.status).toUpperCase();
  const publishAt = parsePublishAt(input.publishAt);
  const shouldSchedule = action === "schedule" || (!action && requestedStatus === "SCHEDULED");
  const shouldPublish =
    shouldSchedule ||
    action === "publish" ||
    (!action && requestedStatus === "PUBLISHED");

  if (shouldSchedule && (!publishAt || publishAt <= new Date())) {
    throw new NewsPubError("Choose a future publish time to schedule the story.", {
      status: "manual_post_validation_failed",
      statusCode: 400,
    });
  }

  await db.post.update({
    where: {
      id: post.id,
    },
    data: {
      editorialStage:
        editorialStageOrder.includes(trimText(input.editorialStage).toUpperCase())
          ? trimText(input.editorialStage).toUpperCase()
          : post.editorialStage,
      excerpt: trimText(input.summary) || post.excerpt,
      slug: nextSlug,
      ...(requestedStatus === "ARCHIVED"
        ? {
            publishedAt: post.publishedAt,
            status: "ARCHIVED",
          }
        : requestedStatus === "DRAFT"
          ? {
              status: "DRAFT",
            }
          : {}),
    },
  });

  await syncPostCategories(db, post.id, nextCategoryIds);
  await rebuildTranslationArtifacts(
    db,
    {
      ...post,
      slug: nextSlug,
    },
    locale,
    nextCategoryIds,
    {
      contentMd: input.contentMd,
      summary: input.summary,
      title: input.title,
    },
  );

  await createAuditEventRecord(
    {
      action: "POST_EDITOR_UPDATED",
      actorId,
      entityId: post.id,
      entityType: "post",
      payloadJson: {
        editorialStage: trimText(input.editorialStage).toUpperCase() || post.editorialStage,
        locale,
        slug: nextSlug,
        status: requestedStatus || post.status,
      },
    },
    db,
  );

  if (shouldPublish) {
    const refreshedPost = await db.post.findUnique({
      include: {
        articleMatches: {
          include: {
            destination: true,
            stream: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      where: {
        id: post.id,
      },
    });
    const articleMatch = selectPublishableArticleMatch(refreshedPost, input.articleMatchId);

    if (!articleMatch) {
      throw new NewsPubError(
        "This post is not linked to a publishable article match. Run a stream or review the destination links first.",
        {
          status: "article_match_not_found",
          statusCode: 400,
        },
      );
    }

    await publishArticleMatch(
      articleMatch.id,
      publishAt && !Number.isNaN(publishAt.getTime()) ? { publishAt } : {},
      db,
    );
  }

  return getPostEditorSnapshot(
    {
      locale,
      postId: post.id,
    },
    db,
  );
}

/** Resolves a published translation by slug for public route consumption. */
export async function getPublishedPostTranslationBySlug({ locale = defaultLocale, slug } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const post = await db.post.findFirst({
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      featuredImage: true,
      sourceArticle: {
        select: {
          imageUrl: true,
        },
      },
      publishAttempts: {
        where: {
          platform: "WEBSITE",
          status: "SUCCEEDED",
        },
      },
      translations: {
        include: {
          seoRecord: true,
        },
      },
    },
    where: {
      publishAttempts: {
        some: {
          platform: "WEBSITE",
          status: "SUCCEEDED",
        },
      },
      slug,
      status: "PUBLISHED",
    },
  });

  if (!post) {
    return null;
  }

  const translation = selectTranslation(post, locale);

  if (!translation) {
    return null;
  }

  return {
    categories: post.categories.map(({ category }) => mapCategory(category, translation.locale)),
    featuredImage: mapPostImage(post, translation.title),
    id: post.id,
    locale: translation.locale,
    path: buildLocalizedPath(translation.locale, publicRouteSegments.newsPost(post.slug)),
    postId: post.id,
    publishedAt: serializeDate(post.publishedAt),
    seo: translation.seoRecord
      ? {
          canonicalUrl: translation.seoRecord.canonicalUrl,
          keywords: Array.isArray(translation.seoRecord.keywordsJson)
            ? translation.seoRecord.keywordsJson
            : [],
          metaDescription: translation.seoRecord.metaDescription,
          metaTitle: translation.seoRecord.metaTitle,
        }
      : null,
    slug: post.slug,
    sourceAttribution: translation.sourceAttribution,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    structuredContentJson: translation.structuredContentJson,
    summary: translation.summary,
    title: translation.title,
  };
}

export const EditorialWorkflowError = NewsPubError;
export const LocalizedContentError = NewsPubError;
export const CategoryManagementError = NewsPubError;

export const createEditorialWorkflowErrorPayload = createPostErrorPayload;
export const createLocalizedContentErrorPayload = createPostErrorPayload;
export const createCategoryManagementErrorPayload = createPostErrorPayload;

export const getPostPublicRecordBySlug = getPublishedPostTranslationBySlug;
