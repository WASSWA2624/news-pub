/**
 * Metadata helpers for locale-aware NewsPub published-story pages.
 */

import { publicRouteSegments } from "@/features/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

/**
 * Builds story-detail metadata from the shared public story page model.
 *
 * Keeping this outside the JSX route file makes the metadata rules easy to test without changing the App Router
 * surface that Next.js renders.
 */
export function buildStoryPageMetadata({ locale, messages, pageData, slug }) {
  if (!pageData) {
    return buildPageMetadata({
      description: messages.site.tagline,
      locale,
      segments: publicRouteSegments.newsPost(slug),
      title: messages.site.title,
    });
  }

  return buildPageMetadata({
    authors: pageData.article.authors,
    canonical_url: pageData.article.canonical_url,
    description: pageData.article.meta_description || pageData.article.summary,
    image: pageData.article.seoImage || pageData.article.image,
    keywords: pageData.article.keywords,
    locale,
    modifiedTime: pageData.article.updated_at,
    noindex: pageData.article.noindex,
    openGraphDescription: pageData.article.openGraphDescription,
    openGraphTitle: pageData.article.openGraphTitle || pageData.article.meta_title || pageData.article.title,
    publishedTime: pageData.article.published_at,
    segments: publicRouteSegments.newsPost(slug),
    title: pageData.article.meta_title || pageData.article.title,
    twitter_description: pageData.article.twitter_description,
    twitter_title: pageData.article.twitter_title,
    type: "article",
  });
}
