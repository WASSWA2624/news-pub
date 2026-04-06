import { createSlug, normalizeDisplayText } from "../normalization/index.js";
import { listProviderDefinitions } from "./provider-definitions.js";

const PROVIDER_CATEGORY_FIELD_KEYS = new Set(["category", "categories"]);

const CATEGORY_ORDER = Object.freeze([
  "breaking",
  "top",
  "general",
  "world",
  "politics",
  "business",
  "technology",
  "science",
  "health",
  "sports",
  "entertainment",
  "lifestyle",
  "education",
  "environment",
  "food",
  "tourism",
  "crime",
  "domestic",
  "other",
]);

const CATEGORY_DESCRIPTION_OVERRIDES = Object.freeze({
  breaking: "Fast-moving breaking developments and urgent updates across the news cycle.",
  business: "Finance, economics, markets, companies, and business trend coverage.",
  crime: "Law enforcement, public safety, investigations, court cases, and criminal justice reporting.",
  domestic: "National and local developments, public affairs, and region-specific issues within a country.",
  education: "Schools, universities, policy, research, student outcomes, and learning innovation.",
  entertainment: "Film, television, music, celebrity, culture, and performing arts coverage.",
  environment: "Climate, conservation, pollution, sustainability, weather, and natural systems reporting.",
  food: "Food industry coverage, agriculture, restaurants, recipes, and culinary trends.",
  general: "Broad-interest headlines that do not need a narrower topic beat.",
  health: "Medicine, public health, wellness, clinical research, and treatment updates.",
  lifestyle: "Consumer living, wellness, beauty, travel, and everyday lifestyle trends.",
  other: "Niche or uncategorized stories outside the main provider-defined beats.",
  politics: "Government, elections, legislation, diplomacy, and public policy coverage.",
  science: "Scientific discoveries, research, space, medicine, and innovation coverage.",
  sports: "Matches, leagues, athletes, rankings, and sports business developments.",
  technology: "Technology, AI, software, devices, startups, cybersecurity, and digital policy coverage.",
  top: "Trending and most-recognized headlines surfaced by provider ranking.",
  tourism: "Travel demand, destinations, hospitality, tourism policy, and visitor economy reporting.",
  world: "International developments across politics, business, technology, conflict, and diplomacy.",
});

const CATEGORY_SEO_SLUG_OVERRIDES = Object.freeze({
  breaking: "breaking-news",
  crime: "crime-news",
  domestic: "domestic-news",
  general: "general-news",
  other: "other-news",
  top: "top-news",
});

function normalizeCategoryValue(value) {
  return `${value ?? ""}`.trim().toLowerCase();
}

function getCategorySortIndex(value) {
  const index = CATEGORY_ORDER.indexOf(value);

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function buildFallbackDescription(label, providerLabels) {
  const providerText = providerLabels.length ? ` across ${providerLabels.join(", ")}` : "";

  return `${label} coverage aligned with supported provider categories${providerText}.`;
}

export function getSuggestedCategorySlug(value, fallback = "category") {
  const normalizedValue = normalizeCategoryValue(value);

  if (!normalizedValue) {
    return fallback;
  }

  return CATEGORY_SEO_SLUG_OVERRIDES[normalizedValue] || createSlug(normalizedValue, fallback);
}

export function getSupportedProviderCategoryCatalog() {
  const categoryMap = new Map();

  for (const providerDefinition of listProviderDefinitions()) {
    for (const field of providerDefinition.fields || []) {
      if (!PROVIDER_CATEGORY_FIELD_KEYS.has(field.key) || !Array.isArray(field.options)) {
        continue;
      }

      for (const option of field.options) {
        const value = normalizeCategoryValue(option?.value);

        if (!value) {
          continue;
        }

        const currentEntry = categoryMap.get(value) || {
          label: normalizeDisplayText(option?.label) || value,
          providerKeys: new Set(),
          providerLabels: new Set(),
          value,
        };

        currentEntry.providerKeys.add(providerDefinition.key);
        currentEntry.providerLabels.add(providerDefinition.label);
        categoryMap.set(value, currentEntry);
      }
    }
  }

  return [...categoryMap.values()]
    .map((entry) => ({
      ...entry,
      providerKeys: [...entry.providerKeys].sort(),
      providerLabels: [...entry.providerLabels].sort(),
    }))
    .sort((left, right) => {
      const sortIndexDifference = getCategorySortIndex(left.value) - getCategorySortIndex(right.value);

      if (sortIndexDifference !== 0) {
        return sortIndexDifference;
      }

      return left.label.localeCompare(right.label);
    });
}

export function getSupportedCategoryPresets() {
  return getSupportedProviderCategoryCatalog().map((category) => ({
    description:
      CATEGORY_DESCRIPTION_OVERRIDES[category.value]
      || buildFallbackDescription(category.label, category.providerLabels),
    name: category.label,
    providerKeys: category.providerKeys,
    providerLabels: category.providerLabels,
    slug: getSuggestedCategorySlug(category.value),
    value: category.value,
  }));
}

export function getSupportedCategoryPresetRecords() {
  return getSupportedCategoryPresets().map(({ description, name, slug }) => ({
    description,
    name,
    slug,
  }));
}
