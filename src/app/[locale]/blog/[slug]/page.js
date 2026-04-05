import { notFound } from "next/navigation";

import { PublicPostPage } from "@/components/public";
import { StructuredDataBundle } from "@/components/seo";
import { getMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { getPublishedPostPageData } from "@/features/public-site";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildPageMetadata,
  extractFaqItemsFromSections,
} from "@/lib/seo";

export const revalidate = 300;

function formatEquipmentDisplayName(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/[A-Z]/.test(trimmedValue)) {
    return trimmedValue;
  }

  const firstLetterIndex = trimmedValue.search(/[a-z]/i);

  if (firstLetterIndex === -1) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, firstLetterIndex)}${trimmedValue
    .charAt(firstLetterIndex)
    .toUpperCase()}${trimmedValue.slice(firstLetterIndex + 1)}`;
}

function formatEquipmentAwareTitle(title, equipmentName) {
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  const normalizedEquipmentName = typeof equipmentName === "string" ? equipmentName.trim() : "";
  const displayEquipmentName = formatEquipmentDisplayName(normalizedEquipmentName);

  if (!normalizedTitle) {
    return displayEquipmentName;
  }

  if (!normalizedEquipmentName || !displayEquipmentName) {
    return normalizedTitle;
  }

  if (normalizedTitle.toLowerCase().startsWith(normalizedEquipmentName.toLowerCase())) {
    return `${displayEquipmentName}${normalizedTitle.slice(normalizedEquipmentName.length)}`;
  }

  return normalizedTitle;
}

function normalizeArticlePresentation(article) {
  if (!article) {
    return article;
  }

  const equipmentName = article.equipment?.name || "";

  return {
    ...article,
    equipment: article.equipment
      ? {
          ...article.equipment,
          name: formatEquipmentDisplayName(equipmentName),
        }
      : article.equipment,
    metadata: {
      ...article.metadata,
      ogTitle: formatEquipmentAwareTitle(article.metadata?.ogTitle, equipmentName),
      title: formatEquipmentAwareTitle(article.metadata?.title, equipmentName),
      twitterTitle: formatEquipmentAwareTitle(article.metadata?.twitterTitle, equipmentName),
    },
    title: formatEquipmentAwareTitle(article.title, equipmentName),
  };
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const pageData = await getPublishedPostPageData({
    locale,
    slug,
  });

  if (!pageData) {
    return {};
  }

  const article = normalizeArticlePresentation(pageData.article);

  return buildPageMetadata({
    authors: article.metadata.authors,
    canonicalUrl: article.url,
    description: article.metadata.description,
    image: article.metadata.ogImage || article.heroImages[0] || null,
    locale,
    locales: article.availableLocales,
    modifiedTime: article.updatedAt,
    noindex: article.metadata.noindex,
    openGraphDescription: article.metadata.ogDescription,
    openGraphTitle: article.metadata.ogTitle,
    publishedTime: article.publishedAt,
    segments: publicRouteSegments.blogPost(slug),
    title: article.metadata.title,
    twitterDescription: article.metadata.twitterDescription,
    twitterTitle: article.metadata.twitterTitle,
    type: "article",
    keywords: article.metadata.keywords,
  });
}

export default async function BlogPostPage({ params, searchParams }) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const commentsPage = resolvedSearchParams?.commentsPage;
  const [messages, pageData] = await Promise.all([
    getMessages(locale),
    getPublishedPostPageData({
      commentsPage,
      locale,
      slug,
    }),
  ]);

  if (!pageData) {
    notFound();
  }

  const article = normalizeArticlePresentation(pageData.article);
  const resolvedPageData = {
    ...pageData,
    article,
  };

  return (
    <>
      <StructuredDataBundle
        idPrefix={`post-${article.slug || slug}`}
        items={[
          buildBreadcrumbJsonLd(article.breadcrumb),
          buildArticleJsonLd({
            article,
            locale,
          }),
          buildFaqJsonLd(extractFaqItemsFromSections(article.bodySections)),
        ]}
      />
      <PublicPostPage locale={locale} messages={messages.public} pageData={resolvedPageData} />
    </>
  );
}
