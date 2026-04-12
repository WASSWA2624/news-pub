/**
 * Locale-aware NewsPub news index page.
 */

import { PublicCollectionPage } from "@/components/public";
import { getRequiredMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { getPublishedNewsIndexData, publicListingPageSize } from "@/features/public-site";
import { env } from "@/lib/env/server";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

/**
 * Builds metadata for the locale-aware NewsPub story index.
 */
export async function generateMetadata({ params, searchParams }) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const messages = await getRequiredMessages(locale);
  const pageContent = messages.public?.news || {};
  const page = Number.parseInt(`${resolvedSearchParams?.page ?? ""}`.trim(), 10);

  return buildPageMetadata({
    description: pageContent.metaDescription || pageContent.description || messages.site.tagline,
    locale,
    query: Number.isFinite(page) && page > 1 ? { page } : undefined,
    segments: publicRouteSegments.news,
    title: pageContent.metaTitle || pageContent.title || messages.site.title,
  });
}
/**
 * Renders the NewsPub locale news page.
 */

export default async function NewsIndexPage({ params, searchParams }) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams?.page;
  const [messages, pageData] = await Promise.all([
    getRequiredMessages(locale),
    getPublishedNewsIndexData({
      locale,
      page,
      pageSize: publicListingPageSize,
    }),
  ]);

  return (
    <PublicCollectionPage
      advertContactHref={env.contact.whatsappAdvertUrl}
      collectionView="news"
      locale={locale}
      messages={messages.public}
      pageContent={messages.public?.news || {}}
      pageData={pageData}
    />
  );
}
