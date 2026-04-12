#!/usr/bin/env node

const crypto = require("node:crypto");

const { PrismaClient } = require("@prisma/client");

const { createAdapterFromDatabaseUrl, loadRuntimeEnv } = require("../prisma-runtime");

loadRuntimeEnv();

const fixtureStories = Object.freeze([
  {
    categorySlugs: ["environment", "business"],
    countryCodes: ["us", "ug"],
    imageUrl: "/perf/newsroom-hero.svg",
    slug: "climate-resilience-market-watch",
    sourceName: "Climate Desk",
    summary: "Regional climate financing and resilience projects are reshaping energy, farming, and city planning budgets.",
    title: "Climate resilience projects redraw market priorities",
  },
  {
    categorySlugs: ["technology", "environment"],
    countryCodes: ["us"],
    imageUrl: "/perf/newsroom-grid.svg",
    slug: "battery-storage-grid-upgrade",
    sourceName: "Energy Monitor",
    summary: "Battery storage pilots are moving from demonstration status into utility-scale procurement cycles.",
    title: "Battery storage rollouts move from pilot to procurement",
  },
  {
    categorySlugs: ["health", "technology"],
    countryCodes: ["gb", "us"],
    imageUrl: "/perf/newsroom-hero.svg",
    slug: "public-health-data-hubs",
    sourceName: "Public Health Briefing",
    summary: "Hospitals are consolidating response dashboards to reduce lag during regional outbreaks and supply shortages.",
    title: "Health systems expand real-time data hubs for response teams",
  },
  {
    categorySlugs: ["business", "world"],
    countryCodes: ["ke", "ug"],
    imageUrl: "/perf/newsroom-grid.svg",
    slug: "ports-and-trade-corridors",
    sourceName: "Trade Ledger",
    summary: "Logistics operators are repricing routes as ports and inland hubs compete for freight volume.",
    title: "Ports and inland trade corridors compete for faster cargo flows",
  },
  {
    categorySlugs: ["environment", "science"],
    countryCodes: ["ug", "tz"],
    imageUrl: "/perf/newsroom-hero.svg",
    slug: "regional-rainfall-forecast-centers",
    sourceName: "Weather Science Review",
    summary: "New rainfall models are helping agencies decide when to pre-position food, water, and flood-response teams.",
    title: "Forecast centers sharpen rainfall planning for flood season",
  },
  {
    categorySlugs: ["technology", "business"],
    countryCodes: ["ug"],
    imageUrl: "/perf/newsroom-grid.svg",
    slug: "local-startups-water-monitoring",
    sourceName: "Startup Wire",
    summary: "Utility teams are trialing low-cost sensors to track pressure loss and automate maintenance dispatch.",
    title: "Startups pitch water-network monitoring tools to city utilities",
  },
  {
    categorySlugs: ["business", "politics"],
    countryCodes: ["za", "ug"],
    imageUrl: "/perf/newsroom-hero.svg",
    slug: "city-bus-electrification-budget",
    sourceName: "Metro Policy Report",
    summary: "Transport agencies are tying bus-electrification plans to grid upgrades, depot redesign, and procurement reform.",
    title: "City bus electrification plans bring new budget tradeoffs",
  },
  {
    categorySlugs: ["education", "food"],
    countryCodes: ["ug", "rw"],
    imageUrl: "/perf/newsroom-grid.svg",
    slug: "school-meal-prices-and-farms",
    sourceName: "Education & Food Report",
    summary: "School meal programs are adjusting contracts to protect student nutrition while managing farm input costs.",
    title: "School meal contracts shift as food costs pressure districts",
  },
]);

function createHash(value) {
  return crypto.createHash("sha256").update(`${value}`).digest("hex");
}

function escapeHtml(value) {
  return `${value || ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFixtureParagraphs(story) {
  return [
    `${story.summary} Analysts say the current quarter is shaping investment decisions across public agencies and newsroom readers alike.`,
    `${story.title} is one of several tracking themes in the fixture dataset, which is tuned to exercise NewsPub home, search, category, and story routes under stable CI conditions.`,
    `Editors are monitoring how these signals affect planning cycles in ${story.countryCodes.join(", ").toUpperCase()}, with emphasis on operational readiness and budget resilience.`,
  ];
}

function buildStructuredContent(story, paragraphs) {
  return {
    excerpt: story.summary,
    sections: [
      {
        kind: "text",
        paragraphs,
        title: "Story",
      },
      {
        items: [
          {
            title: story.sourceName,
            url: `https://example.com/fixtures/${story.slug}`,
          },
        ],
        kind: "references",
        title: "Source Attribution",
      },
    ],
    title: story.title,
  };
}

async function seedFixtureStory(prisma, references, story, index) {
  const publishedAt = new Date(Date.now() - index * 60 * 60 * 1000);
  const sourceUrl = `https://example.com/fixtures/${story.slug}`;
  const paragraphs = buildFixtureParagraphs(story);
  const contentMd = paragraphs.join("\n\n");
  const contentHtml = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n");
  const structuredContentJson = buildStructuredContent(story, paragraphs);
  const dedupeFingerprint = `perf-fixture:${story.slug}`;
  const fetchedArticle = await prisma.fetchedArticle.upsert({
    where: {
      dedupeFingerprint,
    },
    update: {
      body: contentMd,
      imageUrl: story.imageUrl,
      language: "en",
      normalizedTitleHash: createHash(story.title.toLowerCase()),
      providerCountriesJson: story.countryCodes,
      publishedAt,
      rawPayloadJson: {
        fixture: true,
        slug: story.slug,
      },
      sourceName: story.sourceName,
      sourceUrl,
      sourceUrlHash: createHash(sourceUrl),
      summary: story.summary,
      title: story.title,
    },
    create: {
      body: contentMd,
      dedupeFingerprint,
      imageUrl: story.imageUrl,
      language: "en",
      normalizedTitleHash: createHash(story.title.toLowerCase()),
      providerConfigId: references.provider.id,
      providerCountriesJson: story.countryCodes,
      publishedAt,
      rawPayloadJson: {
        fixture: true,
        slug: story.slug,
      },
      sourceName: story.sourceName,
      sourceUrl,
      sourceUrlHash: createHash(sourceUrl),
      summary: story.summary,
      title: story.title,
    },
  });
  const post = await prisma.post.upsert({
    where: {
      slug: story.slug,
    },
    update: {
      editorialStage: "PUBLISHED",
      excerpt: story.summary,
      providerKey: references.provider.providerKey,
      publishedAt,
      sourceArticleId: fetchedArticle.id,
      sourceName: story.sourceName,
      sourceUrl,
      status: "PUBLISHED",
    },
    create: {
      editorialStage: "PUBLISHED",
      excerpt: story.summary,
      providerKey: references.provider.providerKey,
      publishedAt,
      slug: story.slug,
      sourceArticleId: fetchedArticle.id,
      sourceName: story.sourceName,
      sourceUrl,
      status: "PUBLISHED",
    },
  });
  const categoryIds = story.categorySlugs.map((slug) => {
    const category = references.categoryBySlug.get(slug);

    if (!category) {
      throw new Error(`Missing seeded category "${slug}" required for performance fixtures.`);
    }

    return category.id;
  });

  await prisma.postTranslation.upsert({
    where: {
      postId_locale: {
        locale: "en",
        postId: post.id,
      },
    },
    update: {
      contentHtml,
      contentMd,
      sourceAttribution: `Source: ${story.sourceName}`,
      structuredContentJson,
      summary: story.summary,
      title: story.title,
    },
    create: {
      contentHtml,
      contentMd,
      locale: "en",
      postId: post.id,
      sourceAttribution: `Source: ${story.sourceName}`,
      structuredContentJson,
      summary: story.summary,
      title: story.title,
    },
  });
  await prisma.postCategory.deleteMany({
    where: {
      categoryId: {
        notIn: categoryIds,
      },
      postId: post.id,
    },
  });
  await prisma.postCategory.createMany({
    data: categoryIds.map((categoryId) => ({
      categoryId,
      postId: post.id,
    })),
    skipDuplicates: true,
  });

  const articleMatch = await prisma.articleMatch.upsert({
    where: {
      fetchedArticleId_streamId: {
        fetchedArticleId: fetchedArticle.id,
        streamId: references.stream.id,
      },
    },
    update: {
      canonicalPostId: post.id,
      destinationId: references.destination.id,
      publishedAt,
      status: "PUBLISHED",
      workflowStage: "PUBLISHED",
    },
    create: {
      canonicalPostId: post.id,
      destinationId: references.destination.id,
      fetchedArticleId: fetchedArticle.id,
      publishedAt,
      status: "PUBLISHED",
      streamId: references.stream.id,
      workflowStage: "PUBLISHED",
    },
  });

  await prisma.publishAttempt.upsert({
    where: {
      idempotencyKey: `perf-fixture:${story.slug}:website`,
    },
    update: {
      articleMatchId: articleMatch.id,
      destinationId: references.destination.id,
      platform: "WEBSITE",
      postId: post.id,
      publishedAt,
      status: "SUCCEEDED",
      streamId: references.stream.id,
    },
    create: {
      articleMatchId: articleMatch.id,
      destinationId: references.destination.id,
      idempotencyKey: `perf-fixture:${story.slug}:website`,
      platform: "WEBSITE",
      postId: post.id,
      publishedAt,
      status: "SUCCEEDED",
      streamId: references.stream.id,
    },
  });
}

async function main() {
  const databaseUrl = `${process.env.DATABASE_URL || ""}`.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed performance fixtures.");
  }

  const prisma = new PrismaClient({
    adapter: createAdapterFromDatabaseUrl(databaseUrl),
  });

  try {
    const [provider, destination, stream, categories] = await Promise.all([
      prisma.newsProviderConfig.findFirst({
        orderBy: {
          isDefault: "desc",
        },
        where: {
          providerKey: "mediastack",
        },
      }),
      prisma.destination.findUnique({
        where: {
          slug: "website",
        },
      }),
      prisma.publishingStream.findUnique({
        where: {
          slug: "website-news-feed",
        },
      }),
      prisma.category.findMany({
        select: {
          id: true,
          slug: true,
        },
      }),
    ]);

    if (!provider || !destination || !stream) {
      throw new Error(
        "Missing baseline NewsPub seed data. Run `npm run prisma:seed` before `npm run perf:fixtures`.",
      );
    }

    const references = {
      categoryBySlug: new Map(categories.map((category) => [category.slug, category])),
      destination,
      provider,
      stream,
    };

    for (const [index, story] of fixtureStories.entries()) {
      await seedFixtureStory(prisma, references, story, index);
    }

    console.log(`Seeded ${fixtureStories.length} public performance fixtures.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Performance fixture seeding failed.");
  console.error(error instanceof Error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
