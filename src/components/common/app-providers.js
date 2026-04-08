"use client";

/**
 * Top-level client providers that wire Redux and other shared NewsPub app context.
 */

import GlobalStyles from "@/app/globals";
import StoreProvider from "@/store/provider";
import { lightTheme } from "@/styles/theme";
import { ThemeProvider } from "styled-components";
/**
 * Renders the app Providers in NewsPub UI.
 */

export default function AppProviders({ children }) {
  return (
    <StoreProvider>
      <ThemeProvider theme={lightTheme}>
        <GlobalStyles />
        {children}
      </ThemeProvider>
    </StoreProvider>
  );
}
