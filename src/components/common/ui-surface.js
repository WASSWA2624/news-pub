import { css } from "styled-components";

/**
 * Shared editorial surface styles for cards, drawers, and elevated shells.
 */
export const elevatedSurfaceCss = css`
  background: linear-gradient(
    180deg,
    rgba(var(--theme-surface-rgb), 0.992),
    rgba(var(--theme-surface-alt-rgb), 0.965)
  );
  border: 1px solid rgba(var(--theme-border-rgb), 0.82);
  box-shadow: var(--theme-shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.72);
`;

/**
 * Shared compact control styles for inputs, selects, and buttons.
 */
export const controlSurfaceCss = css`
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.995),
    rgba(var(--theme-surface-alt-rgb), 0.985)
  );
  border: 1px solid rgba(var(--theme-border-rgb), 0.88);
  box-shadow: var(--theme-shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.84);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
`;

/**
 * Shared focus ring for interactive controls that should match the global editorial language.
 */
export const focusRingCss = css`
  &:focus-visible,
  &:focus-within {
    border-color: rgba(var(--theme-primary-rgb), 0.36);
    box-shadow:
      var(--theme-shadow-sm),
      0 0 0 4px rgba(var(--theme-primary-rgb), 0.1);
    outline: none;
  }
`;

/**
 * Shared paper treatment used by story-specific editorial sections.
 */
export const editorialPaperSurfaceCss = css`
  background: linear-gradient(
    180deg,
    rgba(var(--theme-story-paper-rgb), 0.98),
    rgba(var(--theme-story-paper-alt-rgb), 0.96)
  );
  border: 1px solid rgba(var(--theme-story-line-rgb), 0.56);
  box-shadow: var(--theme-shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.76);
`;
