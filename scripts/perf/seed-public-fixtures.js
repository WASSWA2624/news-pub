#!/usr/bin/env node

const crypto = require("node:crypto");

const { PrismaClient } = require("@prisma/client");

const { createAdapterFromDatabaseUrl, loadRuntimeEnv } = require("../prisma-runtime");

loadRuntimeEnv();

const fixtureStories = Object.freeze([
  {
    categorySlugs: ["environment", "business"],
    countryCodes: ["us", "ug"],
    image_url: "/perf/newsroom-hero.svg",
    slug: "climate-resilience-market-watch",
    source_name: "Climate Desk",
    summary: "Regional climate financing and resilience projects are reshaping energy, farming, and city planning budgets.",
    title: "Climate resilience projects redraw market priorities",
  },
  {
    categorySlugs: ["technology", "environment"],
    countryCodes: ["us"],
    image_url: "/perf/newsroom-grid.svg",
    slug: "battery-storage-grid-upgrade",
    source_name: "Energy Monitor",
    summary: "Battery storage pilots are moving from demonstration status into utility-scale procurement cycles.",
    title: "Battery storage rollouts move from pilot to procurement",
  },
  {
    categorySlugs: ["health", "technology"],
    countryCodes: ["gb", "us"],
    image_url: "/perf/newsroom-hero.svg",
    slug: "public-health-data-hubs",
    source_name: "Public Health Briefing",
    summary: "Hospitals are consolidating response dashboards to reduce lag during regional outbreaks and supply shortages.",
    title: "Health systems expand real-time data hubs for response teams",
  },
  {
    categorySlugs: ["business", "world"],
    countryCodes: ["ke", "ug"],
    image_url: "/perf/newsroom-grid.svg",
    slug: "ports-and-trade-corridors",
    source_name: "Trade Ledger",
    summary: "Logistics operators are repricing routes as ports and inland hubs compete for freight volume.",
    title: "Ports and inland trade corridors compete for faster cargo flows",
  },
  {
    categorySlugs: ["environment", "science"],
    countryCodes: ["ug", "tz"],
    image_url: "/perf/newsroom-hero.svg",
    slug: "regional-rainfall-forecast-centers",
    source_name: "Weather Science Review",
    summary: "New rainfall models are helping agencies decide when to pre-position food, water, and flood-response teams.",
    title: "Forecast centers sharpen rainfall planning for flood season",
  },
  {
    categorySlugs: ["technology", "business"],
    countryCodes: ["ug"],
    image_url: "/perf/newsroom-grid.svg",
    slug: "local-startups-water-monitoring",
    source_name: "Startup Wire",
    summary: "Utility teams are trialing low-cost sensors to track pressure loss and automate maintenance dispatch.",
    title: "Startups pitch water-network monitoring tools to city utilities",
  },
  {
    categorySlugs: ["business", "politics"],
    countryCodes: ["za", "ug"],
    image_url: "/perf/newsroom-hero.svg",
    slug: "city-bus-electrification-budget",
    source_name: "Metro Policy Report",
    summary: "Transport agencies are tying bus-electrification plans to grid upgrades, depot redesign, and procurement reform.",
    title: "City bus electrification plans bring new budget tradeoffs",
  },
  {
    categorySlugs: ["education", "food"],
    countryCodes: ["ug", "rw"],
    image_url: "/perf/newsroom-grid.svg",
    slug: "school-meal-prices-and-farms",
    source_name: "Education & Food Report",
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
            title: story.source_name,
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
  const published_at = new Date(Date.now() - index * 60 * 60 * 1000);
  const source_url = `https://example.com/fixtures/${story.slug}`;
  const paragraphs = buildFixtureParagraphs(story);
  const content_md = paragraphs.join("\n\n");
  const content_html = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n");
  const structured_content_json = buildStructuredContent(story, paragraphs);
  const dedupe_fingerprint = `perf-fixture:${story.slug}`;
  const fetchedArticle = await prisma.fetchedArticle.upsert({
    where: {
      dedupe_fingerprint,
    },
    update: {
      body: content_md,
      image_url: story.image_url,
      language: "en",
      normalized_title_hash: createHash(story.title.toLowerCase()),
      provider_countries_json: story.countryCodes,
      published_at,
      raw_payload_json: {
        fixture: true,
        slug: story.slug,
      },
      source_name: story.source_name,
      source_url,
      source_url_hash: createHash(source_url),
      summary: story.summary,
      title: story.title,
    },
    create: {
      body: content_md,
      dedupe_fingerprint,
      image_url: story.image_url,
      language: "en",
      normalized_title_hash: createHash(story.title.toLowerCase()),
      provider_config_id: references.provider.id,
      provider_countries_json: story.countryCodes,
      published_at,
      raw_payload_json: {
        fixture: true,
        slug: story.slug,
      },
      source_name: story.source_name,
      source_url,
      source_url_hash: createHash(source_url),
      summary: story.summary,
      title: story.title,
    },
  });
  const post = await prisma.post.upsert({
    where: {
      slug: story.slug,
    },
    update: {
      editorial_stage: "PUBLISHED",
      excerpt: story.summary,
      provider_key: references.provider.provider_key,
      published_at,
      source_article_id: fetchedArticle.id,
      source_name: story.source_name,
      source_url,
      status: "PUBLISHED",
    },
    create: {
      editorial_stage: "PUBLISHED",
      excerpt: story.summary,
      provider_key: references.provider.provider_key,
      published_at,
      slug: story.slug,
      source_article_id: fetchedArticle.id,
      source_name: story.source_name,
      source_url,
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
      post_id_locale: {
        locale: "en",
        post_id: post.id,
      },
    },
    update: {
      content_html,
      content_md,
      source_attribution: `Source: ${story.source_name}`,
      structured_content_json,
      summary: story.summary,
      title: story.title,
    },
    create: {
      content_html,
      content_md,
      locale: "en",
      post_id: post.id,
      source_attribution: `Source: ${story.source_name}`,
      structured_content_json,
      summary: story.summary,
      title: story.title,
    },
  });
  await prisma.postCategory.deleteMany({
    where: {
      category_id: {
        notIn: categoryIds,
      },
      post_id: post.id,
    },
  });
  await prisma.postCategory.createMany({
    data: categoryIds.map((category_id) => ({
      category_id,
      post_id: post.id,
    })),
    skipDuplicates: true,
  });

  const articleMatch = await prisma.articleMatch.upsert({
    where: {
      fetched_article_id_stream_id: {
        fetched_article_id: fetchedArticle.id,
        stream_id: references.stream.id,
      },
    },
    update: {
      canonical_post_id: post.id,
      destination_id: references.destination.id,
      published_at,
      status: "PUBLISHED",
      workflow_stage: "PUBLISHED",
    },
    create: {
      canonical_post_id: post.id,
      destination_id: references.destination.id,
      fetched_article_id: fetchedArticle.id,
      published_at,
      status: "PUBLISHED",
      stream_id: references.stream.id,
      workflow_stage: "PUBLISHED",
    },
  });

  await prisma.publishAttempt.upsert({
    where: {
      idempotency_key: `perf-fixture:${story.slug}:website`,
    },
    update: {
      article_match_id: articleMatch.id,
      destination_id: references.destination.id,
      platform: "WEBSITE",
      post_id: post.id,
      published_at,
      status: "SUCCEEDED",
      stream_id: references.stream.id,
    },
    create: {
      article_match_id: articleMatch.id,
      destination_id: references.destination.id,
      idempotency_key: `perf-fixture:${story.slug}:website`,
      platform: "WEBSITE",
      post_id: post.id,
      published_at,
      status: "SUCCEEDED",
      stream_id: references.stream.id,
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
          is_default: "desc",
        },
        where: {
          provider_key: "mediastack",
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
