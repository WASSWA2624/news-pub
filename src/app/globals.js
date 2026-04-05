import { createGlobalStyle } from "styled-components";

function toRgbChannels(hex) {
  if (typeof hex !== "string") {
    return "0, 0, 0";
  }

  const normalized = hex.replace("#", "").trim();

  if (normalized.length !== 6) {
    return "0, 0, 0";
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if (![red, green, blue].every(Number.isFinite)) {
    return "0, 0, 0";
  }

  return `${red}, ${green}, ${blue}`;
}

const GlobalStyles = createGlobalStyle`
  :root {
    color-scheme: light;
    --theme-accent: ${({ theme }) => theme.colors.accent};
    --theme-accent-rgb: ${({ theme }) => toRgbChannels(theme.colors.accent)};
    --theme-bg: ${({ theme }) => theme.colors.bg};
    --theme-bg-rgb: ${({ theme }) => toRgbChannels(theme.colors.bg)};
    --theme-border: ${({ theme }) => theme.colors.border};
    --theme-border-rgb: ${({ theme }) => toRgbChannels(theme.colors.border)};
    --theme-muted: ${({ theme }) => theme.colors.muted};
    --theme-muted-rgb: ${({ theme }) => toRgbChannels(theme.colors.muted)};
    --theme-primary: ${({ theme }) => theme.colors.primary};
    --theme-primary-rgb: ${({ theme }) => toRgbChannels(theme.colors.primary)};
    --theme-surface: ${({ theme }) => theme.colors.surface};
    --theme-surface-rgb: ${({ theme }) => toRgbChannels(theme.colors.surface)};
    --theme-text: ${({ theme }) => theme.colors.text};
    --theme-text-rgb: ${({ theme }) => toRgbChannels(theme.colors.text)};
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
    background-color: ${({ theme }) => theme.colors.bg};
    background:
      radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.1), transparent 24%),
      radial-gradient(circle at 88% 12%, rgba(var(--theme-primary-rgb), 0.07), transparent 22%),
      linear-gradient(
        180deg,
        rgba(var(--theme-bg-rgb), 0.98) 0%,
        rgba(var(--theme-surface-rgb), 0.98) 46%,
        rgba(var(--theme-bg-rgb), 0.96) 100%
      );
    color: ${({ theme }) => theme.colors.text};
    font-family: var(--font-ui), "Segoe UI", sans-serif;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  body {
    min-height: 100vh;
    overflow-x: hidden;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  ::selection {
    background: rgba(var(--theme-accent-rgb), 0.22);
    color: ${({ theme }) => theme.colors.text};
  }

  button,
  input,
  textarea {
    font: inherit;
  }
`;

export default GlobalStyles;
