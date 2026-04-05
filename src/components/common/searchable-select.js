"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

const VIEWPORT_MARGIN = 12;
const DROPDOWN_GAP = 8;
const MIN_DROPDOWN_WIDTH = 280;
const BASE_DROPDOWN_WIDTH = 340;
const MAX_DROPDOWN_WIDTH = 520;
const DEFAULT_DROPDOWN_HEIGHT = 360;
const MIN_FIT_THRESHOLD = 220;

function clampValue(value, minimum, maximum) {
  if (maximum < minimum) {
    return minimum;
  }

  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeText(value) {
  return `${value ?? ""}`.trim().toLowerCase();
}

function normalizeOption(option, index) {
  const value = `${option?.value ?? ""}`;
  const label = option?.label ? `${option.label}` : value;
  const description = option?.description ? `${option.description}` : "";
  const badge = option?.badge ? `${option.badge}` : "";
  const keywords = Array.isArray(option?.keywords)
    ? option.keywords.map((keyword) => `${keyword}`)
    : [];

  return {
    badge,
    description,
    disabled: Boolean(option?.disabled),
    id: option?.id ? `${option.id}` : `${value || "option"}-${index}`,
    keywords,
    label,
    searchText: normalizeText([label, description, value, badge, ...keywords].join(" ")),
    value,
  };
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

const SelectRoot = styled.div`
  min-width: 0;
  width: 100%;
`;

const HiddenInput = styled.input`
  display: none;
`;

const TriggerButton = styled.button`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(247, 250, 255, 0.96)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.06), transparent 55%);
  border: 1px solid ${({ $invalid, theme }) => ($invalid ? theme.colors.danger : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-shadow:
    0 10px 24px rgba(16, 32, 51, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
  color: ${({ theme }) => theme.colors.text};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  min-height: 46px;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.72rem 0.9rem;
  text-align: left;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
  width: 100%;

  &:hover {
    border-color: ${({ disabled, theme }) => (disabled ? theme.colors.border : "rgba(36, 75, 115, 0.24)")};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }

  &:focus-visible {
    border-color: ${({ $invalid, theme }) => ($invalid ? theme.colors.danger : theme.colors.primary)};
    box-shadow:
      0 16px 30px rgba(16, 32, 51, 0.08),
      0 0 0 4px
        ${({ $invalid }) => ($invalid ? "rgba(180, 35, 24, 0.14)" : "rgba(0, 95, 115, 0.14)")};
    outline: none;
  }
`;

const TriggerValue = styled.span`
  display: grid;
  gap: 0.08rem;
  min-width: 0;
`;

const TriggerLabel = styled.span`
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PlaceholderText = styled(TriggerLabel)`
  color: ${({ theme }) => theme.colors.muted};
  font-weight: 500;
`;

const TriggerAdornment = styled.span`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.55rem;
`;

const TriggerBadge = styled.span`
  background: rgba(36, 75, 115, 0.08);
  border: 1px solid rgba(36, 75, 115, 0.12);
  border-radius: 999px;
  color: #244b73;
  display: inline-flex;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  max-width: 7.5rem;
  overflow: hidden;
  padding: 0.24rem 0.48rem;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`;

const Caret = styled.span`
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(74, 90, 117, 0.92);
  flex: 0 0 auto;
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "none")};
  transition: transform 160ms ease;
`;

const DropdownSurface = styled.div`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(246, 250, 255, 0.985)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.09), transparent 58%);
  border: 1px solid rgba(24, 39, 66, 0.1);
  border-radius: 18px;
  box-shadow:
    0 28px 54px rgba(16, 32, 51, 0.14),
    0 6px 16px rgba(16, 32, 51, 0.05);
  display: grid;
  gap: 0.55rem;
  grid-template-rows: auto minmax(0, 1fr);
  left: ${({ $layout }) => `${$layout?.left || 0}px`};
  max-height: ${({ $layout }) => `${$layout?.maxHeight || DEFAULT_DROPDOWN_HEIGHT}px`};
  overflow: hidden;
  padding: 0.68rem;
  position: fixed;
  top: ${({ $layout }) => `${$layout?.top || 0}px`};
  width: ${({ $layout }) => `${$layout?.width || BASE_DROPDOWN_WIDTH}px`};
  z-index: 9999;
`;

const SearchWrap = styled.div`
  align-items: center;
  background: rgba(247, 250, 255, 0.98);
  border: 1px solid rgba(24, 39, 66, 0.08);
  border-radius: 999px;
  display: flex;
  flex: 0 0 auto;
  gap: 0.55rem;
  min-height: 40px;
  padding: 0 0.72rem;

  &:focus-within {
    border-color: rgba(36, 75, 115, 0.2);
    box-shadow: 0 0 0 3px rgba(36, 75, 115, 0.09);
  }
`;

const SearchIcon = styled.span`
  border: 2px solid rgba(74, 90, 117, 0.74);
  border-radius: 999px;
  display: inline-block;
  flex: 0 0 auto;
  height: 0.78rem;
  position: relative;
  width: 0.78rem;

  &::after {
    background: rgba(74, 90, 117, 0.74);
    border-radius: 999px;
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
  color: ${({ theme }) => theme.colors.text};
  flex: 1 1 auto;
  font-size: 0.9rem;
  min-width: 0;
  outline: none;
  padding: 0;

  &::placeholder {
    color: ${({ theme }) => theme.colors.muted};
  }
`;

const OptionList = styled.div`
  display: grid;
  flex: 1 1 auto;
  gap: 0.34rem;
  max-height: 100%;
  min-height: 0;
  overflow: auto;
  padding-right: 0.12rem;
`;

const OptionButton = styled.button`
  background: ${({ $active, $selected }) =>
    $selected
      ? "rgba(0, 95, 115, 0.11)"
      : $active
        ? "rgba(36, 75, 115, 0.08)"
        : "transparent"};
  border: 1px solid
    ${({ $active, $selected }) =>
      $selected
        ? "rgba(0, 95, 115, 0.18)"
        : $active
          ? "rgba(36, 75, 115, 0.14)"
          : "transparent"};
  border-radius: 14px;
  color: ${({ theme }) => theme.colors.text};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  display: grid;
  gap: 0.34rem;
  min-height: 56px;
  opacity: ${({ disabled }) => (disabled ? 0.55 : 1)};
  padding: 0.72rem 0.82rem;
  text-align: left;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
  width: 100%;

  &:hover {
    background: ${({ disabled }) => (disabled ? "transparent" : "rgba(36, 75, 115, 0.08)")};
    border-color: ${({ disabled }) => (disabled ? "transparent" : "rgba(36, 75, 115, 0.14)")};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

const OptionHeader = styled.div`
  align-items: start;
  display: grid;
  gap: 0.6rem;
  grid-template-columns: minmax(0, 1fr) auto;
`;

const OptionLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.28;
  overflow-wrap: anywhere;
`;

const OptionDescription = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.78rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
`;

const OptionMeta = styled.div`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.45rem;
  justify-self: end;
  padding-top: 0.08rem;
`;

const OptionBadge = styled.span`
  background: rgba(36, 75, 115, 0.08);
  border: 1px solid rgba(36, 75, 115, 0.12);
  border-radius: 999px;
  color: #244b73;
  display: inline-flex;
  flex: 0 1 auto;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  max-width: 10rem;
  overflow: hidden;
  padding: 0.22rem 0.46rem;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`;

const OptionIndicator = styled.span`
  background: ${({ $selected }) => ($selected ? "rgba(0, 95, 115, 0.92)" : "rgba(74, 90, 117, 0.18)")};
  border-radius: 999px;
  box-shadow: ${({ $selected }) => ($selected ? "0 0 0 4px rgba(0, 95, 115, 0.12)" : "none")};
  display: inline-flex;
  flex: 0 0 auto;
  height: 0.58rem;
  width: 0.58rem;
`;

const StateMessage = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.82rem;
  line-height: 1.55;
  padding: 0.28rem 0.4rem;
`;

export default function SearchableSelect({
  ariaLabel,
  defaultValue = "",
  disabled = false,
  emptyMessage = "No options found.",
  id,
  invalid = false,
  loading = false,
  loadingMessage = "Loading options...",
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
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownLayout, setDropdownLayout] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const normalizedOptions = useMemo(
    () => options.map((option, index) => normalizeOption(option, index)),
    [options],
  );
  const resolvedValue = value !== undefined ? value : internalValue;
  const selectedOption =
    normalizedOptions.find((option) => option.value === `${resolvedValue ?? ""}`) || null;
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

    const selectedIndex = filteredOptions.findIndex((option) => option.value === `${resolvedValue ?? ""}`);

    return selectedIndex >= 0 && !filteredOptions[selectedIndex]?.disabled
      ? selectedIndex
      : getNextEnabledOptionIndex(filteredOptions, -1, 1);
  }, [activeIndex, filteredOptions, resolvedValue]);

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

    setIsOpen(true);
    setQuery("");
    setActiveIndex(() => {
      const selectedIndex = normalizedOptions.findIndex((option) => option.value === `${resolvedValue ?? ""}`);

      if (selectedIndex >= 0 && !normalizedOptions[selectedIndex]?.disabled) {
        return selectedIndex;
      }

      return getNextEnabledOptionIndex(normalizedOptions, -1, direction);
    });
    setDropdownLayout(resolveDropdownLayout(triggerRect));
    onOpen?.();
  }

  function commitSelection(option) {
    if (!option || option.disabled) {
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
  const dropdown = isOpen && canPortal && dropdownLayout
    ? createPortal(
        <DropdownSurface
          $layout={dropdownLayout}
          data-placement={dropdownLayout.placement}
          ref={dropdownRef}
        >
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

          {loading ? (
            <StateMessage>{loadingMessage}</StateMessage>
          ) : filteredOptions.length ? (
            <OptionList id={listboxId} role="listbox">
              {filteredOptions.map((option, index) => {
                const isSelected = option.value === `${resolvedValue ?? ""}`;

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
                      <OptionLabel>{option.label}</OptionLabel>
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
        document.body,
      )
    : null;

  return (
    <SelectRoot ref={rootRef}>
      {name ? <HiddenInput name={name} type="hidden" value={resolvedValue || ""} /> : null}
      <TriggerButton
        $invalid={invalid}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        id={resolvedId}
        onClick={() => (isOpen ? closeMenu() : openMenu(1))}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        type="button"
      >
        <TriggerValue>
          {selectedOption ? (
            <TriggerLabel>{selectedOption.label}</TriggerLabel>
          ) : (
            <PlaceholderText>{placeholder}</PlaceholderText>
          )}
        </TriggerValue>
        <TriggerAdornment>
          {selectedOption?.badge ? <TriggerBadge>{selectedOption.badge}</TriggerBadge> : null}
          <Caret $open={isOpen} aria-hidden="true" />
        </TriggerAdornment>
      </TriggerButton>
      {dropdown}
    </SelectRoot>
  );
}
