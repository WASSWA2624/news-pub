/**
 * Locale-aware NewsPub disclaimer page.
 */

import { PublicStaticPage } from "@/components/public";
import { getRequiredMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

/**
 * Builds metadata for the locale-aware NewsPub disclaimer page.
 */
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getRequiredMessages(locale);
  const pageContent = messages?.public?.pages?.disclaimer || {};

  return buildPageMetadata({
    description: pageContent.meta_description || pageContent.description || messages.site.tagline,
    locale,
    segments: publicRouteSegments.disclaimer,
    title: pageContent.meta_title || pageContent.title || messages.site.title,
  });
}
/**
 * Renders the NewsPub locale disclaimer page.
 */

export default async function DisclaimerPage({ params }) {
  const { locale } = await params;
  const messages = await getRequiredMessages(locale);

  return <PublicStaticPage locale={locale} pageContent={messages.public?.pages?.disclaimer || {}} />;
}
