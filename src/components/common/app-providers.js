"use client";

import GlobalStyles from "@/app/globals";
import StoreProvider from "@/store/provider";
import { lightTheme } from "@/styles/theme";
import { ThemeProvider } from "styled-components";

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
