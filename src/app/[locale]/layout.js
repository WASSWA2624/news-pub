import { notFound } from "next/navigation";

import { StructuredDataBundle } from "@/components/seo";
import SiteShell from "@/components/layout/site-shell";
import { isSupportedLocale, supportedLocales } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { LocaleMessagesProvider } from "@/features/i18n/locale-provider";
import { getPublishedCategoryNavigationData } from "@/features/public-site";
import { buildOrganizationJsonLd } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({
    locale,
  }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    return {};
  }

  const messages = await getMessages(locale);

  return {
    title: messages.site.title,
    description: messages.site.tagline,
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const [messages, categoryLinks] = await Promise.all([
    getMessages(locale),
    getPublishedCategoryNavigationData({ locale, limit: 8 }),
  ]);

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
      <SiteShell categoryLinks={categoryLinks} locale={locale} messages={messages}>
        {children}
      </SiteShell>
    </LocaleMessagesProvider>
  );
}
