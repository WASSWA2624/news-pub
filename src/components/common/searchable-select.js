"use client";

import { useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  Caret,
  CompactTriggerButton,
  DropdownEyebrow,
  DropdownHeader,
  DropdownMeta,
  DropdownSurface,
  DropdownTop,
  HiddenInput,
  LabelContent,
  OptionBadge,
  OptionButton,
  OptionDescription,
  OptionFlag,
  OptionHeader,
  OptionIndicator,
  OptionLabel,
  OptionLabelText,
  OptionList,
  OptionMeta,
  PlaceholderText,
  SearchIcon,
  SearchInput,
  SearchWrap,
  SelectRoot,
  StateMessage,
  TriggerAdornment,
  TriggerBadge,
  TriggerChip,
  TriggerChipRow,
  TriggerDescription,
  TriggerLabel,
  TriggerLabelText,
  TriggerValue,
} from "@/components/common/searchable-select.styles";
import {
  formatCountLabel,
  getNextEnabledOptionIndex,
  normalizeMultipleValues,
  normalizeOption,
  normalizeSingleValue,
  normalizeText,
  resolveDropdownLayout,
} from "@/components/common/searchable-select.utils";

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
  const deferredQuery = useDeferredValue(query);
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
  const normalizedQuery = normalizeText(deferredQuery);
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event) {
      const clickedTrigger = rootRef.current?.contains(event.target);
      const clickedDropdown = dropdownRef.current?.contains(event.target);

      if (!clickedTrigger && !clickedDropdown) {
        closeMenu();
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
  }, [filteredOptions.length, isOpen, loading, deferredQuery]);

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
  const dropdown =
    isOpen && canPortal && dropdownLayout && portalTarget
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
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-expanded={isOpen}
                  aria-label={searchPlaceholder}
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
