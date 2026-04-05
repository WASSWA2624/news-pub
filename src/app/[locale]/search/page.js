import { PublicCollectionPage } from "@/components/public";
import { getMessages } from "@/features/i18n/get-messages";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { searchPublishedPosts } from "@/features/public-site";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params, searchParams }) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const messages = await getMessages(locale);
  const pageContent = messages?.public?.search || {};
  const page = Number.parseInt(`${resolvedSearchParams?.page ?? ""}`.trim(), 10);
  const query = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q.trim() : "";

  return buildPageMetadata({
    description: pageContent.metaDescription || pageContent.description || messages.site.tagline,
    locale,
    noindex: true,
    query: {
      ...(Number.isFinite(page) && page > 1 ? { page } : {}),
      ...(query ? { q: query } : {}),
    },
    segments: publicRouteSegments.search,
    title: pageContent.metaTitle || pageContent.title || messages.site.title,
  });
}

export default async function SearchPage({ params, searchParams }) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams?.page;
  const query = resolvedSearchParams?.q;
  const [messages, pageData] = await Promise.all([
    getMessages(locale),
    searchPublishedPosts({ locale, page, search: query }),
  ]);

  return (
    <PublicCollectionPage
      locale={locale}
      messages={messages.public}
      pageContent={messages.public?.search || {}}
      pageData={pageData}
      pathname={buildLocalizedPath(locale, publicRouteSegments.search)}
      query={query ? { q: query } : {}}
      showSearch
    />
  );
}
