/**
 * Robots metadata generator for the NewsPub public website.
 */

import { getRobotsConfiguration } from "@/features/seo";

/**
 * Returns the robots metadata for the NewsPub public site.
 */
export default function robots() {
  return getRobotsConfiguration();
}
