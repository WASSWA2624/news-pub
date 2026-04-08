/**
 * Helper utilities shared by NewsPub admin disclosure primitives.
 */

/**
 * Returns the linked button and region ids for one admin disclosure section.
 *
 * @param {string} baseId - Base disclosure id.
 * @returns {object} Toggle and body ids used for aria linkage.
 */
export function createDisclosureAriaIds(baseId) {
  return {
    bodyId: `${baseId}-body`,
    toggleId: `${baseId}-toggle`,
  };
}

/**
 * Returns the aria props used to link an admin disclosure button and region.
 *
 * @param {string} baseId - Base disclosure id.
 * @returns {object} Structured aria props for both elements.
 */
export function createDisclosureAriaProps(baseId) {
  const { bodyId, toggleId } = createDisclosureAriaIds(baseId);

  return {
    bodyProps: {
      "aria-labelledby": toggleId,
      id: bodyId,
      role: "region",
    },
    toggleProps: {
      "aria-controls": bodyId,
      id: toggleId,
    },
  };
}
