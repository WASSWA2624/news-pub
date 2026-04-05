import PromptConfigurationScreen from "@/components/admin/prompt-configuration-screen";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getPromptConfigurationSnapshot } from "@/lib/ai";

export default async function PromptsPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getPromptConfigurationSnapshot(),
  ]);

  return (
    <PromptConfigurationScreen
      copy={messages.admin.promptConfiguration}
      initialData={snapshot}
    />
  );
}
