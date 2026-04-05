import LocalizationManagementScreen from "@/components/admin/localization-management-screen";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getLocalizationManagementSnapshot } from "@/features/posts";

export default async function LocalizationPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getLocalizationManagementSnapshot({
      locale: resolvedSearchParams.locale,
      postId: resolvedSearchParams.postId,
    }),
  ]);

  return (
    <LocalizationManagementScreen
      copy={messages.admin.localizationManagement}
      initialData={snapshot}
    />
  );
}
