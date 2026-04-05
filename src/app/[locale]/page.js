import { PublicHomePage } from "@/components/public";
import { getMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { getPublishedHomePageData } from "@/features/public-site";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getMessages(locale);
  const pageContent = messages?.public?.home || {};

  return buildPageMetadata({
    description: pageContent.metaDescription || pageContent.description || messages.site.tagline,
    locale,
    segments: publicRouteSegments.home,
    title: pageContent.metaTitle || pageContent.title || messages.site.title,
  });
}

export default async function LocaleHomePage({ params }) {
  const { locale } = await params;
  const [messages, pageData] = await Promise.all([
    getMessages(locale),
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
