const storyPath = process.env.LHCI_STORY_PATH || "/en/news";

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 2,
      settings: {
        budgets: [{ path: "lighthouse-budget.json" }],
      },
      startServerCommand: "npm run start",
      startServerReadyPattern: "ready on",
      url: [
        "http://127.0.0.1:3000/en",
        "http://127.0.0.1:3000/en/news",
        "http://127.0.0.1:3000/en/search?q=climate",
        `http://127.0.0.1:3000${storyPath}`,
      ],
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.8 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "total-blocking-time": ["warn", { maxNumericValue: 200 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
