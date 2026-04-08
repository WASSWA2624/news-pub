/**
 * Root route that redirects visitors to the configured default NewsPub locale.
 */

import { redirect } from "next/navigation";

import { defaultLocale } from "@/features/i18n/config";
import { buildLocaleRootPath } from "@/features/i18n/routing";

/**
 * Redirects the root request to the configured default NewsPub locale.
 */
export default function RootPage() {
  redirect(buildLocaleRootPath(defaultLocale));
}
