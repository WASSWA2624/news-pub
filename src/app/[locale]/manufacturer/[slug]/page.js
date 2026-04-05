import { notFound } from "next/navigation";

import { PublicCollectionPage } from "@/components/public";
import { getMessages } from "@/features/i18n/get-messages";
import { publicRouteSegments } from "@/features/i18n/routing";
import { getPublishedLandingPageData } from "@/features/public-site";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params, searchParams }) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const messages = await getMessages(locale);
  const pageData = await getPublishedLandingPageData({
    entityKind: "manufacturer",
    locale,
    slug,
  });
  const title = pageData?.entity?.name
    ? `${pageData.entity.name} manufacturer`
    : messages.public?.common?.topManufacturersTitle || "Manufacturer";
  const page = Number.parseInt(`${resolvedSearchParams?.page ?? ""}`.trim(), 10);

  return buildPageMetadata({
    description:
      pageData?.entity?.description || messages.public?.home?.discoveryDescription || messages.site.tagline,
    locale,
    query: Number.isFinite(page) && page > 1 ? { page } : undefined,
    segments: publicRouteSegments.manufacturer(slug),
    title,
  });
}

export default async function ManufacturerPage({ params, searchParams }) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams?.page;
  const [messages, pageData] = await Promise.all([
    getMessages(locale),
    getPublishedLandingPageData({
      entityKind: "manufacturer",
      locale,
      page,
      slug,
    }),
  ]);

  if (!pageData) {
    notFound();
  }

  return (
    <PublicCollectionPage
      entity={pageData.entity}
      locale={locale}
      messages={messages.public}
      pageContent={{
        description: messages.public?.home?.discoveryDescription,
        eyebrow: messages.public?.common?.topManufacturersTitle || "Manufacturer",
        resultsTitle: messages.public?.blog?.resultsTitle,
        title: messages.public?.common?.topManufacturersTitle || "Manufacturer",
      }}
      pageData={pageData}
      pathname={pageData.entity.path}
      query={{}}
    />
  );
}
