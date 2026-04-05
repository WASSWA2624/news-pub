import { sharedEnv } from "@/lib/env/shared";

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

export function getLocaleDefinition(locale) {
  return localeRegistry[locale] || null;
}

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
    isActive: isSupportedLocale(code),
    isDefault: code === defaultLocale,
    label: definition.label,
    loadMessages: definition.loadMessages,
  };
}

export function getRegisteredLocaleCodes() {
  return Object.keys(localeRegistry).sort((left, right) => left.localeCompare(right));
}

export function getRegisteredLocaleDefinitions() {
  return Object.entries(localeRegistry)
    .map(([code, definition]) => createLocaleMetadata(code, definition))
    .sort(compareLocaleDefinitions);
}

export function getSupportedLocaleDefinitions() {
  return getRegisteredLocaleDefinitions().filter((definition) => definition.isActive);
}

export function getInactiveLocaleDefinitions() {
  return getRegisteredLocaleDefinitions().filter((definition) => !definition.isActive);
}
