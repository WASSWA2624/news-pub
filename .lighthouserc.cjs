const baseUrl = process.env.LHCI_BASE_URL || "http://127.0.0.1:3000";
const homePath = process.env.LHCI_HOME_PATH || "/en";
const newsPath = process.env.LHCI_NEWS_PATH || "/en/news";
const searchPath = process.env.LHCI_SEARCH_PATH || "/en/search?q=climate";
const storyPath = process.env.LHCI_STORY_PATH || "/en/news/climate-resilience-market-watch";

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        budgets: [{ path: "lighthouse-budget.json" }],
        chromeFlags: "--no-sandbox",
      },
      startServerCommand: "npm run start",
      startServerReadyPattern: "ready on",
      url: [
        `${baseUrl}${homePath}`,
        `${baseUrl}${newsPath}`,
        `${baseUrl}${searchPath}`,
        `${baseUrl}${storyPath}`,
      ],
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2800 }],
        "total-blocking-time": ["error", { maxNumericValue: 250 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      outputDir: ".lighthouseci",
      target: "filesystem",
    },
  },
};
