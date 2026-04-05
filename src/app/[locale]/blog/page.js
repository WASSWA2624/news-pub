import { PublicCollectionPage } from "@/components/public";
import { getMessages } from "@/features/i18n/get-messages";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { listPublishedPosts } from "@/features/public-site";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params, searchParams }) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const messages = await getMessages(locale);
  const pageContent = messages?.public?.blog || {};
  const page = Number.parseInt(`${resolvedSearchParams?.page ?? ""}`.trim(), 10);

  return buildPageMetadata({
    description: pageContent.metaDescription || pageContent.description || messages.site.tagline,
    locale,
    query: Number.isFinite(page) && page > 1 ? { page } : undefined,
    segments: publicRouteSegments.blog,
    title: pageContent.metaTitle || pageContent.title || messages.site.title,
  });
}

export default async function BlogIndexPage({ params, searchParams }) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams?.page;
  const [messages, pageData] = await Promise.all([
    getMessages(locale),
    listPublishedPosts({ locale, page }),
  ]);

  return (
    <PublicCollectionPage
      locale={locale}
      messages={messages.public}
      pageContent={messages.public?.blog || {}}
      pageData={pageData}
      pathname={buildLocalizedPath(locale, publicRouteSegments.blog)}
      query={{}}
    />
  );
}
