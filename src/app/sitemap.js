/**
 * Sitemap generator for the locale-aware NewsPub public routes.
 */

import { getSitemapEntries } from "@/features/seo";

export const revalidate = 300;
/**
 * Builds the NewsPub sitemap entries.
 */

export default async function sitemap() {
  return getSitemapEntries();
}
