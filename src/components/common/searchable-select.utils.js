/**
 * Layout constants used by the floating searchable select menu.
 */
export const VIEWPORT_MARGIN = 8;
export const DROPDOWN_GAP = 6;
export const MIN_DROPDOWN_WIDTH = 240;
export const BASE_DROPDOWN_WIDTH = 300;
export const MAX_DROPDOWN_WIDTH = 460;
export const DEFAULT_DROPDOWN_HEIGHT = 320;
export const MIN_FIT_THRESHOLD = 200;

/**
 * Clamps a numeric value into a safe minimum and maximum range.
 *
 * @param {number} value - Raw numeric value.
 * @param {number} minimum - Inclusive minimum.
 * @param {number} maximum - Inclusive maximum.
 * @returns {number} The clamped value.
 */
export function clampValue(value, minimum, maximum) {
  if (maximum < minimum) {
    return minimum;
  }

  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * Normalizes text for case-insensitive search matching.
 *
 * @param {unknown} value - Raw value to normalize.
 * @returns {string} A trimmed lowercase string.
 */
export function normalizeText(value) {
  return `${value ?? ""}`.trim().toLowerCase();
}

/**
 * Normalizes a single-select value into a string.
 *
 * @param {unknown} value - Raw selected value.
 * @returns {string} Normalized single-select value.
 */
export function normalizeSingleValue(value) {
  return `${value ?? ""}`;
}

/**
 * Normalizes a multi-select value into a unique string array.
 *
 * @param {unknown} value - Raw selected value or values.
 * @returns {string[]} Normalized selected values.
 */
export function normalizeMultipleValues(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => `${entry ?? ""}`))];
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [`${value}`];
}

/**
 * Normalizes one option record into the shape consumed by the UI.
 *
 * @param {object} option - Raw option object.
 * @param {number} index - Option index used for stable fallback ids.
 * @returns {object} The normalized searchable option.
 */
export function normalizeOption(option, index) {
  const value = `${option?.value ?? ""}`;
  const label = option?.label ? `${option.label}` : value;
  const description = option?.description ? `${option.description}` : "";
  const badge = option?.badge ? `${option.badge}` : "";
  const flagEmoji = option?.flagEmoji ? `${option.flagEmoji}` : "";
  const flagImageUrl = option?.flagImageUrl ? `${option.flagImageUrl}` : "";
  const keywords = Array.isArray(option?.keywords)
    ? option.keywords.map((keyword) => `${keyword}`)
    : [];

  return {
    badge,
    description,
    disabled: Boolean(option?.disabled),
    flagEmoji,
    flagImageUrl,
    id: option?.id ? `${option.id}` : `${value || "option"}-${index}`,
    keywords,
    label,
    searchText: normalizeText([label, description, value, badge, ...keywords].join(" ")),
    value,
  };
}

/**
 * Formats a compact result count label for the trigger and dropdown chrome.
 *
 * @param {number} count - Item count.
 * @param {string} singular - Singular noun.
 * @param {string} [plural=`${singular}s`] - Optional plural noun.
 * @returns {string} Human-readable count label.
 */
export function formatCountLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Collects the indexes for selectable options only.
 *
 * @param {Array<{disabled?: boolean}>} options - Normalized options.
 * @returns {number[]} Enabled option indexes.
 */
export function getEnabledOptionIndexes(options) {
  return options.reduce((indexes, option, index) => {
    if (!option.disabled) {
      indexes.push(index);
    }

    return indexes;
  }, []);
}

/**
 * Finds the next enabled option index in the requested direction.
 *
 * @param {Array<{disabled?: boolean}>} options - Normalized options.
 * @param {number} currentIndex - Currently active option index.
 * @param {number} direction - Direction to move: `1` or `-1`.
 * @returns {number} The next enabled option index or `-1` when none exist.
 */
export function getNextEnabledOptionIndex(options, currentIndex, direction) {
  const enabledIndexes = getEnabledOptionIndexes(options);

  if (!enabledIndexes.length) {
    return -1;
  }

  if (currentIndex < 0) {
    return direction > 0 ? enabledIndexes[0] : enabledIndexes[enabledIndexes.length - 1];
  }

  const currentEnabledIndex = enabledIndexes.indexOf(currentIndex);

  if (currentEnabledIndex < 0) {
    return direction > 0 ? enabledIndexes[0] : enabledIndexes[enabledIndexes.length - 1];
  }

  const nextEnabledIndex =
    (currentEnabledIndex + direction + enabledIndexes.length) % enabledIndexes.length;

  return enabledIndexes[nextEnabledIndex];
}

function getViewportSnapshot() {
  return {
    height: window.innerHeight,
    width: window.innerWidth,
  };
}

/**
 * Calculates a floating layout for the dropdown based on the trigger and viewport.
 *
 * @param {DOMRect | null} triggerRect - Trigger rectangle used as the anchor.
 * @param {DOMRect | null} [dropdownRect=null] - Current dropdown rectangle if available.
 * @returns {object|null} The resolved floating layout or `null` when no trigger exists.
 */
export function resolveDropdownLayout(triggerRect, dropdownRect = null) {
  if (!triggerRect) {
    return null;
  }

  const viewport = getViewportSnapshot();
  const maxViewportWidth = Math.max(
    MIN_DROPDOWN_WIDTH,
    viewport.width - VIEWPORT_MARGIN * 2,
  );
  const preferredWidth = Math.max(
    triggerRect.width,
    Math.min(dropdownRect?.width || BASE_DROPDOWN_WIDTH, MAX_DROPDOWN_WIDTH),
  );
  const width = clampValue(
    preferredWidth,
    Math.min(MIN_DROPDOWN_WIDTH, maxViewportWidth),
    maxViewportWidth,
  );
  const desiredHeight = Math.min(
    dropdownRect?.height || DEFAULT_DROPDOWN_HEIGHT,
    viewport.height - VIEWPORT_MARGIN * 2,
  );
  const availableSpace = {
    bottom: viewport.height - triggerRect.bottom - VIEWPORT_MARGIN - DROPDOWN_GAP,
    left: triggerRect.left - VIEWPORT_MARGIN - DROPDOWN_GAP,
    right: viewport.width - triggerRect.right - VIEWPORT_MARGIN - DROPDOWN_GAP,
    top: triggerRect.top - VIEWPORT_MARGIN - DROPDOWN_GAP,
  };
  const fitThreshold = Math.min(desiredHeight, MIN_FIT_THRESHOLD);
  const fits = {
    bottom: availableSpace.bottom >= fitThreshold,
    left: availableSpace.left >= Math.min(width, MIN_FIT_THRESHOLD),
    right: availableSpace.right >= Math.min(width, MIN_FIT_THRESHOLD),
    top: availableSpace.top >= fitThreshold,
  };
  let placement = "bottom";

  if (fits.bottom) {
    placement = "bottom";
  } else if (fits.top) {
    placement = "top";
  } else if (fits.right || fits.left) {
    placement = availableSpace.right >= availableSpace.left ? "right" : "left";
  } else {
    placement = Object.entries(availableSpace).sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])[0][0];
  }

  const maxHeight =
    placement === "bottom"
      ? Math.max(160, availableSpace.bottom)
      : placement === "top"
        ? Math.max(160, availableSpace.top)
        : Math.max(220, viewport.height - VIEWPORT_MARGIN * 2);
  const horizontalWidth =
    placement === "left"
      ? clampValue(
          width,
          Math.min(MIN_DROPDOWN_WIDTH, maxViewportWidth),
          Math.max(availableSpace.left, MIN_DROPDOWN_WIDTH),
        )
      : placement === "right"
        ? clampValue(
            width,
            Math.min(MIN_DROPDOWN_WIDTH, maxViewportWidth),
            Math.max(availableSpace.right, MIN_DROPDOWN_WIDTH),
          )
        : width;
  let left = triggerRect.left;
  let top = triggerRect.bottom + DROPDOWN_GAP;

  if (placement === "top") {
    top = triggerRect.top - DROPDOWN_GAP - Math.min(desiredHeight, maxHeight);
  } else if (placement === "right") {
    left = triggerRect.right + DROPDOWN_GAP;
    top = triggerRect.top;
  } else if (placement === "left") {
    left = triggerRect.left - DROPDOWN_GAP - horizontalWidth;
    top = triggerRect.top;
  }

  left = clampValue(left, VIEWPORT_MARGIN, viewport.width - horizontalWidth - VIEWPORT_MARGIN);
  top = clampValue(
    top,
    VIEWPORT_MARGIN,
    viewport.height - Math.min(desiredHeight, maxHeight) - VIEWPORT_MARGIN,
  );

  return {
    left,
    maxHeight,
    placement,
    top,
    width: horizontalWidth,
  };
}

/**
 * Resolves the animation transform origin for the current dropdown placement.
 *
 * @param {object|null} layout - Dropdown layout.
 * @returns {string} CSS transform origin string.
 */
export function getDropdownTransformOrigin(layout) {
  if (layout?.placement === "top") {
    return "center bottom";
  }

  if (layout?.placement === "left") {
    return "right center";
  }

  if (layout?.placement === "right") {
    return "left center";
  }

  return "center top";
}
