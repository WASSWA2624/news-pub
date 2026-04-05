import SourceConfigurationScreen from "@/components/admin/source-configuration-screen";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getSourceConfigurationSnapshot } from "@/lib/research";

export default async function SourcesPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getSourceConfigurationSnapshot(),
  ]);

  return (
    <SourceConfigurationScreen
      copy={messages.admin.sourceConfiguration}
      initialData={snapshot}
    />
  );
}
