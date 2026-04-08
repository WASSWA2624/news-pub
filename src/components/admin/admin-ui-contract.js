/**
 * Shared sizing tokens that keep NewsPub admin controls aligned across forms,
 * modals, tables, and toolbar actions.
 */
export const adminUiSizingContract = Object.freeze({
  buttonMinHeight: "44px",
  compactPillMinHeight: "24px",
  controlGap: "0.42rem",
  controlMinHeight: "44px",
  controlPaddingBlock: "0.58rem",
  controlPaddingInline: "0.78rem",
  iconButtonSize: "44px",
});

/**
 * Shared layout tokens that keep sticky side panels and action rows aligned
 * across NewsPub admin workspaces.
 */
export const adminUiLayoutContract = Object.freeze({
  buttonRowCollapseMaxWidth: 560,
  stickySidebarTop: "5.7rem",
  workspaceTwoColumnBreakpoint: 1080,
});

/**
 * Returns whether a disclosure section has blocking state that should force it open.
 *
 * @param {object} section - Disclosure state metadata for one section.
 * @returns {boolean} True when the section contains errors, missing required data, or blocking warnings.
 */
export function hasBlockingDisclosureState(section = {}) {
  return Boolean(
    (section.errorCount || 0) > 0
      || (section.missingCount || 0) > 0
      || (section.blockingWarningCount || 0) > 0,
  );
}

/**
 * Collects the disclosure section ids that should auto-open after validation fails.
 *
 * @param {Array<object>} sections - Disclosure state metadata for the current form.
 * @returns {string[]} Section ids that should be opened automatically.
 */
export function getAutoOpenDisclosureIds(sections = []) {
  return (Array.isArray(sections) ? sections : [])
    .filter((section) => section?.id && hasBlockingDisclosureState(section))
    .map((section) => section.id);
}
