import { createAuditEventRecord, recordObservabilityEvent } from "@/lib/analytics";
import { getDestinationSocialGuardrails } from "@/features/destinations/meta-config";
import { getDestinationManagementSnapshot } from "@/features/destinations";
import { discoverRemoteImageUrl } from "@/lib/media";
import { fetchProviderArticles } from "@/lib/news/providers";
import {
  NewsPubError,
  buildStoryStructuredArticle,
  createContentHash,
  createPagination,
  createSlug,
  dedupeStrings,
  normalizeSearchText,
  pickTranslation,
  renderTemplateString,
  resolvePrismaClient,
  serializeDate,
  trimText,
} from "@/lib/news/shared";
import { revalidatePublishedPostPaths } from "@/lib/revalidation";
import { env } from "@/lib/env/server";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { isDestinationRuntimeReady } from "@/lib/news/destination-runtime";
import { DestinationPublishError, publishExternalDestination } from "@/lib/news/publishers";
import { getStreamValidationIssues } from "@/lib/validation/configuration";

/**
 * Core NewsPub ingest, filtering, review, scheduling, and publication workflows.
 */
function toAbsoluteUrl(path) {
  return new URL(path, env.app.url).toString();
}

function getArticleSearchText(article) {
  return normalizeSearchText(
    [
      article.title,
      article.summary,
      article.body,
      ...(article.tags || []),
      ...(article.providerCategories || []),
      ...(article.providerCountries || []),
      ...(article.providerRegions || []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function findMatchingCategoryIds(article, streamCategories = []) {
  if (!streamCategories.length) {
    return [];
  }

  const normalizedSearch = getArticleSearchText(article);

  return streamCategories
    .filter((category) => {
      const categoryTerms = [category.name, category.slug].map((value) => normalizeSearchText(value));

      return categoryTerms.some((term) => term && normalizedSearch.includes(term));
    })
    .map((category) => category.id);
}

function evaluateArticleAgainstStream(article, stream) {
  const reasons = [];
  const normalizedSearch = getArticleSearchText(article);
  const includeKeywords = dedupeStrings(stream.includeKeywordsJson || []).map((keyword) =>
    normalizeSearchText(keyword),
  );
  const excludeKeywords = dedupeStrings(stream.excludeKeywordsJson || []).map((keyword) =>
    normalizeSearchText(keyword),
  );
  const languageAllowlist = dedupeStrings(stream.languageAllowlistJson || []);
  const countryAllowlist = dedupeStrings(stream.countryAllowlistJson || []);
  const regionAllowlist = dedupeStrings(stream.regionAllowlistJson || []);
  const matchedCategoryIds = findMatchingCategoryIds(
    article,
    stream.categories.map((entry) => entry.category),
  );

  if (languageAllowlist.length && !languageAllowlist.includes(trimText(article.language).toLowerCase())) {
    reasons.push("language_not_allowed");
  }

  if (
    countryAllowlist.length &&
    !countryAllowlist.some((country) => (article.providerCountries || []).includes(country))
  ) {
    reasons.push("country_not_allowed");
  }

  if (
    regionAllowlist.length &&
    !regionAllowlist.some((region) => (article.providerRegions || []).includes(region))
  ) {
    reasons.push("region_not_allowed");
  }

  if (includeKeywords.length && !includeKeywords.some((keyword) => normalizedSearch.includes(keyword))) {
    reasons.push("include_keywords_not_matched");
  }

  if (excludeKeywords.some((keyword) => normalizedSearch.includes(keyword))) {
    reasons.push("exclude_keyword_matched");
  }

  if (stream.categories.length && !matchedCategoryIds.length) {
    reasons.push("stream_category_not_matched");
  }

  if (reasons.length) {
    return {
      matchedCategoryIds,
      reasons,
      status: "SKIPPED",
    };
  }

  return {
    matchedCategoryIds,
    reasons: [],
    status: stream.mode === "REVIEW_REQUIRED" ? "HELD_FOR_REVIEW" : "ELIGIBLE",
  };
}

export async function resolveFetchedArticleImageUrl(article = {}) {
  const directImageUrl = trimText(article.imageUrl);

  if (directImageUrl) {
    return directImageUrl;
  }

  return discoverRemoteImageUrl(article.sourceUrl);
}

async function findDuplicateArticleMatch(db, article, stream) {
  const duplicateWindowStart = new Date(
    Date.now() - stream.duplicateWindowHours * 60 * 60 * 1000,
  );

  return db.articleMatch.findFirst({
    include: {
      canonicalPost: {
        select: {
          id: true,
          slug: true,
        },
      },
      fetchedArticle: {
        select: {
          id: true,
          normalizedTitleHash: true,
          providerArticleId: true,
          publishedAt: true,
          sourceUrlHash: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    where: {
      createdAt: {
        gte: duplicateWindowStart,
      },
      destinationId: stream.destinationId,
      OR: [
        article.providerArticleId
          ? {
              fetchedArticle: {
                providerArticleId: article.providerArticleId,
                providerConfigId: stream.activeProviderId,
              },
            }
          : null,
        article.sourceUrlHash
          ? {
              fetchedArticle: {
                sourceUrlHash: article.sourceUrlHash,
              },
            }
          : null,
        {
          fetchedArticle: {
            normalizedTitleHash: article.normalizedTitleHash,
            publishedAt: {
              gte: duplicateWindowStart,
            },
          },
        },
      ].filter(Boolean),
    },
  });
}

async function ensureUniquePostSlug(db, baseSlug) {
  const existingPosts = await db.post.findMany({
    select: {
      slug: true,
    },
    where: {
      slug: {
        startsWith: baseSlug,
      },
    },
  });
  const existingSlugs = new Set(existingPosts.map((post) => post.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let index = 2;

  while (existingSlugs.has(`${baseSlug}-${index}`)) {
    index += 1;
  }

  return `${baseSlug}-${index}`;
}

async function resolveTemplate(db, stream, categoryId = null) {
  if (stream.defaultTemplateId) {
    return db.destinationTemplate.findUnique({
      where: {
        id: stream.defaultTemplateId,
      },
    });
  }

  if (categoryId) {
    const categoryTemplate = await db.destinationTemplate.findFirst({
      where: {
        categoryId,
        platform: stream.destination.platform,
      },
    });

    if (categoryTemplate) {
      return categoryTemplate;
    }
  }

  const localeTemplate = await db.destinationTemplate.findFirst({
    where: {
      locale: stream.locale,
      platform: stream.destination.platform,
    },
  });

  if (localeTemplate) {
    return localeTemplate;
  }

  return db.destinationTemplate.findFirst({
    where: {
      isDefault: true,
      platform: stream.destination.platform,
    },
  });
}

async function upsertCanonicalPost(db, article, stream, categoryIds, actorId) {
  const existingPost = await db.post.findFirst({
    where: {
      sourceArticleId: article.id,
    },
  });
  const categoryRecords = categoryIds.length
    ? await db.category.findMany({
        where: {
          id: {
            in: categoryIds,
          },
        },
      })
    : [];
  const canonicalSlug = existingPost?.slug || (await ensureUniquePostSlug(db, createSlug(article.title, "story")));
  const articleContent = buildStoryStructuredArticle({
    body: article.body || article.summary || article.title,
    categoryNames: categoryRecords.map((category) => category.name),
    sourceName: article.sourceName,
    sourceUrl: article.sourceUrl,
    summary: article.summary || article.title,
    title: article.title,
  });
  const canonicalPath = buildLocalizedPath(stream.locale, publicRouteSegments.newsPost(canonicalSlug));
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const sourceAttribution = `Source: ${article.sourceName} - ${article.sourceUrl}`;
  const seoKeywords = dedupeStrings([
    article.sourceName,
    ...categoryRecords.map((category) => category.name),
    ...(article.tags || []),
  ]);
  let featuredImageId = existingPost?.featuredImageId || null;

  const post = existingPost
    ? await db.post.update({
        where: {
          id: existingPost.id,
        },
        data: {
          authorId: actorId || existingPost.authorId,
          excerpt: article.summary || article.title,
          featuredImageId,
          providerKey: stream.activeProvider.providerKey,
          sourceArticleId: article.id,
          sourceName: article.sourceName,
          sourceUrl: article.sourceUrl,
        },
      })
    : await db.post.create({
        data: {
          authorId: actorId || null,
          excerpt: article.summary || article.title,
          featuredImageId,
          providerKey: stream.activeProvider.providerKey,
          slug: canonicalSlug,
          sourceArticleId: article.id,
          sourceName: article.sourceName,
          sourceUrl: article.sourceUrl,
          status: stream.mode === "REVIEW_REQUIRED" ? "DRAFT" : "PUBLISHED",
        },
      });

  const translation = await db.postTranslation.upsert({
    where: {
      postId_locale: {
        locale: stream.locale,
        postId: post.id,
      },
    },
    update: {
      contentHtml: articleContent.contentHtml,
      contentMd: articleContent.contentMd,
      sourceAttribution,
      structuredContentJson: articleContent.article,
      summary: article.summary || article.title,
      title: article.title,
    },
    create: {
      contentHtml: articleContent.contentHtml,
      contentMd: articleContent.contentMd,
      locale: stream.locale,
      postId: post.id,
      sourceAttribution,
      structuredContentJson: articleContent.article,
      summary: article.summary || article.title,
      title: article.title,
    },
  });

  await db.sEORecord.upsert({
    where: {
      postTranslationId: translation.id,
    },
    update: {
      authorsJson: ["NewsPub Editorial"],
      canonicalUrl,
      keywordsJson: seoKeywords,
      metaDescription: article.summary || article.title,
      metaTitle: article.title,
      ogDescription: article.summary || article.title,
      ogImageId: featuredImageId,
      ogTitle: article.title,
      twitterDescription: article.summary || article.title,
      twitterTitle: article.title,
    },
    create: {
      authorsJson: ["NewsPub Editorial"],
      canonicalUrl,
      keywordsJson: seoKeywords,
      metaDescription: article.summary || article.title,
      metaTitle: article.title,
      ogDescription: article.summary || article.title,
      ogImageId: featuredImageId,
      ogTitle: article.title,
      postTranslationId: translation.id,
      twitterDescription: article.summary || article.title,
      twitterTitle: article.title,
    },
  });

  await db.postCategory.deleteMany({
    where: {
      postId: post.id,
    },
  });

  if (categoryIds.length) {
    await db.postCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        categoryId,
        postId: post.id,
      })),
    });
  }

  return post;
}

function buildTemplateContext({ articleMatch, post, stream, template, translation }) {
  const canonicalPath = buildLocalizedPath(stream.locale, publicRouteSegments.newsPost(post.slug));
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const keywords = Array.isArray(translation?.seoRecord?.keywordsJson)
    ? translation.seoRecord.keywordsJson
    : [];
  const hashtags = dedupeStrings(keywords)
    .slice(0, 6)
    .map((keyword) => `#${createSlug(keyword, "news")}`)
    .join(" ");
  const imageUrl =
    post.sourceArticle?.imageUrl
    || translation?.seoRecord?.ogImage?.sourceUrl
    || translation?.seoRecord?.ogImage?.publicUrl
    || post.featuredImage?.sourceUrl
    || post.featuredImage?.publicUrl
    || null;

  return {
    canonicalPath,
    canonicalUrl,
    hashtags,
    imageUrl,
    locale: stream.locale,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    summary: translation?.summary || post.excerpt,
    title: translation?.title || post.slug,
  };
}

function getRecentAttemptPayload(payloadJson) {
  return payloadJson && typeof payloadJson === "object" && !Array.isArray(payloadJson) ? payloadJson : {};
}

function getSocialPayloadFingerprint(payload = {}) {
  return createContentHash(
    payload.platform,
    payload.destinationKind,
    payload.title,
    payload.summary,
    payload.canonicalUrl,
    payload.hashtags,
  );
}

function getHashtagTokens(value) {
  return trimText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.startsWith("#"));
}

function limitHashtagString(value, maxCount) {
  return getHashtagTokens(value).slice(0, maxCount).join(" ");
}

export async function applySocialPublishingGuardrails({ db, destination, payload }) {
  if (!["FACEBOOK", "INSTAGRAM"].includes(destination?.platform)) {
    return {
      adjustments: {},
      payload,
    };
  }

  const now = new Date();
  const socialGuardrails = getDestinationSocialGuardrails(destination);
  const duplicateWindowStart = new Date(
    now.getTime() - socialGuardrails.duplicateCooldownHours * 60 * 60 * 1000,
  );
  const recentWindowStart = new Date(
    now.getTime() - Math.max(24, socialGuardrails.duplicateCooldownHours) * 60 * 60 * 1000,
  );
  const recentSucceededAttempts = await db.publishAttempt.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      payloadJson: true,
      publishedAt: true,
    },
    where: {
      destinationId: destination.id,
      publishedAt: {
        gte: recentWindowStart,
      },
      status: "SUCCEEDED",
    },
  });
  const nextPayload = {
    ...payload,
  };
  const issues = [];
  const adjustments = {};
  const currentFingerprint = getSocialPayloadFingerprint(nextPayload);
  const currentCanonicalUrl = trimText(nextPayload.canonicalUrl);
  const latestSucceededAttempt = recentSucceededAttempts[0] || null;
  const maxPostsPer24Hours =
    destination.platform === "FACEBOOK"
      ? socialGuardrails.facebookMaxPostsPer24Hours
      : socialGuardrails.instagramMaxPostsPer24Hours;
  const publishedLast24Hours = recentSucceededAttempts.filter((attempt) => {
    if (!(attempt.publishedAt instanceof Date)) {
      return false;
    }

    return attempt.publishedAt >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }).length;

  if (latestSucceededAttempt?.publishedAt instanceof Date) {
    const nextAllowedPublishAt = new Date(
      latestSucceededAttempt.publishedAt.getTime() + socialGuardrails.minPostIntervalMinutes * 60 * 1000,
    );

    if (nextAllowedPublishAt > now) {
      issues.push({
        code: "posting_interval_too_short",
        message: `Wait until ${nextAllowedPublishAt.toISOString()} before publishing to this destination again.`,
      });
    }
  }

  if (publishedLast24Hours >= maxPostsPer24Hours) {
    issues.push({
      code: "destination_daily_cap_reached",
      message: `This destination already reached the internal cap of ${maxPostsPer24Hours} posts in the last 24 hours.`,
    });
  }

  if (destination.platform === "INSTAGRAM") {
    const limitedHashtags = limitHashtagString(
      nextPayload.hashtags,
      socialGuardrails.instagramMaxHashtags,
    );

    if (limitedHashtags !== trimText(nextPayload.hashtags)) {
      nextPayload.hashtags = limitedHashtags;
      adjustments.instagramHashtagsTrimmedTo = socialGuardrails.instagramMaxHashtags;
    }
  }

  if (!trimText(nextPayload.sourceReference)) {
    issues.push({
      code: "source_reference_missing",
      message: "Source attribution is required before publishing to Meta destinations.",
    });
  }

  for (const attempt of recentSucceededAttempts) {
    if (!(attempt.publishedAt instanceof Date) || attempt.publishedAt < duplicateWindowStart) {
      continue;
    }

    const recentPayload = getRecentAttemptPayload(attempt.payloadJson);

    if (getSocialPayloadFingerprint(recentPayload) === currentFingerprint) {
      issues.push({
        code: "duplicate_social_payload",
        message: "An identical social post was already published recently for this destination.",
      });
      break;
    }

    if (currentCanonicalUrl && trimText(recentPayload.canonicalUrl) === currentCanonicalUrl) {
      issues.push({
        code: "duplicate_canonical_story",
        message: "This destination already published the same canonical story within the duplicate cooldown window.",
      });
      break;
    }
  }

  if (issues.length) {
    throw new DestinationPublishError("Meta publishing guardrails blocked this post.", {
      responseJson: {
        adjustments,
        error: "destination_policy_guardrail_blocked",
        issues,
        maxPostsPer24Hours,
        publishedLast24Hours,
      },
      retryable: false,
      status: "destination_policy_guardrail_blocked",
      statusCode: 400,
    });
  }

  return {
    adjustments,
    payload: nextPayload,
  };
}

async function executePublishAttempt(db, attemptId) {
  const attempt = await db.publishAttempt.findUnique({
    include: {
      articleMatch: {
        include: {
          destination: true,
          stream: {
            include: {
              destination: true,
            },
          },
        },
      },
      destination: true,
      post: {
        include: {
          featuredImage: true,
          sourceArticle: {
            select: {
              imageUrl: true,
            },
          },
          translations: {
            include: {
              seoRecord: {
                include: {
                  ogImage: true,
                },
              },
            },
          },
        },
      },
      stream: {
        include: {
          destination: true,
        },
      },
    },
    where: {
      id: attemptId,
    },
  });

  if (!attempt) {
    throw new NewsPubError("Publish attempt was not found.", {
      status: "publish_attempt_not_found",
      statusCode: 404,
    });
  }

  const destination = attempt.destination;
  const translation = pickTranslation(attempt.post?.translations || [], attempt.stream.locale);
  const template = await resolveTemplate(db, attempt.stream);
  const configurationIssues = getStreamValidationIssues({
    destination,
    mode: attempt.stream.mode,
    template,
  });

  if (configurationIssues.length) {
    throw new NewsPubError(configurationIssues[0].message, {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const context = buildTemplateContext({
    articleMatch: attempt.articleMatch,
    post: attempt.post,
    stream: attempt.stream,
    template,
    translation,
  });
  let payload = {
    body: renderTemplateString(template?.bodyTemplate, context),
    canonicalUrl: context.canonicalUrl,
    destinationKind: destination.kind,
    hashtags: renderTemplateString(template?.hashtagsTemplate, context),
    mediaUrl: context.imageUrl,
    platform: attempt.platform,
    sourceReference: `Source: ${context.sourceName}${context.sourceUrl ? ` - ${context.sourceUrl}` : ""}`,
    summary: renderTemplateString(template?.summaryTemplate, context) || context.summary,
    title: renderTemplateString(template?.titleTemplate, context) || context.title,
  };

  await db.publishAttempt.update({
    where: {
      id: attempt.id,
    },
    data: {
      payloadJson: payload,
      startedAt: new Date(),
      status: "RUNNING",
    },
  });

  const needsToken = destination.platform !== "WEBSITE";

  if (needsToken && !isDestinationRuntimeReady(destination)) {
    const failedAttempt = await db.publishAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        completedAt: new Date(),
        errorMessage: "Destination is not connected.",
        responseJson: {
          error: "destination_not_connected",
        },
        status: "FAILED",
      },
    });

    await db.articleMatch.update({
      where: {
        id: attempt.articleMatchId,
      },
      data: {
        failedAt: new Date(),
        status: "FAILED",
      },
    });

    await recordObservabilityEvent(
      {
        action: "PUBLISH_ATTEMPT_FAILED",
        entityId: failedAttempt.id,
        entityType: "publish_attempt",
        message: "Destination is not connected.",
      },
      db,
    );

    return failedAttempt;
  }

  let publishResult;

  try {
    if (destination.platform !== "WEBSITE") {
      const guardrailResult = await applySocialPublishingGuardrails({
        db,
        destination,
        payload,
      });

      payload = guardrailResult.payload;

      if (Object.keys(guardrailResult.adjustments).length) {
        await db.publishAttempt.update({
          where: {
            id: attempt.id,
          },
          data: {
            payloadJson: {
              ...payload,
              guardrailAdjustments: guardrailResult.adjustments,
            },
          },
        });
      }
    }

    if (attempt.platform === "WEBSITE") {
      const remoteId = `${destination.platform.toLowerCase()}_${createContentHash(
        attempt.id,
        context.title,
        Date.now(),
      ).slice(0, 14)}`;

      publishResult = {
        publishedAt: new Date(),
        remoteId,
        responseJson: {
          canonicalUrl: context.canonicalUrl,
          remoteId,
          status: "ok",
        },
      };
    } else {
      publishResult = await publishExternalDestination({
        destination,
        payload,
      });
    }
  } catch (error) {
    const failedAt = new Date();
    const failedAttempt = await db.publishAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        completedAt: failedAt,
        errorMessage: error instanceof Error ? error.message : "Destination publication failed.",
        responseJson:
          error instanceof DestinationPublishError
            ? {
                ...(error.responseJson || {}),
                retryable: error.retryable,
                status: error.status,
              }
            : {
                retryable: false,
                status: "destination_publish_failed",
              },
        status: "FAILED",
      },
    });

    await db.articleMatch.update({
      where: {
        id: attempt.articleMatchId,
      },
      data: {
        failedAt,
        status: "FAILED",
      },
    });

    await recordObservabilityEvent(
      {
        action: "PUBLISH_ATTEMPT_FAILED",
        entityId: failedAttempt.id,
        entityType: "publish_attempt",
        error,
        message: error instanceof Error ? error.message : "Destination publication failed.",
        payload: {
          platform: attempt.platform,
          retryable: error instanceof DestinationPublishError ? error.retryable : false,
        },
      },
      db,
    );

    return failedAttempt;
  }

  const publishedAt = publishResult.publishedAt || new Date();
  const succeededAttempt = await db.publishAttempt.update({
    where: {
      id: attempt.id,
    },
    data: {
      completedAt: publishedAt,
      publishedAt,
      remoteId: publishResult.remoteId,
      responseJson: publishResult.responseJson || {
        canonicalUrl: context.canonicalUrl,
        remoteId: publishResult.remoteId || null,
        status: "ok",
      },
      status: "SUCCEEDED",
    },
  });

  await db.articleMatch.update({
    where: {
      id: attempt.articleMatchId,
    },
    data: {
      publishedAt,
      queuedAt: attempt.queuedAt || new Date(),
      status: "PUBLISHED",
    },
  });

  await db.post.update({
    where: {
      id: attempt.postId,
    },
    data: {
      editorialStage: "APPROVED",
      publishedAt,
      scheduledPublishAt: null,
      status: "PUBLISHED",
    },
  });

  if (attempt.platform === "WEBSITE") {
    await revalidatePublishedPostPaths(
      {
        categorySlugs: (
          await db.postCategory.findMany({
            include: {
              category: {
                select: {
                  slug: true,
                },
              },
            },
            where: {
              postId: attempt.postId,
            },
          })
        ).map((entry) => entry.category.slug),
        locales: [attempt.stream.locale],
        slug: attempt.post.slug,
      },
    );
  }

  await createAuditEventRecord(
    {
      action: "PUBLISH_ATTEMPT_SUCCEEDED",
      entityId: succeededAttempt.id,
      entityType: "publish_attempt",
      payloadJson: {
        platform: attempt.platform,
        remoteId: publishResult.remoteId || null,
      },
    },
    db,
  );

  return succeededAttempt;
}

async function createPublishAttempt(db, { articleMatchId, platform, postId, publishAt, stream }) {
  const attemptCount = await db.publishAttempt.count({
    where: {
      articleMatchId,
    },
  });

  return db.publishAttempt.create({
    data: {
      articleMatchId,
      attemptNumber: attemptCount + 1,
      destinationId: stream.destinationId,
      idempotencyKey: createContentHash(articleMatchId, platform, attemptCount + 1).slice(0, 36),
      platform,
      postId,
      queuedAt: new Date(),
      retryCount: Math.max(0, attemptCount),
      streamId: stream.id,
      ...(publishAt
        ? {
            payloadJson: {
              scheduledFor: publishAt.toISOString(),
            },
            status: "PENDING",
          }
        : {}),
    },
  });
}

export async function publishArticleMatch(articleMatchId, { publishAt } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const articleMatch = await db.articleMatch.findUnique({
    include: {
      canonicalPost: true,
      destination: true,
      stream: {
        include: {
          destination: true,
        },
      },
    },
    where: {
      id: articleMatchId,
    },
  });

  if (!articleMatch?.canonicalPost) {
    throw new NewsPubError("Article match does not have a canonical post.", {
      status: "post_not_ready_for_publication",
      statusCode: 400,
    });
  }

  if (publishAt && publishAt > new Date()) {
    await db.post.update({
      where: {
        id: articleMatch.canonicalPostId,
      },
      data: {
        scheduledPublishAt: publishAt,
        status: "SCHEDULED",
      },
    });

    return createPublishAttempt(db, {
      articleMatchId: articleMatch.id,
      platform: articleMatch.destination.platform,
      postId: articleMatch.canonicalPostId,
      publishAt,
      stream: articleMatch.stream,
    });
  }

  const attempt = await createPublishAttempt(db, {
    articleMatchId: articleMatch.id,
    platform: articleMatch.destination.platform,
    postId: articleMatch.canonicalPostId,
    stream: articleMatch.stream,
  });

  return executePublishAttempt(db, attempt.id);
}

function isRetryablePublishAttempt(attempt, now = new Date()) {
  if (attempt.status !== "FAILED") {
    return false;
  }

  if ((attempt.retryCount || 0) >= (attempt.stream?.retryLimit || 0)) {
    return false;
  }

  if (!attempt.responseJson?.retryable) {
    return false;
  }

  if (
    (attempt.articleMatch?.publishAttempts || []).some(
      (candidate) => candidate.id !== attempt.id && candidate.status === "SUCCEEDED",
    )
  ) {
    return false;
  }

  const completedAt = attempt.completedAt instanceof Date ? attempt.completedAt : null;

  if (!completedAt) {
    return false;
  }

  const nextRetryAt = new Date(
    completedAt.getTime() + (attempt.stream?.retryBackoffMinutes || 0) * 60 * 1000,
  );

  return nextRetryAt <= now;
}

/** Creates and executes a new retry attempt for a previously failed publication. */
export async function retryPublishAttempt(attemptId, { actorId = null, automated = false } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const attempt = await db.publishAttempt.findUnique({
    include: {
      articleMatch: {
        include: {
          publishAttempts: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      stream: true,
    },
    where: {
      id: attemptId,
    },
  });

  if (!attempt) {
    throw new NewsPubError("Publish attempt was not found.", {
      status: "publish_attempt_not_found",
      statusCode: 404,
    });
  }

  if (attempt.status !== "FAILED") {
    throw new NewsPubError("Only failed publish attempts can be retried.", {
      status: "publish_attempt_retry_invalid",
      statusCode: 400,
    });
  }

  if (
    (attempt.articleMatch?.publishAttempts || []).some(
      (candidate) => candidate.id !== attempt.id && candidate.status === "SUCCEEDED",
    )
  ) {
    throw new NewsPubError("This article match already has a successful publish attempt.", {
      status: "publish_attempt_already_succeeded",
      statusCode: 400,
    });
  }

  if ((attempt.retryCount || 0) >= (attempt.stream?.retryLimit || 0)) {
    throw new NewsPubError("The stream retry limit has already been reached for this publication.", {
      status: "publish_attempt_retry_limit_reached",
      statusCode: 400,
    });
  }

  const nextAttempt = await createPublishAttempt(db, {
    articleMatchId: attempt.articleMatchId,
    platform: attempt.platform,
    postId: attempt.postId,
    stream: attempt.stream,
  });

  await createAuditEventRecord(
    {
      action: automated ? "PUBLISH_ATTEMPT_RETRY_SCHEDULED" : "PUBLISH_ATTEMPT_RETRY_REQUESTED",
      actorId,
      entityId: nextAttempt.id,
      entityType: "publish_attempt",
      payloadJson: {
        previousAttemptId: attempt.id,
        retryCount: nextAttempt.retryCount,
      },
    },
    db,
  );

  return executePublishAttempt(db, nextAttempt.id);
}

/** Runs one publishing stream end to end, including fetch, filtering, dedupe, and publication. */
export async function runStreamFetch(streamId, { actorId = null, now = new Date(), triggerType = "manual" } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const stream = await db.publishingStream.findUnique({
    include: {
      activeProvider: true,
      categories: {
        include: {
          category: true,
        },
      },
      checkpoints: true,
      destination: true,
      defaultTemplate: true,
    },
    where: {
      id: streamId,
    },
  });

  if (!stream) {
    throw new NewsPubError("Publishing stream not found.", {
      status: "stream_not_found",
      statusCode: 404,
    });
  }

  if (stream.status !== "ACTIVE") {
    throw new NewsPubError("Publishing stream must be active before it can run.", {
      status: "stream_not_active",
      statusCode: 400,
    });
  }

  const streamValidationIssues = getStreamValidationIssues({
    destination: stream.destination,
    mode: stream.mode,
    template: stream.defaultTemplate,
  });

  if (streamValidationIssues.length) {
    throw new NewsPubError(streamValidationIssues[0].message, {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const checkpoint =
    stream.checkpoints.find((entry) => entry.providerConfigId === stream.activeProviderId) || null;
  const fetchRun = await db.fetchRun.create({
    data: {
      providerConfigId: stream.activeProviderId,
      requestedById: actorId,
      streamId: stream.id,
      triggerType,
      windowEnd: now,
      windowStart:
        checkpoint?.lastSuccessfulFetchAt
        || new Date(now.getTime() - env.scheduler.initialBackfillHours * 60 * 60 * 1000),
    },
  });

  try {
    const providerResult = await fetchProviderArticles({
      checkpoint,
      now,
      providerKey: stream.activeProvider.providerKey,
      stream,
    });
    const summary = {
      duplicateCount: 0,
      failedCount: 0,
      fetchedCount: providerResult.fetchedCount,
      heldCount: 0,
      publishedCount: 0,
      publishableCount: 0,
      queuedCount: 0,
      skippedCount: 0,
    };

    for (const articleCandidate of providerResult.articles) {
      const evaluation = evaluateArticleAgainstStream(articleCandidate, stream);

      if (evaluation.status === "SKIPPED") {
        summary.skippedCount += 1;
        continue;
      }

      const duplicateMatch = await findDuplicateArticleMatch(db, articleCandidate, stream);

      if (duplicateMatch) {
        summary.duplicateCount += 1;
        continue;
      }

      const resolvedImageUrl = await resolveFetchedArticleImageUrl(articleCandidate);
      const fetchedArticle = await db.fetchedArticle.create({
        data: {
          body: articleCandidate.body || null,
          dedupeFingerprint: articleCandidate.dedupeFingerprint,
          imageUrl: resolvedImageUrl || null,
          language: trimText(articleCandidate.language) || null,
          normalizedTitleHash: articleCandidate.normalizedTitleHash,
          providerArticleId: articleCandidate.providerArticleId || null,
          providerCategoriesJson: articleCandidate.providerCategories || [],
          providerConfigId: stream.activeProviderId,
          providerCountriesJson: articleCandidate.providerCountries || [],
          providerRegionsJson: articleCandidate.providerRegions || [],
          publishedAt: new Date(articleCandidate.publishedAt || now),
          rawPayloadJson: articleCandidate.rawPayloadJson || null,
          sourceName: articleCandidate.sourceName,
          sourceUrl: articleCandidate.sourceUrl,
          sourceUrlHash: articleCandidate.sourceUrlHash,
          summary: articleCandidate.summary || articleCandidate.title,
          tagsJson: articleCandidate.tags || [],
          title: articleCandidate.title,
        },
      });
      const post = await upsertCanonicalPost(
        db,
        fetchedArticle,
        stream,
        evaluation.matchedCategoryIds,
        actorId,
      );
      const articleMatch = await db.articleMatch.create({
        data: {
          canonicalPostId: post.id,
          destinationId: stream.destinationId,
          fetchedArticleId: fetchedArticle.id,
          filterReasonsJson: evaluation.reasons,
          queuedAt: stream.mode === "AUTO_PUBLISH" ? new Date() : null,
          status: evaluation.status,
          streamId: stream.id,
        },
      });

      summary.publishableCount += 1;

      if (evaluation.status === "HELD_FOR_REVIEW") {
        summary.heldCount += 1;
        continue;
      }

      summary.queuedCount += 1;

      try {
        const publishResult = await publishArticleMatch(articleMatch.id, {}, db);

        if (publishResult.status === "SUCCEEDED") {
          summary.publishedCount += 1;
        } else {
          summary.failedCount += 1;
        }
      } catch (error) {
        summary.failedCount += 1;
        await recordObservabilityEvent(
          {
            action: "PUBLISH_ATTEMPT_FAILED",
            entityId: articleMatch.id,
            entityType: "article_match",
            error,
          },
          db,
        );
      }
    }

    await db.providerFetchCheckpoint.upsert({
      where: {
        streamId_providerConfigId: {
          providerConfigId: stream.activeProviderId,
          streamId: stream.id,
        },
      },
      update: {
        cursorJson: providerResult.cursor || null,
        lastSuccessfulFetchAt: now,
      },
      create: {
        cursorJson: providerResult.cursor || null,
        lastSuccessfulFetchAt: now,
        providerConfigId: stream.activeProviderId,
        streamId: stream.id,
      },
    });

    const completedRun = await db.fetchRun.update({
      where: {
        id: fetchRun.id,
      },
      data: {
        duplicateCount: summary.duplicateCount,
        failedCount: summary.failedCount,
        fetchedCount: summary.fetchedCount,
        finishedAt: new Date(),
        heldCount: summary.heldCount,
        providerCursorAfterJson: providerResult.cursor || null,
        providerCursorBeforeJson: checkpoint?.cursorJson || null,
        publishableCount: summary.publishableCount,
        publishedCount: summary.publishedCount,
        queuedCount: summary.queuedCount,
        skippedCount: summary.skippedCount,
        status: "SUCCEEDED",
      },
    });

    await db.publishingStream.update({
      where: {
        id: stream.id,
      },
      data: {
        consecutiveFailureCount: 0,
        lastRunCompletedAt: new Date(),
        lastRunStartedAt: fetchRun.startedAt,
      },
    });

    await createAuditEventRecord(
      {
        action: "FETCH_RUN_COMPLETED",
        actorId,
        entityId: completedRun.id,
        entityType: "fetch_run",
        payloadJson: {
          duplicateCount: summary.duplicateCount,
          failedCount: summary.failedCount,
          fetchedCount: summary.fetchedCount,
          heldCount: summary.heldCount,
          publishableCount: summary.publishableCount,
          publishedCount: summary.publishedCount,
          skippedCount: summary.skippedCount,
          streamId: stream.id,
        },
      },
      db,
    );

    return completedRun;
  } catch (error) {
    const failedRun = await db.fetchRun.update({
      where: {
        id: fetchRun.id,
      },
      data: {
        errorMessage: error instanceof Error ? error.message : `${error}`,
        finishedAt: new Date(),
        status: "FAILED",
      },
    });
    const nextFailureCount = stream.consecutiveFailureCount + 1;
    const nextStatus = nextFailureCount >= stream.retryLimit ? "PAUSED" : stream.status;

    await db.publishingStream.update({
      where: {
        id: stream.id,
      },
      data: {
        consecutiveFailureCount: nextFailureCount,
        lastFailureAt: new Date(),
        lastRunStartedAt: fetchRun.startedAt,
        status: nextStatus,
      },
    });

    await recordObservabilityEvent(
      {
        action: nextStatus === "PAUSED" ? "STREAM_EXECUTION_PAUSED" : "FETCH_RUN_FAILED",
        actorId,
        entityId: failedRun.id,
        entityType: "fetch_run",
        error,
        message: error instanceof Error ? error.message : "Fetch run failed.",
        payload: {
          streamId: stream.id,
        },
      },
      db,
    );

    throw error;
  }
}

/** Executes all due scheduled stream runs and any pending scheduled publish attempts. */
export async function runScheduledStreams({ now = new Date() } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const streams = await db.publishingStream.findMany({
    where: {
      status: "ACTIVE",
    },
  });
  const dueStreams = streams.filter((stream) => {
    if (!stream.lastRunCompletedAt) {
      return true;
    }

    const nextRunAt = new Date(
      stream.lastRunCompletedAt.getTime() + stream.scheduleIntervalMinutes * 60 * 1000,
    );

    return nextRunAt <= now;
  });
  const results = [];

  for (const stream of dueStreams) {
    try {
      results.push(await runStreamFetch(stream.id, { now, triggerType: "scheduled" }, db));
    } catch {
      // The failure is already recorded in audit and observability layers.
    }
  }

  const dueScheduledAttempts = await db.publishAttempt.findMany({
    include: {
      post: true,
    },
    where: {
      post: {
        scheduledPublishAt: {
          lte: now,
        },
      },
      status: "PENDING",
    },
  });

  for (const attempt of dueScheduledAttempts) {
    try {
      await executePublishAttempt(db, attempt.id);
    } catch {
      // The failure is already recorded in audit and observability layers.
    }
  }

  const failedAttempts = await db.publishAttempt.findMany({
    include: {
      articleMatch: {
        include: {
          publishAttempts: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      stream: true,
    },
    orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
    where: {
      status: "FAILED",
    },
  });
  const latestAttemptByMatch = new Map();

  for (const attempt of failedAttempts) {
    if (!latestAttemptByMatch.has(attempt.articleMatchId)) {
      latestAttemptByMatch.set(attempt.articleMatchId, attempt);
    }
  }

  const dueRetryAttempts = [...latestAttemptByMatch.values()].filter((attempt) =>
    isRetryablePublishAttempt(attempt, now),
  );

  for (const attempt of dueRetryAttempts) {
    try {
      await retryPublishAttempt(
        attempt.id,
        {
          automated: true,
        },
        db,
      );
    } catch {
      // Retry failures are already recorded through the destination publish flow.
    }
  }

  return {
    dueStreamCount: dueStreams.length,
    processedScheduledAttempts: dueScheduledAttempts.length,
    retriedPublishAttempts: dueRetryAttempts.length,
    results,
  };
}

export async function getDestinationConnectionSnapshot(prisma) {
  return getDestinationManagementSnapshot(prisma);
}

/** Returns held-for-review matches for the admin review queue. */
export async function listReviewableArticleMatches(
  { page = 1, pageSize = 20, search = "" } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const normalizedSearch = normalizeSearchText(search);
  const where = {
    status: "HELD_FOR_REVIEW",
    ...(normalizedSearch
      ? {
          OR: [
            {
              canonicalPost: {
                translations: {
                  some: {
                    title: {
                      contains: normalizedSearch,
                    },
                  },
                },
              },
            },
            {
              fetchedArticle: {
                title: {
                  contains: normalizedSearch,
                },
              },
            },
          ],
        }
      : {}),
  };
  const totalItems = await db.articleMatch.count({ where });
  const pagination = createPagination(totalItems, page, pageSize);
  const items = await db.articleMatch.findMany({
    include: {
      canonicalPost: {
        include: {
          translations: true,
        },
      },
      destination: true,
      fetchedArticle: true,
      stream: true,
    },
    orderBy: [{ createdAt: "desc" }],
    skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
    take: pagination.pageSize,
    where,
  });

  return {
    items,
    pagination,
  };
}

/** Returns the published-post inventory used by admin listing surfaces. */
export async function listPublishedPostsForInventory(
  { locale, page = 1, pageSize = 20, search = "" } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const normalizedSearch = trimText(search);
  const where = {
    status: "PUBLISHED",
    ...(normalizedSearch
      ? {
          OR: [
            {
              slug: {
                contains: normalizedSearch,
              },
            },
            {
              translations: {
                some: {
                  title: {
                    contains: normalizedSearch,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
  const totalItems = await db.post.count({ where });
  const pagination = createPagination(totalItems, page, pageSize);
  const posts = await db.post.findMany({
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      publishAttempts: {
        orderBy: [{ createdAt: "desc" }],
      },
      translations: {
        include: {
          seoRecord: true,
        },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
    take: pagination.pageSize,
    where,
  });

  return {
    pagination,
    posts,
  };
}
