/**
 * Locale-aware NewsPub privacy page.
 */

import { PublicStaticPage } from "@/components/public";
import { getMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

/**
 * Builds metadata for the locale-aware NewsPub privacy page.
 */
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getMessages(locale);
  const pageContent = messages?.public?.pages?.privacy || {};

  return buildPageMetadata({
    description: pageContent.metaDescription || pageContent.description || messages.site.tagline,
    locale,
    segments: publicRouteSegments.privacy,
    title: pageContent.metaTitle || pageContent.title || messages.site.title,
  });
}
/**
 * Renders the NewsPub locale privacy page.
 */

export default async function PrivacyPage({ params }) {
  const { locale } = await params;
  const messages = await getMessages(locale);

  return <PublicStaticPage locale={locale} pageContent={messages.public?.pages?.privacy || {}} />;
}
