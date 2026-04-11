const DEFAULT_LOCALES = Object.freeze([
  { code: "en", isDefault: true, name: "English" },
]);

const LEGACY_COMPAT_CATEGORIES = Object.freeze([
  {
    description: "Governance, regulation, public policy, and institutional affairs.",
    name: "Policy",
    slug: "policy",
  },
]);

const SUPPORTED_CATEGORY_PRESETS = Object.freeze([
  {
    description: "Fast-moving breaking developments and urgent updates across the news cycle.",
    name: "Breaking",
    slug: "breaking-news",
  },
  {
    description: "Trending and most-recognized headlines surfaced by provider ranking.",
    name: "Top",
    slug: "top-news",
  },
  {
    description: "Broad-interest headlines that do not need a narrower topic beat.",
    name: "General",
    slug: "general-news",
  },
  {
    description: "International developments across politics, business, technology, conflict, and diplomacy.",
    name: "World",
    slug: "world",
  },
  {
    description: "Government, elections, legislation, diplomacy, and public policy coverage.",
    name: "Politics",
    slug: "politics",
  },
  {
    description: "Finance, economics, markets, companies, and business trend coverage.",
    name: "Business",
    slug: "business",
  },
  {
    description: "Technology, AI, software, devices, startups, cybersecurity, and digital policy coverage.",
    name: "Technology",
    slug: "technology",
  },
  {
    description: "Scientific discoveries, research, space, medicine, and innovation coverage.",
    name: "Science",
    slug: "science",
  },
  {
    description: "Medicine, public health, wellness, clinical research, and treatment updates.",
    name: "Health",
    slug: "health",
  },
  {
    description: "Matches, leagues, athletes, rankings, and sports business developments.",
    name: "Sports",
    slug: "sports",
  },
  {
    description: "Film, television, music, celebrity, culture, and performing arts coverage.",
    name: "Entertainment",
    slug: "entertainment",
  },
  {
    description: "Consumer living, wellness, beauty, travel, and everyday lifestyle trends.",
    name: "Lifestyle",
    slug: "lifestyle",
  },
  {
    description: "Schools, universities, policy, research, student outcomes, and learning innovation.",
    name: "Education",
    slug: "education",
  },
  {
    description: "Climate, conservation, pollution, sustainability, weather, and natural systems reporting.",
    name: "Environment",
    slug: "environment",
  },
  {
    description: "Food industry coverage, agriculture, restaurants, recipes, and culinary trends.",
    name: "Food",
    slug: "food",
  },
  {
    description: "Travel demand, destinations, hospitality, tourism policy, and visitor economy reporting.",
    name: "Tourism",
    slug: "tourism",
  },
  {
    description: "Law enforcement, public safety, investigations, court cases, and criminal justice reporting.",
    name: "Crime",
    slug: "crime-news",
  },
  {
    description: "National and local developments, public affairs, and region-specific issues within a country.",
    name: "Domestic",
    slug: "domestic-news",
  },
  {
    description: "Niche or uncategorized stories outside the main provider-defined beats.",
    name: "Other",
    slug: "other-news",
  },
]);

const DEFAULT_PROVIDERS = Object.freeze([
  {
    baseUrl: "https://api.mediastack.com/v1/news",
    description: "Mediastack provider integration with official live news filters and seeded defaults.",
    isDefault: true,
    isEnabled: true,
    isSelectable: true,
    label: "Mediastack",
    providerKey: "mediastack",
    requestDefaultsJson: {
      categories: ["general"],
      countries: ["us"],
      languages: ["en"],
      sort: "published_desc",
    },
  },
  {
    baseUrl: "https://newsdata.io/api/1/latest",
    description: "NewsData provider integration with official Latest and Archive filters and seeded defaults.",
    isDefault: false,
    isEnabled: true,
    isSelectable: true,
    label: "NewsData",
    providerKey: "newsdata",
    requestDefaultsJson: {
      category: ["top"],
      country: ["us"],
      endpoint: "latest",
      language: ["en"],
      removeDuplicate: "1",
    },
  },
  {
    baseUrl: "https://newsapi.org/v2/top-headlines",
    description: "NewsAPI provider integration for official Top Headlines and Everything filters.",
    isDefault: false,
    isEnabled: true,
    isSelectable: true,
    label: "NewsAPI",
    providerKey: "newsapi",
    requestDefaultsJson: {
      category: "general",
      country: "us",
      endpoint: "top-headlines",
    },
  },
]);

const DEFAULT_DESTINATIONS = Object.freeze([
  {
    accountHandle: "website",
    connectionStatus: "CONNECTED",
    kind: "WEBSITE",
    lastConnectedAt: new Date(),
    name: "Website",
    platform: "WEBSITE",
    settingsJson: {
      canonicalDomain: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
    slug: "website",
  },
  {
    accountHandle: "@newspub",
    connectionStatus: "DISCONNECTED",
    kind: "FACEBOOK_PAGE",
    name: "Facebook Page",
    platform: "FACEBOOK",
    settingsJson: {
      publishLinkPosts: true,
    },
    slug: "facebook-page",
  },
  {
    accountHandle: "@newspub",
    connectionStatus: "DISCONNECTED",
    kind: "INSTAGRAM_BUSINESS",
    name: "Instagram Business",
    platform: "INSTAGRAM",
    settingsJson: {
      appendHashtags: true,
    },
    slug: "instagram-business",
  },
]);

const DEFAULT_TEMPLATES = Object.freeze([
  {
    bodyTemplate:
      "{{title}}\n\n{{summary}}\n\nRead more: {{canonicalUrl}}\n\nSource: {{sourceName}} - {{sourceUrl}}",
    hashtagsTemplate: "",
    isDefault: true,
    locale: "en",
    name: "Website Default",
    platform: "WEBSITE",
    summaryTemplate: "{{summary}}",
    titleTemplate: "{{title}}",
  },
  {
    bodyTemplate: "{{body}}",
    hashtagsTemplate: "",
    isDefault: true,
    locale: "en",
    name: "Facebook Default",
    platform: "FACEBOOK",
    summaryTemplate: "{{summary}}",
    titleTemplate: "{{title}}",
  },
  {
    bodyTemplate:
      "{{title}}\n\n{{summary}}\n\nSource: {{sourceName}}\n{{hashtags}}",
    hashtagsTemplate: "#news #newspub",
    isDefault: true,
    locale: "en",
    name: "Instagram Default",
    platform: "INSTAGRAM",
    summaryTemplate: "{{summary}}",
    titleTemplate: "{{title}}",
  },
]);

const DEFAULT_STREAMS = Object.freeze([
  {
    categorySlugs: ["world", "business", "technology", "policy"],
    countryAllowlistJson: ["us"],
    defaultTemplateName: "Website Default",
    destinationSlug: "website",
    duplicateWindowHours: 72,
    includeKeywordsJson: [],
    languageAllowlistJson: ["en"],
    locale: "en",
    maxPostsPerRun: 8,
    mode: "AUTO_PUBLISH",
    name: "Website News Feed",
    providerKey: "newsapi",
    retryBackoffMinutes: 15,
    retryLimit: 3,
    scheduleIntervalMinutes: 60,
    settingsJson: {
      providerFilters: {
        categories: ["general"],
        countries: ["us"],
        languages: ["en"],
        sort: "published_desc",
      },
      socialPost: {
        linkPlacement: "RANDOM",
        linkUrl: null,
      },
    },
    slug: "website-news-feed",
    status: "ACTIVE",
    timezone: process.env.DEFAULT_SCHEDULE_TIMEZONE || "UTC",
  },
  {
    categorySlugs: ["world", "business"],
    countryAllowlistJson: ["us"],
    defaultTemplateName: "Facebook Default",
    destinationSlug: "facebook-page",
    duplicateWindowHours: 48,
    includeKeywordsJson: [],
    languageAllowlistJson: ["en"],
    locale: "en",
    maxPostsPerRun: 4,
    mode: "REVIEW_REQUIRED",
    name: "Facebook Headline Queue",
    providerKey: "mediastack",
    retryBackoffMinutes: 20,
    retryLimit: 3,
    scheduleIntervalMinutes: 60,
    settingsJson: {
      providerFilters: {
        categories: ["business"],
        countries: ["us"],
        languages: ["en"],
        sort: "published_desc",
      },
      socialPost: {
        linkPlacement: "RANDOM",
        linkUrl: null,
      },
    },
    slug: "facebook-headline-queue",
    status: "ACTIVE",
    timezone: process.env.DEFAULT_SCHEDULE_TIMEZONE || "UTC",
  },
  {
    categorySlugs: ["technology"],
    countryAllowlistJson: ["us"],
    defaultTemplateName: "Instagram Default",
    destinationSlug: "instagram-business",
    duplicateWindowHours: 48,
    includeKeywordsJson: ["visual", "photo", "image"],
    languageAllowlistJson: ["en"],
    locale: "en",
    maxPostsPerRun: 2,
    mode: "REVIEW_REQUIRED",
    name: "Instagram Visual Picks",
    providerKey: "mediastack",
    retryBackoffMinutes: 30,
    retryLimit: 3,
    scheduleIntervalMinutes: 120,
    settingsJson: {
      providerFilters: {
        categories: ["technology"],
        countries: ["us"],
        languages: ["en"],
        sort: "published_desc",
      },
      socialPost: {
        linkPlacement: "RANDOM",
        linkUrl: null,
      },
    },
    slug: "instagram-visual-picks",
    status: "ACTIVE",
    timezone: process.env.DEFAULT_SCHEDULE_TIMEZONE || "UTC",
  },
]);

async function getDefaultCategories() {
  return Object.freeze([
    ...SUPPORTED_CATEGORY_PRESETS,
    ...LEGACY_COMPAT_CATEGORIES,
  ]);
}

module.exports = {
  DEFAULT_DESTINATIONS,
  DEFAULT_LOCALES,
  DEFAULT_PROVIDERS,
  DEFAULT_STREAMS,
  DEFAULT_TEMPLATES,
  getDefaultCategories,
};
