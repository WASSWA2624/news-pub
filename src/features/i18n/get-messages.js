/**
 * Server helpers that load NewsPub locale message bundles for public and admin rendering.
 */

import { notFound } from "next/navigation";
import { cache } from "react";

import { getLocaleDefinition } from "@/features/i18n/config";
/**
 * Loads the message bundle for a registered NewsPub locale.
 */

export const getMessages = cache(async function getMessages(locale) {
  const definition = getLocaleDefinition(locale);

  if (!definition) {
    return null;
  }

  const messageModule = await definition.loadMessages();

  return messageModule.default;
});
/**
 * Loads the message bundle for a supported locale or exits through the App Router 404 flow.
 */

export const getRequiredMessages = cache(async function getRequiredMessages(locale) {
  const messages = await getMessages(locale);

  if (!messages) {
    notFound();
  }

  return messages;
});
