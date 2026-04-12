/**
 * Top-level shared providers for NewsPub theming and global styles.
 */

import GlobalStyles from "@/app/globals";
import { lightTheme } from "@/styles/theme";
import { ThemeProvider } from "styled-components";
/**
 * Renders the app Providers in NewsPub UI.
 */

export default function AppProviders({ children }) {
  return (
    <ThemeProvider theme={lightTheme}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  );
}
