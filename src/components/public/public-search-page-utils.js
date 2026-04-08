import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";

function buildSearchHref(searchPath, { country = "", query = "" } = {}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("q", query);
  }

  if (country) {
    searchParams.set("country", country);
  }

  const queryString = searchParams.toString();

  return queryString ? `${searchPath}?${queryString}` : searchPath;
}

function formatResultCount(totalItems, locale, pageContent) {
  const formattedCount = new Intl.NumberFormat(locale).format(totalItems);

  if (totalItems === 1) {
    return pageContent.resultCountSingular || "1 published story";
  }

  return (pageContent.resultCountPlural || "{count} published stories").replace("{count}", formattedCount);
}

/**
 * Builds the locale-aware public search-page state model used by the collection view.
 */
export function buildPublicSearchPageModel({
  categoryLinks = [],
  collectionCountry = "all",
  locale,
  pageContent = {},
  pageData = {},
  searchFilters = {},
}) {
  const searchPath = buildLocalizedPath(locale, publicRouteSegments.search);
  const newsPath = buildLocalizedPath(locale, publicRouteSegments.news);
  const query = typeof pageData.query === "string" ? pageData.query.trim() : "";
  const normalizedCountry =
    typeof pageData.country === "string" && pageData.country.trim()
      ? pageData.country.trim()
      : collectionCountry && collectionCountry !== "all"
        ? `${collectionCountry}`.trim()
        : "";
  const countryOptions = Array.isArray(searchFilters.countries) ? searchFilters.countries : [];
  const activeCountry = countryOptions.find((country) => country.value === normalizedCountry);
  const countryLabel = pageData.countryLabel || activeCountry?.label || "";
  const totalItems = pageData?.pagination?.totalItems || 0;
  const hasCountry = Boolean(normalizedCountry && normalizedCountry !== "all");
  const hasQuery = Boolean(query);
  const hasResults = totalItems > 0;
  const resultCountLabel = formatResultCount(totalItems, locale, pageContent);
  const discoverySections = [
    {
      key: "categories",
      links: categoryLinks.slice(0, 6).map((category) => ({
        href: category.path,
        icon: "tag",
        key: category.slug,
        label: category.name,
        meta: category.count ? `${category.count}` : "",
      })),
      title: pageContent.browseCategoriesTitle || "Browse top categories",
    },
    {
      key: "countries",
      links: countryOptions
        .filter((country) => country.value !== normalizedCountry)
        .slice(0, 6)
        .map((country) => ({
          href: buildSearchHref(searchPath, {
            country: country.value,
            query,
          }),
          icon: "globe",
          key: country.value,
          label: country.label,
          meta: country.count ? `${country.count}` : "",
        })),
      title: pageContent.browseCountriesTitle || "Explore country coverage",
    },
  ].filter((section) => section.links.length);
  const activeFilters = [
    hasQuery
      ? {
          href: buildSearchHref(searchPath, { country: normalizedCountry }),
          key: "query",
          label: `“${query}”`,
        }
      : null,
    hasCountry
      ? {
          href: buildSearchHref(searchPath, { query }),
          key: "country",
          label: countryLabel,
        }
      : null,
  ].filter(Boolean);
  const quickActions = [
    hasQuery
      ? {
          href: buildSearchHref(searchPath, { country: normalizedCountry }),
          icon: "x",
          key: "clear-query",
          label: pageContent.clearQueryAction || "Clear search",
        }
      : null,
    hasCountry
      ? {
          href: buildSearchHref(searchPath, { query }),
          icon: "globe",
          key: "clear-country",
          label: pageContent.clearCountryAction || "All countries",
        }
      : null,
    !hasQuery || !hasResults
      ? {
          href: newsPath,
          icon: "news",
          key: "browse-latest",
          label: pageContent.browseLatestAction || "Browse latest stories",
        }
      : null,
  ].filter(Boolean);

  if (!hasQuery && hasCountry) {
    return {
      activeFilters,
      discoverySections,
      quickActions,
      resultCountLabel,
      showDiscoveryLead: true,
      stateDescription: `${resultCountLabel}. ${pageContent.filteredDescription || "Add a topic or source name to narrow this country coverage."}`,
      stateTip: pageContent.filteredTip || "Keep the country filter to refine by topic, or clear it to widen discovery.",
      stateTitle: `${pageContent.filteredTitle || "Coverage from"} ${countryLabel}`,
      statusTone: "filtered",
    };
  }

  if (!hasQuery) {
    return {
      activeFilters,
      discoverySections,
      quickActions,
      resultCountLabel,
      showDiscoveryLead: true,
      stateDescription: pageContent.emptyQueryDescription || "Browse the latest published stories below or jump into a topic, source, or region.",
      stateTip: pageContent.emptyQueryTip || "Search works best with headline phrases, source names, and category terms.",
      stateTitle: pageContent.emptyQueryTitle || "Search by topic, source, or category",
      statusTone: "discovery",
    };
  }

  if (!hasResults) {
    return {
      activeFilters,
      discoverySections,
      quickActions,
      resultCountLabel,
      showDiscoveryLead: true,
      stateDescription: pageContent.noResultsDescription || "Try a broader phrase, change countries, or jump into a category to keep exploring.",
      stateTip: pageContent.noResultsTip || "Shorter headline keywords and source names usually produce broader matches.",
      stateTitle: `${pageContent.noResultsTitle || "No published stories found"}: “${query}”${countryLabel ? ` ${pageContent.countryContextLabel || "in"} ${countryLabel}` : ""}`,
      statusTone: "warning",
    };
  }

  return {
    activeFilters,
    discoverySections,
    quickActions,
    resultCountLabel,
    showDiscoveryLead: Boolean(hasCountry),
    stateDescription: `${resultCountLabel}${countryLabel ? ` ${pageContent.countryContextLabel || "in"} ${countryLabel}` : ""}. ${pageContent.resultDescription || "Best matches appear first, with newer stories breaking ties."}`,
    stateTip: pageContent.resultTip || "",
    stateTitle: `${pageContent.resultsTitle || "Search results"}: “${query}”`,
    statusTone: "results",
  };
}
