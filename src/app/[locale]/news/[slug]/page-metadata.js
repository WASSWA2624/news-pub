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
    canonicalUrl: pageData.article.canonicalUrl,
    description: pageData.article.metaDescription || pageData.article.summary,
    image: pageData.article.seoImage || pageData.article.image,
    keywords: pageData.article.keywords,
    locale,
    modifiedTime: pageData.article.updatedAt,
    noindex: pageData.article.noindex,
    openGraphDescription: pageData.article.openGraphDescription,
    openGraphTitle: pageData.article.openGraphTitle || pageData.article.metaTitle || pageData.article.title,
    publishedTime: pageData.article.publishedAt,
    segments: publicRouteSegments.newsPost(slug),
    title: pageData.article.metaTitle || pageData.article.title,
    twitterDescription: pageData.article.twitterDescription,
    twitterTitle: pageData.article.twitterTitle,
    type: "article",
  });
}
