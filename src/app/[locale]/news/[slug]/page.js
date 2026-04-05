import { notFound } from "next/navigation";

import { PublicStoryPage } from "@/components/public";
import { StructuredDataBundle } from "@/components/seo";
import { getMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { getPublishedStoryPageData } from "@/features/public-site";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const messages = await getMessages(locale);
  const pageData = await getPublishedStoryPageData({ locale, slug });

  if (!pageData) {
    return buildPageMetadata({
      description: messages.site.tagline,
      locale,
      segments: publicRouteSegments.newsPost(slug),
      title: messages.site.title,
    });
  }

  return buildPageMetadata({
    canonicalUrl: pageData.article.canonicalUrl,
    description: pageData.article.metaDescription || pageData.article.summary,
    image: pageData.article.image,
    keywords: pageData.article.keywords,
    locale,
    modifiedTime: pageData.article.updatedAt,
    openGraphTitle: pageData.article.metaTitle || pageData.article.title,
    publishedTime: pageData.article.publishedAt,
    segments: publicRouteSegments.newsPost(slug),
    title: pageData.article.metaTitle || pageData.article.title,
    type: "article",
  });
}

export default async function StoryPage({ params }) {
  const { locale, slug } = await params;
  const [messages, pageData] = await Promise.all([
    getMessages(locale),
    getPublishedStoryPageData({ locale, slug }),
  ]);

  if (!pageData) {
    notFound();
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
