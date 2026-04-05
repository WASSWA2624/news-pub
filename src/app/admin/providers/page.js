import ProviderConfigurationScreen from "@/components/admin/provider-configuration-screen";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getAiProviderCatalogSummary } from "@/lib/ai/provider-catalog";
import { getProviderConfigurationSnapshot } from "@/lib/ai/provider-configs";

export default async function ProvidersPage() {
  const [messages, snapshot, providerCatalog] = await Promise.all([
    getMessages(defaultLocale),
    getProviderConfigurationSnapshot(),
    getAiProviderCatalogSummary(),
  ]);

  return (
    <ProviderConfigurationScreen
      copy={messages.admin.providerConfiguration}
      initialData={{
        ...snapshot,
        providerCatalog,
      }}
    />
  );
}
