import { createGlobalStyle } from "styled-components";

/**
 * Converts a hex color string into a CSS RGB channel list.
 *
 * @param {string} hex - Hex color string.
 * @returns {string} RGB channel list suitable for CSS custom properties.
 */
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
    --theme-accent: ${({ theme }) => theme?.colors?.accent || "#3f7ae0"};
    --theme-accent-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.accent || "#3f7ae0")};
    --theme-bg: ${({ theme }) => theme?.colors?.bg || "#edf3fb"};
    --theme-bg-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.bg || "#edf3fb")};
    --theme-border: ${({ theme }) => theme?.colors?.border || "#b8c8de"};
    --theme-border-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.border || "#b8c8de")};
    --theme-danger: ${({ theme }) => theme?.colors?.danger || "#b42318"};
    --theme-danger-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.danger || "#b42318")};
    --theme-info: ${({ theme }) => theme?.colors?.info || "#175c66"};
    --theme-info-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.info || "#175c66")};
    --theme-muted: ${({ theme }) => theme?.colors?.muted || "#54657f"};
    --theme-muted-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.muted || "#54657f")};
    --theme-overlay: ${({ theme }) => theme?.colors?.overlay || "#102438"};
    --theme-overlay-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.overlay || "#102438")};
    --theme-primary: ${({ theme }) => theme?.colors?.primary || "#1b4f93"};
    --theme-primary-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.primary || "#1b4f93")};
    --theme-success: ${({ theme }) => theme?.colors?.success || "#157347"};
    --theme-success-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.success || "#157347")};
    --theme-surface: ${({ theme }) => theme?.colors?.surface || "#f8fbff"};
    --theme-surface-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.surface || "#f8fbff")};
    --theme-surface-alt: ${({ theme }) => theme?.colors?.surfaceAlt || "#f1f6f5"};
    --theme-surface-alt-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.surfaceAlt || "#f1f6f5")};
    --theme-text: ${({ theme }) => theme?.colors?.text || "#152844"};
    --theme-text-rgb: ${({ theme }) => toRgbChannels(theme?.colors?.text || "#152844")};
    --theme-page-max-width: ${({ theme }) => theme?.layout?.pageMaxWidth || "1480px"};
    --theme-reading-max-width: ${({ theme }) => theme?.layout?.readingMaxWidth || "100%"};
    --theme-shell-max-width: ${({ theme }) => theme?.layout?.shellMaxWidth || "1480px"};
    --theme-radius-lg: ${({ theme }) => theme?.radius?.lg || "2px"};
    --theme-radius-md: ${({ theme }) => theme?.radius?.md || "1px"};
    --theme-radius-sm: ${({ theme }) => theme?.radius?.sm || "0px"};
    --theme-shadow-sm: ${({ theme }) => theme?.shadow?.sm || "0 8px 18px rgba(22, 36, 49, 0.05)"};
    --theme-shadow-md: ${({ theme }) => theme?.shadow?.md || "0 14px 32px rgba(22, 36, 49, 0.08)"};
    --theme-shadow-lg: ${({ theme }) => theme?.shadow?.lg || "0 22px 54px rgba(22, 36, 49, 0.1)"};
    --theme-story-accent: ${({ theme }) => theme?.story?.accent || "#145f6d"};
    --theme-story-accent-rgb: ${({ theme }) => toRgbChannels(theme?.story?.accent || "#145f6d")};
    --theme-story-highlight-from: ${({ theme }) => theme?.story?.highlightFrom || "#18324a"};
    --theme-story-highlight-to: ${({ theme }) => theme?.story?.highlightTo || "#145f6d"};
    --theme-story-highlight-text: ${({ theme }) => theme?.story?.highlightText || "#f8f4eb"};
    --theme-story-ink: ${({ theme }) => theme?.story?.ink || "#1f2937"};
    --theme-story-ink-rgb: ${({ theme }) => toRgbChannels(theme?.story?.ink || "#1f2937")};
    --theme-story-label: ${({ theme }) => theme?.story?.label || "#8b5e34"};
    --theme-story-label-rgb: ${({ theme }) => toRgbChannels(theme?.story?.label || "#8b5e34")};
    --theme-story-line: ${({ theme }) => theme?.story?.line || "#d7c8b4"};
    --theme-story-line-rgb: ${({ theme }) => toRgbChannels(theme?.story?.line || "#d7c8b4")};
    --theme-story-muted: ${({ theme }) => theme?.story?.muted || "#5d6875"};
    --theme-story-muted-rgb: ${({ theme }) => toRgbChannels(theme?.story?.muted || "#5d6875")};
    --theme-story-paper: ${({ theme }) => theme?.story?.paper || "#fffdf8"};
    --theme-story-paper-rgb: ${({ theme }) => toRgbChannels(theme?.story?.paper || "#fffdf8")};
    --theme-story-paper-alt: ${({ theme }) => theme?.story?.paperAlt || "#f5efe4"};
    --theme-story-paper-alt-rgb: ${({ theme }) => toRgbChannels(theme?.story?.paperAlt || "#f5efe4")};
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
    background-color: ${({ theme }) => theme?.colors?.bg || "#edf3fb"};
    background:
      linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.7), rgba(var(--theme-bg-rgb), 0.92)),
      radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.08), transparent 28%),
      radial-gradient(circle at 88% 12%, rgba(var(--theme-primary-rgb), 0.05), transparent 26%),
      linear-gradient(
        180deg,
        rgba(var(--theme-bg-rgb), 0.98) 0%,
        rgba(var(--theme-surface-alt-rgb), 0.94) 48%,
        rgba(var(--theme-bg-rgb), 0.97) 100%
      );
    color: ${({ theme }) => theme?.colors?.text || "#152844"};
    font-family: var(--font-ui), "Segoe UI", sans-serif;
    line-height: 1.5;
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

  :focus-visible {
    outline: 2px solid rgba(var(--theme-primary-rgb), 0.6);
    outline-offset: 2px;
  }

  ::selection {
    background: rgba(var(--theme-accent-rgb), 0.22);
    color: ${({ theme }) => theme?.colors?.text || "#152844"};
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

/**
 * Global application styles driven by the shared NewsPub theme tokens.
 */
export default GlobalStyles;
