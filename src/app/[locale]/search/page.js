/**
 * Locale-aware NewsPub public search-results page.
 */

import { PublicCollectionPage } from "@/components/public";
import { getRequiredMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { getPublishedCategoryNavigationData, getPublishedSearchFilterData, searchPublishedPosts } from "@/features/public-site";
import { normalizePublicSearchQuery } from "@/features/public-site/search-utils";
import { env } from "@/lib/env/server";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

/**
 * Builds metadata for the locale-aware NewsPub public search page.
 */
export async function generateMetadata({ params, searchParams }) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const messages = await getRequiredMessages(locale);
  const pageContent = messages?.public?.search || {};
  const page = Number.parseInt(`${resolvedSearchParams?.page ?? ""}`.trim(), 10);
  const query = normalizePublicSearchQuery(resolvedSearchParams?.q);
  const country = typeof resolvedSearchParams?.country === "string" ? resolvedSearchParams.country.trim() : "all";

  return buildPageMetadata({
    description: pageContent.meta_description || pageContent.description || messages.site.tagline,
    locale,
    noindex: true,
    query: {
      ...(country && country !== "all" ? { country } : {}),
      ...(Number.isFinite(page) && page > 1 ? { page } : {}),
      ...(query ? { q: query } : {}),
    },
    segments: publicRouteSegments.search,
    title: pageContent.meta_title || pageContent.title || messages.site.title,
  });
}
/**
 * Renders the NewsPub locale search page.
 */

export default async function SearchPage({ params, searchParams }) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams?.page;
  const query = resolvedSearchParams?.q;
  const country = resolvedSearchParams?.country;
  const [messages, pageData, filterData, categoryLinks] = await Promise.all([
    getRequiredMessages(locale),
    searchPublishedPosts({ country, locale, page, search: query }),
    getPublishedSearchFilterData({ locale }),
    getPublishedCategoryNavigationData({ locale, limit: 6 }),
  ]);

  return (
    <PublicCollectionPage
      advertContactHref={env.contact.whatsappAdvertUrl}
      categoryLinks={categoryLinks}
      collectionCountry={pageData.country || "all"}
      collectionView="search"
      locale={locale}
      messages={messages.public}
      pageContent={messages.public?.search || {}}
      pageData={pageData}
      query={pageData.query || ""}
      searchFilters={filterData}
      showSearch
    />
  );
}
