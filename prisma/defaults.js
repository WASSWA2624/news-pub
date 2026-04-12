const DEFAULT_LOCALES = Object.freeze([
  { code: "en", is_default: true, name: "English" },
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
    base_url: "https://api.mediastack.com/v1/news",
    description: "Mediastack provider integration with official live news filters and seeded defaults.",
    is_default: true,
    is_enabled: true,
    is_selectable: true,
    label: "Mediastack",
    provider_key: "mediastack",
    request_defaults_json: {
      categories: ["general"],
      countries: ["us"],
      languages: ["en"],
      sort: "published_desc",
    },
  },
  {
    base_url: "https://newsdata.io/api/1/latest",
    description: "NewsData provider integration with official Latest and Archive filters and seeded defaults.",
    is_default: false,
    is_enabled: true,
    is_selectable: true,
    label: "NewsData",
    provider_key: "newsdata",
    request_defaults_json: {
      category: ["top"],
      country: ["us"],
      endpoint: "latest",
      language: ["en"],
      removeDuplicate: "1",
    },
  },
  {
    base_url: "https://newsapi.org/v2/top-headlines",
    description: "NewsAPI provider integration for official Top Headlines and Everything filters.",
    is_default: false,
    is_enabled: true,
    is_selectable: true,
    label: "NewsAPI",
    provider_key: "newsapi",
    request_defaults_json: {
      category: "general",
      country: "us",
      endpoint: "top-headlines",
    },
  },
]);

const DEFAULT_DESTINATIONS = Object.freeze([
  {
    account_handle: "website",
    connection_status: "CONNECTED",
    kind: "WEBSITE",
    last_connected_at: new Date(),
    name: "Website",
    platform: "WEBSITE",
    settings_json: {
      canonicalDomain: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
    slug: "website",
  },
  {
    account_handle: "@newspub",
    connection_status: "DISCONNECTED",
    kind: "FACEBOOK_PAGE",
    name: "Facebook Page",
    platform: "FACEBOOK",
    settings_json: {
      publishLinkPosts: true,
    },
    slug: "facebook-page",
  },
  {
    account_handle: "@newspub",
    connection_status: "DISCONNECTED",
    kind: "INSTAGRAM_BUSINESS",
    name: "Instagram Business",
    platform: "INSTAGRAM",
    settings_json: {
      appendHashtags: true,
    },
    slug: "instagram-business",
  },
]);

const DEFAULT_TEMPLATES = Object.freeze([
  {
    body_template:
      "{{title}}\n\n{{summary}}\n\nRead more: {{canonical_url}}\n\nSource: {{source_name}} - {{source_url}}",
    hashtags_template: "",
    is_default: true,
    locale: "en",
    name: "Website Default",
    platform: "WEBSITE",
    summary_template: "{{summary}}",
    title_template: "{{title}}",
  },
  {
    body_template: "{{body}}",
    hashtags_template: "",
    is_default: true,
    locale: "en",
    name: "Facebook Default",
    platform: "FACEBOOK",
    summary_template: "{{summary}}",
    title_template: "{{title}}",
  },
  {
    body_template:
      "{{title}}\n\n{{summary}}\n\nSource: {{source_name}}\n{{hashtags}}",
    hashtags_template: "#news #newspub",
    is_default: true,
    locale: "en",
    name: "Instagram Default",
    platform: "INSTAGRAM",
    summary_template: "{{summary}}",
    title_template: "{{title}}",
  },
]);

const DEFAULT_STREAMS = Object.freeze([
  {
    categorySlugs: ["world", "business", "technology", "policy"],
    country_allowlist_json: ["us"],
    defaultTemplateName: "Website Default",
    destinationSlug: "website",
    duplicate_window_hours: 72,
    include_keywords_json: [],
    language_allowlist_json: ["en"],
    locale: "en",
    max_posts_per_run: 8,
    mode: "AUTO_PUBLISH",
    name: "Website News Feed",
    provider_key: "newsapi",
    retry_backoff_minutes: 15,
    retry_limit: 3,
    schedule_interval_minutes: 60,
    settings_json: {
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
    country_allowlist_json: ["us"],
    defaultTemplateName: "Facebook Default",
    destinationSlug: "facebook-page",
    duplicate_window_hours: 48,
    include_keywords_json: [],
    language_allowlist_json: ["en"],
    locale: "en",
    max_posts_per_run: 4,
    mode: "REVIEW_REQUIRED",
    name: "Facebook Headline Queue",
    provider_key: "mediastack",
    retry_backoff_minutes: 20,
    retry_limit: 3,
    schedule_interval_minutes: 60,
    settings_json: {
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
    country_allowlist_json: ["us"],
    defaultTemplateName: "Instagram Default",
    destinationSlug: "instagram-business",
    duplicate_window_hours: 48,
    include_keywords_json: ["visual", "photo", "image"],
    language_allowlist_json: ["en"],
    locale: "en",
    max_posts_per_run: 2,
    mode: "REVIEW_REQUIRED",
    name: "Instagram Visual Picks",
    provider_key: "mediastack",
    retry_backoff_minutes: 30,
    retry_limit: 3,
    schedule_interval_minutes: 120,
    settings_json: {
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
