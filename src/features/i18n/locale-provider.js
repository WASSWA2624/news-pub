"use client";

import { createContext, useContext } from "react";

const LocaleContext = createContext({
  locale: "en",
  messages: {},
});

export function LocaleMessagesProvider({ children, locale, messages }) {
  return (
    <LocaleContext.Provider value={{ locale, messages }}>{children}</LocaleContext.Provider>
  );
}

export function useLocaleMessages() {
  return useContext(LocaleContext);
}
