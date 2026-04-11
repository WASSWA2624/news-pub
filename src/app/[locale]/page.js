/**
 * Locale-aware NewsPub public page for page.
 */

import { PublicHomePage } from "@/components/public";
import { getRequiredMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { getPublishedHomePageData, publicDataRevalidateSeconds } from "@/features/public-site";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = publicDataRevalidateSeconds;

/**
 * Builds metadata for the locale-aware NewsPub homepage.
 */
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getRequiredMessages(locale);
  const pageContent = messages?.public?.home || {};

  return buildPageMetadata({
    description: pageContent.metaDescription || pageContent.description || messages.site.tagline,
    locale,
    segments: publicRouteSegments.home,
    title: pageContent.metaTitle || pageContent.title || messages.site.title,
  });
}
/**
 * Renders the NewsPub locale page.
 */

export default async function LocaleHomePage({ params }) {
  const { locale } = await params;
  const [messages, pageData] = await Promise.all([
    getRequiredMessages(locale),
    getPublishedHomePageData({ locale }),
  ]);

  return (
    <PublicHomePage
      locale={locale}
      messages={messages.public}
      pageContent={messages.public?.home || {}}
      pageData={pageData}
    />
  );
}
