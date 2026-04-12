/**
 * Locale-aware NewsPub category landing page.
 */

import { cache } from "react";
import { notFound } from "next/navigation";

import { StructuredDataBundle } from "@/components/seo";
import { PublicCollectionPage } from "@/components/public";
import { getRequiredMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { getPublishedCategoryPageData } from "@/features/public-site";
import { env } from "@/lib/env/server";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;
const getCachedCategoryPageData = cache(async (locale, slug, page = 1) =>
  getPublishedCategoryPageData({ locale, page, slug }),
);

/**
 * Builds metadata for a locale-aware NewsPub category landing page.
 */
export async function generateMetadata({ params, searchParams }) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const messages = await getRequiredMessages(locale);
  const pageData = await getCachedCategoryPageData(locale, slug, 1);
  const title = pageData?.entity?.name
    ? `${pageData.entity.name} stories`
    : messages.public?.common?.topCategoriesTitle || "Category";
  const page = Number.parseInt(`${resolvedSearchParams?.page ?? ""}`.trim(), 10);

  return buildPageMetadata({
    description: pageData?.entity?.description || messages.public?.home?.discoveryDescription || messages.site.tagline,
    locale,
    query: Number.isFinite(page) && page > 1 ? { page } : undefined,
    segments: publicRouteSegments.category(slug),
    title,
  });
}
/**
 * Renders the NewsPub locale category slug page.
 */

export default async function CategoryPage({ params, searchParams }) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const page = Number.parseInt(`${resolvedSearchParams?.page ?? "1"}`.trim(), 10);
  const resolvedPage = Number.isFinite(page) && page > 0 ? page : 1;
  const [messages, pageData] = await Promise.all([
    getRequiredMessages(locale),
    getCachedCategoryPageData(locale, slug, resolvedPage),
  ]);

  if (!pageData) {
    notFound();
  }

  return (
    <>
      <StructuredDataBundle
        idPrefix={`category-${pageData.entity.slug}`}
        items={[
          buildBreadcrumbJsonLd([
            {
              href: `/${locale}`,
              label: messages.site.navigation.home,
            },
            {
              href: pageData.entity.path,
              label: pageData.entity.name,
            },
          ]),
        ]}
      />
      <PublicCollectionPage
        advertContactHref={env.contact.whatsappAdvertUrl}
        collectionSlug={pageData.entity.slug}
        collectionView="category"
        entity={pageData.entity}
        locale={locale}
        messages={messages.public}
        pageContent={{
          description: messages.public?.home?.description,
          eyebrow: messages.public?.common?.topCategoriesTitle || "Category",
          title: pageData.entity.name,
        }}
        pageData={pageData}
      />
    </>
  );
}
