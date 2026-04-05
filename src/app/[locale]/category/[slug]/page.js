import { notFound } from "next/navigation";

import { StructuredDataBundle } from "@/components/seo";
import { PublicCollectionPage } from "@/components/public";
import { getMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { getPublishedCategoryPageData } from "@/features/public-site";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params, searchParams }) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const messages = await getMessages(locale);
  const pageData = await getPublishedCategoryPageData({ locale, slug });
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

export default async function CategoryPage({ params, searchParams }) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams?.page;
  const [messages, pageData] = await Promise.all([
    getMessages(locale),
    getPublishedCategoryPageData({ locale, page, slug }),
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
        entity={pageData.entity}
        locale={locale}
        messages={messages.public}
        pageContent={{
          description: messages.public?.home?.description,
          eyebrow: messages.public?.common?.topCategoriesTitle || "Category",
          title: pageData.entity.name,
        }}
        pageData={pageData}
        pathname={pageData.entity.path}
        query={{}}
      />
    </>
  );
}
