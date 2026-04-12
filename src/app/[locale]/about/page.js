/**
 * Locale-aware NewsPub about page.
 */

import { PublicStaticPage } from "@/components/public";
import { getRequiredMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

/**
 * Builds metadata for the locale-aware NewsPub about page.
 */
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getRequiredMessages(locale);
  const pageContent = messages?.public?.pages?.about || {};

  return buildPageMetadata({
    description: pageContent.meta_description || pageContent.description || messages.site.tagline,
    locale,
    segments: publicRouteSegments.about,
    title: pageContent.meta_title || pageContent.title || messages.site.title,
  });
}
/**
 * Renders the NewsPub locale about page.
 */

export default async function AboutPage({ params }) {
  const { locale } = await params;
  const messages = await getRequiredMessages(locale);

  return <PublicStaticPage locale={locale} pageContent={messages.public?.pages?.about || {}} />;
}
