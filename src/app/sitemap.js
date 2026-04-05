import { getSitemapEntries } from "@/features/seo";

export const revalidate = 300;

export default async function sitemap() {
  return getSitemapEntries();
}
