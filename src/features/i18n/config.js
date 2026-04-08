/**
 * Locale registry and environment-backed language configuration for NewsPub public routes.
 */

import { sharedEnv } from "@/lib/env/shared";
import { formatLanguageFlagEmoji, formatLanguageFlagImageUrl } from "@/lib/languages";

export const localeRegistry = {
  en: {
    label: "English",
    loadMessages: () => import("@/messages/en.json"),
  },
};

const configuredLocales = sharedEnv.i18n.supportedLocales;
const missingLocaleDefinitions = configuredLocales.filter((locale) => !localeRegistry[locale]);

if (missingLocaleDefinitions.length) {
  throw new Error(
    [
      "Locale configuration is incomplete.",
      `Register locale definitions for: ${missingLocaleDefinitions.join(", ")}.`,
      "Add the matching message file and localeRegistry entry before enabling the locale.",
    ].join("\n"),
  );
}

if (!localeRegistry[sharedEnv.i18n.defaultLocale]) {
  throw new Error(
    `DEFAULT_LOCALE "${sharedEnv.i18n.defaultLocale}" is not registered in localeRegistry.`,
  );
}

export const supportedLocales = configuredLocales;
export const defaultLocale = sharedEnv.i18n.defaultLocale;
/**
 * Returns the registered locale definition for a NewsPub locale code.
 */

export function getLocaleDefinition(locale) {
  return localeRegistry[locale] || null;
}
/**
 * Returns whether a locale code is active in the current NewsPub runtime.
 */

export function isSupportedLocale(locale) {
  return supportedLocales.includes(locale);
}

function compareLocaleDefinitions(left, right) {
  if (left.isDefault !== right.isDefault) {
    return left.isDefault ? -1 : 1;
  }

  if (left.isActive !== right.isActive) {
    return left.isActive ? -1 : 1;
  }

  return left.code.localeCompare(right.code);
}

function createLocaleMetadata(code, definition) {
  return {
    code,
    flagEmoji: formatLanguageFlagEmoji(code),
    flagImageUrl: formatLanguageFlagImageUrl(code),
    isActive: isSupportedLocale(code),
    isDefault: code === defaultLocale,
    label: definition.label,
    loadMessages: definition.loadMessages,
  };
}
/**
 * Returns the locale codes registered in the NewsPub locale registry.
 */

export function getRegisteredLocaleCodes() {
  return Object.keys(localeRegistry).sort((left, right) => left.localeCompare(right));
}
/**
 * Returns all locale definitions registered for NewsPub, including inactive ones.
 */

export function getRegisteredLocaleDefinitions() {
  return Object.entries(localeRegistry)
    .map(([code, definition]) => createLocaleMetadata(code, definition))
    .sort(compareLocaleDefinitions);
}
/**
 * Returns the locale definitions that are currently active in NewsPub.
 */

export function getSupportedLocaleDefinitions() {
  return getRegisteredLocaleDefinitions().filter((definition) => definition.isActive);
}
/**
 * Returns the locale definitions that are registered but not currently active.
 */

export function getInactiveLocaleDefinitions() {
  return getRegisteredLocaleDefinitions().filter((definition) => !definition.isActive);
}
