"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";

import OptionFlag from "@/components/common/option-flag";
import { controlSurfaceCss, elevatedSurfaceCss, focusRingCss } from "@/components/common/ui-surface";

const VIEWPORT_MARGIN = 8;
const DROPDOWN_GAP = 6;
const MIN_DROPDOWN_WIDTH = 240;
const BASE_DROPDOWN_WIDTH = 300;
const MAX_DROPDOWN_WIDTH = 460;
const DEFAULT_DROPDOWN_HEIGHT = 320;
const MIN_FIT_THRESHOLD = 200;

function clampValue(value, minimum, maximum) {
  if (maximum < minimum) {
    return minimum;
  }

  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeText(value) {
  return `${value ?? ""}`.trim().toLowerCase();
}

function normalizeSingleValue(value) {
  return `${value ?? ""}`;
}

function normalizeMultipleValues(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => `${entry ?? ""}`))];
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [`${value}`];
}

function normalizeOption(option, index) {
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

function formatCountLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getEnabledOptionIndexes(options) {
  return options.reduce((indexes, option, index) => {
    if (!option.disabled) {
      indexes.push(index);
    }

    return indexes;
  }, []);
}

function getNextEnabledOptionIndex(options, currentIndex, direction) {
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

function resolveDropdownLayout(triggerRect, dropdownRect = null) {
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
      ? clampValue(width, Math.min(MIN_DROPDOWN_WIDTH, maxViewportWidth), Math.max(availableSpace.left, MIN_DROPDOWN_WIDTH))
      : placement === "right"
        ? clampValue(width, Math.min(MIN_DROPDOWN_WIDTH, maxViewportWidth), Math.max(availableSpace.right, MIN_DROPDOWN_WIDTH))
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

  if (placement === "bottom" || placement === "top") {
    left = clampValue(left, VIEWPORT_MARGIN, viewport.width - horizontalWidth - VIEWPORT_MARGIN);
    top = clampValue(
      top,
      VIEWPORT_MARGIN,
      viewport.height - Math.min(desiredHeight, maxHeight) - VIEWPORT_MARGIN,
    );
  } else {
    left = clampValue(left, VIEWPORT_MARGIN, viewport.width - horizontalWidth - VIEWPORT_MARGIN);
    top = clampValue(top, VIEWPORT_MARGIN, viewport.height - Math.min(desiredHeight, maxHeight) - VIEWPORT_MARGIN);
  }

  return {
    left,
    maxHeight,
    placement,
    top,
    width: horizontalWidth,
  };
}

function getDropdownTransformOrigin(layout) {
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

const dropdownEnter = keyframes`
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const SelectRoot = styled.div`
  container-type: inline-size;
  min-width: 0;
  width: 100%;
`;

const HiddenInput = styled.input`
  display: none;
`;

const TriggerButton = styled.button`
  align-items: center;
  ${controlSurfaceCss}
  border: 1px solid
    ${({ $invalid, $open }) =>
      $invalid
        ? "var(--theme-danger, #b42318)"
        : $open
          ? "rgba(15, 111, 141, 0.3)"
          : "var(--theme-border, #b8c8de)"};
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    ${({ $open, $invalid }) =>
      $open
        ? $invalid
          ? "0 18px 32px rgba(176, 46, 34, 0.1), 0 0 0 4px rgba(176, 46, 34, 0.09)"
          : "0 18px 32px rgba(15, 96, 121, 0.11), 0 0 0 4px rgba(15, 111, 141, 0.09)"
        : "0 10px 24px rgba(16, 32, 51, 0.05)"};
  color: var(--theme-text, #152844);
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  display: flex;
  gap: 0.42rem;
  justify-content: space-between;
  min-height: 34px;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.46rem 0.58rem;
  text-align: left;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
  width: 100%;

  &:hover {
    border-color: ${({ disabled, $invalid, $open }) =>
      disabled
        ? "var(--theme-border, #b8c8de)"
        : $invalid
          ? "var(--theme-danger, #b42318)"
          : $open
            ? "rgba(15, 111, 141, 0.34)"
            : "rgba(36, 75, 115, 0.24)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }

  &:focus-visible {
    border-color: ${({ $invalid }) => ($invalid ? "var(--theme-danger, #b42318)" : "var(--theme-primary, #1b4f93)")};
    box-shadow:
      0 16px 30px rgba(16, 32, 51, 0.08),
      0 0 0 4px
        ${({ $invalid }) => ($invalid ? "rgba(180, 35, 24, 0.14)" : "rgba(0, 95, 115, 0.14)")};
    outline: none;
  }
`;

const CompactTriggerButton = styled(TriggerButton)`
  @container (max-width: 220px) {
    align-items: flex-start;
    flex-wrap: wrap;
  }
`;

const TriggerValue = styled.span`
  display: grid;
  flex: 1 1 auto;
  gap: 0.18rem;
  min-width: 0;

  @container (max-width: 220px) {
    flex-basis: 100%;
  }
`;

const LabelContent = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.38rem;
  max-width: 100%;
  min-width: 0;
`;

const TriggerLabel = styled(LabelContent)`
  font-size: 0.88rem;
  font-weight: 600;
`;

const TriggerLabelText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PlaceholderText = styled(TriggerLabel)`
  color: var(--theme-muted, #54657f);
  font-weight: 500;
`;

const TriggerDescription = styled.span`
  color: var(--theme-muted, #54657f);
  font-size: 0.67rem;
  line-height: 1.28;
  overflow-wrap: break-word;
  word-break: normal;
`;

const TriggerChipRow = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 0.24rem;
`;

const TriggerChip = styled.span`
  align-items: center;
  background: ${({ $muted }) =>
    $muted ? "rgba(16, 32, 51, 0.05)" : "rgba(36, 75, 115, 0.08)"};
  border: 1px solid
    ${({ $muted }) =>
      $muted ? "rgba(16, 32, 51, 0.08)" : "rgba(36, 75, 115, 0.12)"};
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $muted }) => ($muted ? "rgba(61, 76, 102, 0.9)" : "#244b73")};
  display: inline-flex;
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1;
  overflow: hidden;
  max-width: 100%;
  min-height: 19px;
  padding: 0 0.34rem;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TriggerAdornment = styled.span`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.3rem;

  @container (max-width: 220px) {
    margin-left: auto;
  }
`;

const TriggerBadge = styled.span`
  background: rgba(15, 111, 141, 0.08);
  border: 1px solid rgba(15, 111, 141, 0.14);
  border-radius: var(--theme-radius-lg, 2px);
  color: #0f5f79;
  display: inline-flex;
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  max-width: 6.8rem;
  overflow: hidden;
  padding: 0.14rem 0.32rem;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`;

const Caret = styled.span`
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(56, 76, 103, 0.88);
  flex: 0 0 auto;
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "none")};
  transition: transform 160ms ease;
`;

const DropdownSurface = styled.div`
  ${elevatedSurfaceCss}
  backdrop-filter: blur(14px);
  border: 1px solid rgba(24, 39, 66, 0.1);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    0 28px 54px rgba(16, 32, 51, 0.14),
    0 6px 16px rgba(16, 32, 51, 0.05);
  animation: ${dropdownEnter} 180ms cubic-bezier(0.22, 1, 0.36, 1);
  display: grid;
  gap: 0.36rem;
  grid-template-rows: auto minmax(0, 1fr);
  left: ${({ $layout }) => `${$layout?.left || 0}px`};
  max-height: ${({ $layout }) => `${$layout?.maxHeight || DEFAULT_DROPDOWN_HEIGHT}px`};
  overflow: hidden;
  padding: 0.4rem;
  position: fixed;
  top: ${({ $layout }) => `${$layout?.top || 0}px`};
  transform-origin: ${({ $layout }) => getDropdownTransformOrigin($layout)};
  width: ${({ $layout }) => `${$layout?.width || BASE_DROPDOWN_WIDTH}px`};
  z-index: 9999;
`;

const DropdownTop = styled.div`
  background:
    linear-gradient(180deg, rgba(249, 252, 255, 0.98), rgba(245, 249, 255, 0.96)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.06), transparent 55%);
  border: 1px solid rgba(24, 39, 66, 0.06);
  border-radius: var(--theme-radius-md, 1px);
  display: grid;
  gap: 0.3rem;
  padding: 0.4rem;
`;

const DropdownHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 0.4rem;
  justify-content: space-between;
`;

const DropdownEyebrow = styled.span`
  color: rgba(32, 51, 78, 0.94);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const DropdownMeta = styled.span`
  align-items: center;
  background: rgba(15, 111, 141, 0.08);
  border: 1px solid rgba(15, 111, 141, 0.12);
  border-radius: var(--theme-radius-lg, 2px);
  color: #0f5f79;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: 19px;
  padding: 0 0.34rem;
  text-transform: uppercase;
`;

const SearchWrap = styled.div`
  align-items: center;
  ${controlSurfaceCss}
  ${focusRingCss}
  border-radius: var(--theme-radius-lg, 2px);
  display: flex;
  flex: 0 0 auto;
  gap: 0.32rem;
  min-height: 30px;
  padding: 0 0.48rem;
`;

const SearchIcon = styled.span`
  border: 2px solid rgba(74, 90, 117, 0.74);
  border-radius: var(--theme-radius-lg, 2px);
  display: inline-block;
  flex: 0 0 auto;
  height: 0.78rem;
  position: relative;
  width: 0.78rem;

  &::after {
    background: rgba(74, 90, 117, 0.74);
    border-radius: var(--theme-radius-lg, 2px);
    content: "";
    height: 2px;
    position: absolute;
    right: -0.2rem;
    bottom: -0.08rem;
    transform: rotate(45deg);
    width: 0.38rem;
  }
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  color: var(--theme-text, #152844);
  flex: 1 1 auto;
  font-size: 0.8rem;
  min-width: 0;
  outline: none;
  padding: 0;

  &::placeholder {
    color: var(--theme-muted, #54657f);
  }
`;

const OptionList = styled.div`
  align-items: stretch;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 0.22rem;
  max-height: 100%;
  min-height: 0;
  overflow: auto;
  padding-right: 0.12rem;
  scrollbar-color: rgba(36, 75, 115, 0.24) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(36, 75, 115, 0.24);
    border: 3px solid transparent;
    border-radius: var(--theme-radius-lg, 2px);
    background-clip: padding-box;
  }
`;

const OptionButton = styled.button`
  position: relative;
  background: ${({ $active, $selected }) =>
    $selected
      ? "linear-gradient(180deg, rgba(15, 111, 141, 0.12), rgba(15, 111, 141, 0.08))"
      : $active
        ? "rgba(36, 75, 115, 0.08)"
        : "rgba(255, 255, 255, 0.72)"};
  border: 1px solid
    ${({ $active, $selected }) =>
      $selected
        ? "rgba(15, 111, 141, 0.2)"
        : $active
          ? "rgba(36, 75, 115, 0.14)"
          : "rgba(24, 39, 66, 0.04)"};
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: ${({ $selected }) =>
    $selected ? "0 10px 22px rgba(15, 96, 121, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.72)" : "none"};
  color: var(--theme-text, #152844);
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  display: grid;
  flex: 0 0 auto;
  gap: 0.18rem;
  height: auto;
  min-height: 38px;
  opacity: ${({ disabled }) => (disabled ? 0.55 : 1)};
  overflow: hidden;
  padding: 0.46rem 0.56rem 0.46rem 0.64rem;
  text-align: left;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
  width: 100%;

  &::before {
    background: ${({ $active, $selected }) =>
      $selected
        ? "linear-gradient(180deg, rgba(15, 111, 141, 0.9), rgba(13, 95, 121, 0.88))"
        : $active
          ? "rgba(36, 75, 115, 0.32)"
          : "transparent"};
    border-radius: var(--theme-radius-lg, 2px);
    content: "";
    left: 0.26rem;
    position: absolute;
    top: 0.48rem;
    bottom: 0.48rem;
    width: 3px;
  }

  &:hover {
    background: ${({ disabled, $selected }) =>
      disabled
        ? "rgba(255, 255, 255, 0.72)"
        : $selected
          ? "linear-gradient(180deg, rgba(15, 111, 141, 0.14), rgba(15, 111, 141, 0.09))"
          : "rgba(36, 75, 115, 0.08)"};
    border-color: ${({ disabled, $selected }) =>
      disabled
        ? "rgba(24, 39, 66, 0.04)"
        : $selected
          ? "rgba(15, 111, 141, 0.22)"
          : "rgba(36, 75, 115, 0.14)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

const OptionHeader = styled.div`
  align-items: start;
  display: grid;
  gap: 0.28rem;
  grid-template-columns: minmax(0, 1fr) auto;
`;

const OptionLabel = styled(LabelContent)`
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.22;
`;

const OptionLabelText = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
`;

const OptionDescription = styled.div`
  color: var(--theme-muted, #54657f);
  font-size: 0.68rem;
  line-height: 1.32;
  overflow-wrap: anywhere;
`;

const OptionMeta = styled.div`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.2rem;
  justify-self: end;
  padding-top: 0.04rem;
`;

const OptionBadge = styled.span`
  background: rgba(36, 75, 115, 0.08);
  border: 1px solid rgba(36, 75, 115, 0.12);
  border-radius: var(--theme-radius-lg, 2px);
  color: #244b73;
  display: inline-flex;
  flex: 0 1 auto;
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  max-width: 8rem;
  overflow: hidden;
  padding: 0.12rem 0.28rem;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`;

const OptionIndicator = styled.span`
  align-items: center;
  background: ${({ $selected }) => ($selected ? "rgba(15, 111, 141, 0.92)" : "rgba(255, 255, 255, 0.92)")};
  border: 1px solid ${({ $selected }) => ($selected ? "rgba(15, 111, 141, 0.92)" : "rgba(74, 90, 117, 0.18)")};
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: ${({ $selected }) => ($selected ? "0 0 0 4px rgba(15, 111, 141, 0.12)" : "none")};
  display: inline-flex;
  flex: 0 0 auto;
  height: 1rem;
  justify-content: center;
  position: relative;
  width: 1rem;

  &::after {
    border-bottom: 2px solid white;
    border-right: 2px solid white;
    content: "";
    height: 0.42rem;
    left: 0.32rem;
    opacity: ${({ $selected }) => ($selected ? 1 : 0)};
    position: absolute;
    top: 0.18rem;
    transform: rotate(45deg) scale(${({ $selected }) => ($selected ? 1 : 0.7)});
    transition:
      opacity 160ms ease,
      transform 160ms ease;
    width: 0.22rem;
  }
`;

const StateMessage = styled.div`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(249, 252, 255, 0.98), rgba(245, 249, 255, 0.96)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.05), transparent 58%);
  border: 1px dashed rgba(36, 75, 115, 0.14);
  border-radius: var(--theme-radius-md, 1px);
  color: var(--theme-muted, #54657f);
  display: grid;
  font-size: 0.76rem;
  justify-items: center;
  line-height: 1.55;
  min-height: 68px;
  padding: 0.68rem 0.58rem;
  text-align: center;
`;

/**
 * Provides an accessible searchable select with single and multi-select modes.
 *
 * @param {object} props - Select configuration and event handlers.
 * @returns {JSX.Element} The interactive searchable select.
 */
export default function SearchableSelect({
  ariaLabel,
  className,
  defaultValue = "",
  disabled = false,
  emptyMessage = "No options found.",
  id,
  invalid = false,
  loading = false,
  loadingMessage = "Loading options...",
  multiple = false,
  name,
  onOpen,
  onSearchChange,
  onChange,
  options = [],
  placeholder = "Select an option",
  searchPlaceholder = "Search options",
  value,
}) {
  const generatedId = useId();
  const resolvedId = id || generatedId;
  const listboxId = `${resolvedId}-listbox`;
  const [internalValue, setInternalValue] = useState(() =>
    multiple ? normalizeMultipleValues(defaultValue) : normalizeSingleValue(defaultValue),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownLayout, setDropdownLayout] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const normalizedOptions = useMemo(
    () => options.map((option, index) => normalizeOption(option, index)),
    [options],
  );
  const resolvedValue = useMemo(() => {
    const nextValue = value !== undefined ? value : internalValue;

    return multiple ? normalizeMultipleValues(nextValue) : normalizeSingleValue(nextValue);
  }, [internalValue, multiple, value]);
  const selectedValueSet = useMemo(() => {
    return multiple ? new Set(resolvedValue) : new Set([resolvedValue]);
  }, [multiple, resolvedValue]);
  const selectedOptions = useMemo(() => {
    return normalizedOptions.filter((option) => selectedValueSet.has(option.value));
  }, [normalizedOptions, selectedValueSet]);
  const selectedOption = multiple ? null : selectedOptions[0] || null;
  const previewOptions = useMemo(() => selectedOptions.slice(0, 2), [selectedOptions]);
  const normalizedQuery = normalizeText(query);
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) {
      return normalizedOptions;
    }

    return normalizedOptions.filter((option) => option.searchText.includes(normalizedQuery));
  }, [normalizedOptions, normalizedQuery]);
  const resolvedActiveIndex = useMemo(() => {
    if (!filteredOptions.length) {
      return -1;
    }

    if (activeIndex >= 0 && filteredOptions[activeIndex] && !filteredOptions[activeIndex].disabled) {
      return activeIndex;
    }

    const selectedIndex = filteredOptions.findIndex((option) =>
      multiple ? selectedValueSet.has(option.value) : option.value === resolvedValue,
    );

    return selectedIndex >= 0 && !filteredOptions[selectedIndex]?.disabled
      ? selectedIndex
      : getNextEnabledOptionIndex(filteredOptions, -1, 1);
  }, [activeIndex, filteredOptions, multiple, resolvedValue, selectedValueSet]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event) {
      const clickedTrigger = rootRef.current?.contains(event.target);
      const clickedDropdown = dropdownRef.current?.contains(event.target);

      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
        setQuery("");
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || typeof window === "undefined") {
      return;
    }

    function updateLayout() {
      if (!triggerRef.current) {
        return;
      }

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current?.getBoundingClientRect() || null;
      const nextLayout = resolveDropdownLayout(triggerRect, dropdownRect);

      setDropdownLayout((currentLayout) => {
        if (
          currentLayout &&
          nextLayout &&
          currentLayout.left === nextLayout.left &&
          currentLayout.maxHeight === nextLayout.maxHeight &&
          currentLayout.placement === nextLayout.placement &&
          currentLayout.top === nextLayout.top &&
          currentLayout.width === nextLayout.width
        ) {
          return currentLayout;
        }

        return nextLayout;
      });
    }

    updateLayout();

    const frameId = window.requestAnimationFrame(updateLayout);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);

    let resizeObserver = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => updateLayout());

      resizeObserver.observe(triggerRef.current);

      if (dropdownRef.current) {
        resizeObserver.observe(dropdownRef.current);
      }
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
      resizeObserver?.disconnect();
    };
  }, [filteredOptions.length, isOpen, loading, query]);

  function closeMenu(restoreFocus = false) {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(-1);
    setDropdownLayout(null);
    setPortalTarget(null);

    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  }

  function openMenu(direction = 1) {
    if (disabled) {
      return;
    }

    const triggerRect = triggerRef.current?.getBoundingClientRect() || null;
    const nextPortalTarget = triggerRef.current?.closest("[data-floating-root]") || document.body;

    setIsOpen(true);
    setQuery("");
    setActiveIndex(() => {
      const selectedIndex = normalizedOptions.findIndex((option) =>
        multiple ? selectedValueSet.has(option.value) : option.value === resolvedValue,
      );

      if (selectedIndex >= 0 && !normalizedOptions[selectedIndex]?.disabled) {
        return selectedIndex;
      }

      return getNextEnabledOptionIndex(normalizedOptions, -1, direction);
    });
    setPortalTarget(nextPortalTarget);
    setDropdownLayout(resolveDropdownLayout(triggerRect));
    onOpen?.();
  }

  function commitSelection(option) {
    if (!option || option.disabled) {
      return;
    }

    if (multiple) {
      const nextValues = selectedValueSet.has(option.value)
        ? resolvedValue.filter((entry) => entry !== option.value)
        : [...resolvedValue, option.value];

      if (value === undefined) {
        setInternalValue(nextValues);
      }

      setQuery("");
      setActiveIndex(-1);
      onChange?.(nextValues, option);

      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });

      return;
    }

    if (value === undefined) {
      setInternalValue(option.value);
    }

    onChange?.(option.value, option);
    closeMenu();
  }

  function handleTriggerKeyDown(event) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(-1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (isOpen) {
        closeMenu();
        return;
      }

      openMenu(1);
    }
  }

  function handleSearchKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((currentIndex) => getNextEnabledOptionIndex(filteredOptions, currentIndex, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((currentIndex) => getNextEnabledOptionIndex(filteredOptions, currentIndex, -1));
      return;
    }

    if (event.key === "Enter") {
      const activeOption =
        filteredOptions[resolvedActiveIndex] || filteredOptions.find((option) => !option.disabled);

      if (activeOption) {
        event.preventDefault();
        commitSelection(activeOption);
      }
      return;
    }

    if (event.key === "Tab") {
      closeMenu();
    }
  }

  const canPortal = typeof document !== "undefined";
  const selectionSummary = multiple
    ? selectedOptions.length
      ? `${formatCountLabel(selectedOptions.length, "option")} selected`
      : "Choose one or more"
    : selectedOption
      ? "Current selection"
      : "Choose an option";
  const resultSummary = loading
    ? "Updating"
    : normalizedQuery
      ? formatCountLabel(filteredOptions.length, "match")
      : formatCountLabel(normalizedOptions.length, "option");
  const dropdown = isOpen && canPortal && dropdownLayout && portalTarget
    ? createPortal(
        <DropdownSurface
          $layout={dropdownLayout}
          data-placement={dropdownLayout.placement}
          ref={dropdownRef}
        >
          <DropdownTop>
            <DropdownHeader>
              <DropdownEyebrow>{selectionSummary}</DropdownEyebrow>
              <DropdownMeta>{resultSummary}</DropdownMeta>
            </DropdownHeader>
            <SearchWrap>
              <SearchIcon aria-hidden="true" />
              <SearchInput
                aria-activedescendant={
                  resolvedActiveIndex >= 0 ? `${listboxId}-${filteredOptions[resolvedActiveIndex]?.id}` : undefined
                }
                aria-controls={listboxId}
                aria-label={searchPlaceholder}
                aria-autocomplete="list"
                aria-expanded={isOpen}
                onChange={(event) => {
                  const nextQuery = event.target.value;

                  setQuery(nextQuery);
                  setActiveIndex(-1);
                  onSearchChange?.(nextQuery);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                ref={searchInputRef}
                role="combobox"
                type="search"
                value={query}
              />
            </SearchWrap>
          </DropdownTop>

          {loading ? (
            <StateMessage>{loadingMessage}</StateMessage>
          ) : filteredOptions.length ? (
            <OptionList aria-multiselectable={multiple || undefined} id={listboxId} role="listbox">
              {filteredOptions.map((option, index) => {
                const isSelected = selectedValueSet.has(option.value);

                return (
                  <OptionButton
                    $active={index === resolvedActiveIndex}
                    $selected={isSelected}
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    id={`${listboxId}-${option.id}`}
                    key={option.id}
                    onClick={() => commitSelection(option)}
                    onMouseEnter={() => {
                      if (!option.disabled) {
                        setActiveIndex(index);
                      }
                    }}
                    role="option"
                    tabIndex={-1}
                    type="button"
                  >
                    <OptionHeader>
                      <OptionLabel>
                        <OptionFlag
                          flagEmoji={option.flagEmoji}
                          flagImageUrl={option.flagImageUrl}
                          size="compact"
                        />
                        <OptionLabelText>{option.label}</OptionLabelText>
                      </OptionLabel>
                      <OptionMeta>
                        {option.badge ? <OptionBadge>{option.badge}</OptionBadge> : null}
                        <OptionIndicator $selected={isSelected} aria-hidden="true" />
                      </OptionMeta>
                    </OptionHeader>
                    {option.description ? (
                      <OptionDescription>{option.description}</OptionDescription>
                    ) : null}
                  </OptionButton>
                );
              })}
            </OptionList>
          ) : (
            <StateMessage>{emptyMessage}</StateMessage>
          )}
        </DropdownSurface>,
        portalTarget,
      )
    : null;

  return (
    <SelectRoot className={className} ref={rootRef}>
      {name
        ? multiple
          ? resolvedValue.map((entry) => (
              <HiddenInput key={`${name}-${entry}`} name={name} type="hidden" value={entry} />
            ))
          : <HiddenInput name={name} type="hidden" value={resolvedValue || ""} />
        : null}
      <CompactTriggerButton
        $invalid={invalid}
        $open={isOpen}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        id={resolvedId}
        onClick={() => (isOpen ? closeMenu() : openMenu(1))}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        type="button"
      >
        <TriggerValue>
          {multiple ? (
            selectedOptions.length ? (
              <>
                <TriggerLabel>{formatCountLabel(selectedOptions.length, "option")} selected</TriggerLabel>
                <TriggerChipRow>
                  {previewOptions.map((option) => (
                    <TriggerChip key={option.id} title={option.label}>
                      <LabelContent>
                        <OptionFlag
                          flagEmoji={option.flagEmoji}
                          flagImageUrl={option.flagImageUrl}
                          size="compact"
                        />
                        <TriggerLabelText>{option.label}</TriggerLabelText>
                      </LabelContent>
                    </TriggerChip>
                  ))}
                  {selectedOptions.length > previewOptions.length ? (
                    <TriggerChip $muted>
                      +{selectedOptions.length - previewOptions.length} more
                    </TriggerChip>
                  ) : null}
                </TriggerChipRow>
              </>
            ) : (
              <PlaceholderText>{placeholder}</PlaceholderText>
            )
          ) : selectedOption ? (
            <>
              <TriggerLabel>
                <OptionFlag
                  flagEmoji={selectedOption.flagEmoji}
                  flagImageUrl={selectedOption.flagImageUrl}
                  size="compact"
                />
                <TriggerLabelText>{selectedOption.label}</TriggerLabelText>
              </TriggerLabel>
              {selectedOption.description ? (
                <TriggerDescription>{selectedOption.description}</TriggerDescription>
              ) : null}
            </>
          ) : (
            <PlaceholderText>{placeholder}</PlaceholderText>
          )}
        </TriggerValue>
        <TriggerAdornment>
          {multiple
            ? selectedOptions.length > 1
              ? <TriggerBadge>{selectedOptions.length}</TriggerBadge>
              : null
            : selectedOption?.badge
              ? <TriggerBadge>{selectedOption.badge}</TriggerBadge>
              : null}
          <Caret $open={isOpen} aria-hidden="true" />
        </TriggerAdornment>
      </CompactTriggerButton>
      {dropdown}
    </SelectRoot>
  );
}
