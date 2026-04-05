import { redirect } from "next/navigation";

import { defaultLocale } from "@/features/i18n/config";
import { buildLocaleRootPath } from "@/features/i18n/routing";

export default function RootPage() {
  redirect(buildLocaleRootPath(defaultLocale));
}
