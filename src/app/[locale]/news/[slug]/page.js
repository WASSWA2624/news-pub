/**
 * Locale-aware NewsPub published-story page.
 */

import { cache } from "react";
import { notFound } from "next/navigation";

import NoticePage from "@/components/common/notice-page";
import { PublicStoryPage } from "@/components/public";
import { StructuredDataBundle } from "@/components/seo";
import { getRequiredMessages } from "@/features/i18n/get-messages";
import { getPublishedStoryPageData } from "@/features/public-site";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo";

import { buildStoryPageMetadata } from "./page-metadata";

/**
 * Locale-aware story detail route for published NewsPub articles.
 *
 * The route reuses the same page data model for metadata, structured data, and the rendered article so the public
 * detail page cannot drift away from the SEO pipeline.
 */
export const revalidate = 300;
const getCachedStoryPageData = cache(async (locale, slug) => getPublishedStoryPageData({ locale, slug }));

/** Builds the strongest available metadata for one published story. */
export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const messages = await getRequiredMessages(locale);
  const pageData = await getCachedStoryPageData(locale, slug);

  return buildStoryPageMetadata({
    locale,
    messages,
    pageData,
    slug,
  });
}

/** Renders the public story detail view plus breadcrumb and article JSON-LD. */
export default async function StoryPage({ params }) {
  const { locale, slug } = await params;
  const [messages, pageData] = await Promise.all([
    getRequiredMessages(locale),
    getCachedStoryPageData(locale, slug),
  ]);

  if (!pageData) {
    notFound();
  }

  if (pageData.databaseUnavailable) {
    return (
      <NoticePage
        description="NewsPub could not reach the database for this story request. The route is still available and will recover when the database connection is healthy."
        eyebrow={messages.site.title}
        icon="warning"
        notes={[
          "Check the database connection and migration state.",
          "Refresh this story after the database is available.",
        ]}
        title="Story temporarily unavailable"
      />
    );
  }

  return (
    <>
      <StructuredDataBundle
        idPrefix={`story-${pageData.article.slug}`}
        items={[
          buildBreadcrumbJsonLd([
            {
              href: `/${locale}`,
              label: messages.site.navigation.home,
            },
            {
              href: `/${locale}/news`,
              label: messages.site.navigation.news,
            },
            {
              href: pageData.article.path,
              label: pageData.article.title,
            },
          ]),
          buildArticleJsonLd({
            article: pageData.article,
          }),
        ]}
      />
      <PublicStoryPage locale={locale} messages={messages.public} pageData={pageData} />
    </>
  );
}
