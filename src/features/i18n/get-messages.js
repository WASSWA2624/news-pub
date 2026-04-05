import { getLocaleDefinition } from "@/features/i18n/config";

export async function getMessages(locale) {
  const definition = getLocaleDefinition(locale);

  if (!definition) {
    return null;
  }

  const messageModule = await definition.loadMessages();

  return messageModule.default;
}
