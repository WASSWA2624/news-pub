"use client";

/**
 * Client locale context used by NewsPub components that need active locale metadata.
 */

import { createContext, useContext } from "react";

const LocaleContext = createContext({
  locale: "en",
  messages: {},
});
/**
 * Provides locale and message context to client-side NewsPub components.
 */

export function LocaleMessagesProvider({ children, locale, messages }) {
  return (
    <LocaleContext.Provider value={{ locale, messages }}>{children}</LocaleContext.Provider>
  );
}
/**
 * Returns the current locale/message context for client-side NewsPub components.
 */

export function useLocaleMessages() {
  return useContext(LocaleContext);
}
