import { css } from "styled-components";

/**
 * Shared editorial surface styles for cards, drawers, and elevated shells.
 */
export const elevatedSurfaceCss = css`
  background:
    linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.992), rgba(255, 255, 255, 0.978)),
    radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.08), transparent 46%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.82);
  box-shadow:
    0 18px 42px rgba(var(--theme-primary-rgb), 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.76);
`;

/**
 * Shared compact control styles for inputs, selects, and buttons.
 */
export const controlSurfaceCss = css`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(247, 250, 255, 0.98)),
    radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.08), transparent 56%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.88);
  box-shadow:
    0 10px 24px rgba(var(--theme-primary-rgb), 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
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
      0 12px 26px rgba(var(--theme-primary-rgb), 0.08),
      0 0 0 4px rgba(var(--theme-primary-rgb), 0.1);
    outline: none;
  }
`;
