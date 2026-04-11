/**
 * Locale layout that validates supported locales, loads messages, and wraps the NewsPub public shell.
 */

import { notFound } from "next/navigation";

import { StructuredDataBundle } from "@/components/seo";
import SiteShell from "@/components/layout/site-shell";
import { isSupportedLocale, supportedLocales } from "@/features/i18n/config";
import { getRequiredMessages } from "@/features/i18n/get-messages";
import { LocaleMessagesProvider } from "@/features/i18n/locale-provider";
import { getPublishedCategoryNavigationData, getPublishedSearchFilterData } from "@/features/public-site";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { buildOrganizationJsonLd } from "@/lib/seo";

export const dynamicParams = false;

/**
 * Precomputes the supported locale params for the NewsPub public route tree.
 */
export function generateStaticParams() {
  return supportedLocales.map((locale) => ({
    locale,
  }));
}

/**
 * Builds metadata for the locale-aware NewsPub public shell.
 */
export async function generateMetadata({ params }) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    return {};
  }

  const messages = await getRequiredMessages(locale);

  return {
    title: messages.site.title,
    description: messages.site.tagline,
  };
}
/**
 * Renders the locale-aware NewsPub public layout.
 */

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const [messages, categoryLinks, searchFilters] = await Promise.all([
    getRequiredMessages(locale),
    getPublishedCategoryNavigationData({ locale, limit: 8 }),
    getPublishedSearchFilterData({ locale }),
  ]);
  const searchPath = buildLocalizedPath(locale, publicRouteSegments.search);
  const countryLinks = (searchFilters?.countries || []).slice(0, 10).map((country) => ({
    count: country.count,
    flagEmoji: country.flagEmoji || "",
    flagImageUrl: country.flagImageUrl || "",
    label: country.label,
    path: `${searchPath}?country=${encodeURIComponent(country.value)}`,
    value: country.value,
  }));

  return (
    <LocaleMessagesProvider locale={locale} messages={messages}>
      <StructuredDataBundle
        idPrefix={`organization-${locale}`}
        items={[
          buildOrganizationJsonLd({
            description: messages.site.tagline,
            locale,
            name: messages.site.title,
          }),
        ]}
      />
      <SiteShell categoryLinks={categoryLinks} countryLinks={countryLinks} locale={locale} messages={messages}>
        {children}
      </SiteShell>
    </LocaleMessagesProvider>
  );
}
