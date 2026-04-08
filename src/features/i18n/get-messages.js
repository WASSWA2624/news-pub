/**
 * Server helpers that load NewsPub locale message bundles for public and admin rendering.
 */

import { getLocaleDefinition } from "@/features/i18n/config";
/**
 * Loads the message bundle for a registered NewsPub locale.
 */

export async function getMessages(locale) {
  const definition = getLocaleDefinition(locale);

  if (!definition) {
    return null;
  }

  const messageModule = await definition.loadMessages();

  return messageModule.default;
}
