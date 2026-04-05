import SeoManagementScreen from "@/components/admin/seo-management-screen";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getSeoManagementSnapshot } from "@/features/seo";

export default async function SeoPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getSeoManagementSnapshot(),
  ]);

  return <SeoManagementScreen copy={messages.admin.seoManagement} initialData={snapshot} />;
}
