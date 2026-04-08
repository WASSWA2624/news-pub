"use client";

/**
 * Searchable multi-checkbox field used by admin forms when option lists are
 * too long for plain checkbox rails.
 */

import { useMemo, useState } from "react";
import styled from "styled-components";

import AppIcon from "@/components/common/app-icon";
import {
  Field,
  FieldLabel,
  Input,
  SecondaryButton,
  SmallText,
} from "@/components/admin/news-admin-ui";
import OptionFlag from "@/components/common/option-flag";
import { MULTI_VALUE_EMPTY_SENTINEL } from "@/lib/news/provider-definitions";

const PickerWrap = styled.div`
  display: grid;
  gap: 0.6rem;
`;

const PickerPanel = styled.div`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(246, 250, 255, 0.98)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.08), transparent 46%);
  border: 1px solid rgba(16, 32, 51, 0.1);
  border-radius: var(--theme-radius-lg, 2px);
  display: grid;
  gap: 0.7rem;
  padding: 0.82rem 0.88rem;
`;

const PickerTrigger = styled.button`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(246, 250, 255, 0.98)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.08), transparent 46%);
  border: 1px solid rgba(16, 32, 51, 0.1);
  border-radius: var(--theme-radius-lg, 2px);
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 0.55rem;
  padding: 0.78rem 0.85rem;
  text-align: left;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
  width: 100%;

  &:hover {
    border-color: rgba(15, 111, 141, 0.18);
    transform: translateY(-1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(15, 111, 141, 0.12);
    outline: none;
  }
`;

const PickerTriggerHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
`;

const PickerTriggerTitle = styled.strong`
  color: #162744;
  font-size: 0.9rem;
  letter-spacing: -0.02em;
`;

const PickerTriggerMeta = styled.span`
  color: rgba(72, 85, 108, 0.82);
  font-size: 0.72rem;
  font-weight: 700;
`;

const PickerPlaceholder = styled.span`
  color: rgba(72, 85, 108, 0.84);
  font-size: 0.8rem;
  line-height: 1.45;
`;

const TriggerChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const TriggerChip = styled.span`
  align-items: center;
  background: rgba(36, 75, 115, 0.08);
  border: 1px solid rgba(36, 75, 115, 0.12);
  border-radius: var(--theme-radius-lg, 2px);
  color: #244b73;
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 700;
  gap: 0.32rem;
  min-height: 28px;
  padding: 0 0.58rem;
`;

const PickerTriggerFooter = styled.span`
  align-items: center;
  color: rgba(72, 85, 108, 0.88);
  display: inline-flex;
  font-size: 0.76rem;
  gap: 0.38rem;

  svg {
    flex: 0 0 auto;
    height: 0.86rem;
    width: 0.86rem;
  }
`;

const PickerModalContent = styled.div`
  display: grid;
  gap: 0.7rem;
`;

const SearchableCheckboxActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: space-between;
`;

const SearchFieldWrap = styled.label`
  align-items: center;
  background: white;
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: var(--theme-radius-md, 1px);
  box-shadow: 0 4px 12px rgba(16, 32, 51, 0.03);
  display: flex;
  gap: 0.48rem;
  min-height: 38px;
  padding: 0 0.68rem;

  &:focus-within {
    border-color: rgba(27, 79, 147, 0.42);
    box-shadow: 0 0 0 4px rgba(27, 79, 147, 0.08);
  }

  svg {
    color: rgba(36, 75, 115, 0.72);
    display: block;
    flex: 0 0 auto;
    height: 0.92rem;
    width: 0.92rem;
  }
`;

const SearchInput = styled(Input)`
  background: transparent;
  border: none;
  box-shadow: none;
  min-height: 100%;
  padding: 0;

  &:focus {
    box-shadow: none;
  }
`;

const SearchableCheckboxActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const ActionButton = styled(SecondaryButton)`
  min-height: 34px;
  padding: 0.42rem 0.78rem;
`;

const SearchableCheckboxList = styled.div`
  background: rgba(248, 251, 255, 0.86);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  max-height: min(48dvh, 28rem);
  overflow: auto;
  padding: 0.8rem;
`;

const SearchableCheckboxGrid = styled.div`
  display: grid;
  gap: 0.6rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 960px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const CheckboxChip = styled.label`
  align-items: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  color: #22344f;
  cursor: pointer;
  display: flex;
  gap: 0.6rem;
  min-height: 52px;
  min-width: 0;
  padding: 0.72rem 0.78rem;

  input {
    accent-color: var(--theme-primary);
    margin: 0;
  }
`;

const CheckboxLabelContent = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.45rem;
  max-width: 100%;
  min-width: 0;
`;

const CheckboxLabelText = styled.span`
  display: grid;
  gap: 0.12rem;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const CheckboxLabelTitle = styled.span`
  color: #162744;
  font-size: 0.8rem;
  font-weight: 800;
`;

const CheckboxLabelDescription = styled.span`
  color: rgba(72, 85, 108, 0.84);
  font-size: 0.72rem;
  line-height: 1.4;
`;

const SelectedSummaryPanel = styled.div`
  display: grid;
  gap: 0.45rem;
`;

const SelectedSummaryChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const StateText = styled.p`
  color: rgba(72, 85, 108, 0.9);
  font-size: 0.82rem;
  line-height: 1.45;
  margin: 0;
`;

function normalizeText(value) {
  return `${value ?? ""}`.trim().toLowerCase();
}

function normalizeOptionValue(value) {
  return `${value ?? ""}`;
}

export default function CheckboxSearchField({
  description = "",
  name,
  options = [],
  searchPlaceholder = "Search options",
  selectedValues = [],
  title,
}) {
  const [query, setQuery] = useState("");
  const [checkedValues, setCheckedValues] = useState(() =>
    (selectedValues || []).map((value) => normalizeOptionValue(value)),
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const orderedOptionValues = useMemo(
    () =>
      options
        .map((option) => normalizeOptionValue(option.value))
        .filter((value, index, values) => values.indexOf(value) === index),
    [options],
  );

  const selectedValueSet = useMemo(
    () => new Set(checkedValues),
    [checkedValues],
  );
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const searchable = normalizeText(
        [
          option.label,
          option.value,
          option.description,
          ...(option.keywords || []),
        ].join(" "),
      );

      return searchable.includes(normalizedQuery);
    });
  }, [options, query]);
  const selectedOptions = useMemo(() => {
    const optionByValue = new Map(
      options.map((option) => [normalizeOptionValue(option.value), option]),
    );

    return checkedValues
      .map((value) => optionByValue.get(value))
      .filter(Boolean);
  }, [checkedValues, options]);
  const visibleOptionValues = useMemo(
    () => filteredOptions.map((option) => normalizeOptionValue(option.value)),
    [filteredOptions],
  );
  const visibleOptionValueSet = useMemo(
    () => new Set(visibleOptionValues),
    [visibleOptionValues],
  );
  const hasVisibleOptions = visibleOptionValues.length > 0;
  const allVisibleSelected =
    hasVisibleOptions && visibleOptionValues.every((value) => selectedValueSet.has(value));
  const selectedCount = checkedValues.length;
  const previewOptions = selectedOptions.slice(0, 4);

  function handleToggle(optionValue, isChecked) {
    const normalizedValue = normalizeOptionValue(optionValue);

    setCheckedValues((currentValues) => {
      const nextValues = new Set(currentValues);

      if (isChecked) {
        nextValues.add(normalizedValue);
      } else {
        nextValues.delete(normalizedValue);
      }

      return orderedOptionValues.filter((value) => nextValues.has(value));
    });
  }

  function handleSelectVisible() {
    setCheckedValues((currentValues) => {
      const nextValues = new Set(currentValues);
      visibleOptionValues.forEach((value) => nextValues.add(value));

      return orderedOptionValues.filter((value) => nextValues.has(value));
    });
  }

  function handleDeselectVisible() {
    setCheckedValues((currentValues) =>
      currentValues.filter((value) => !visibleOptionValueSet.has(value)),
    );
  }

  return (
    <Field as="div">
      <FieldLabel>{title}</FieldLabel>
      {description ? <SmallText>{description}</SmallText> : null}
      <PickerWrap>
        <input name={name} type="hidden" value={MULTI_VALUE_EMPTY_SENTINEL} />
        <PickerTrigger
          aria-expanded={isPickerOpen}
          aria-label={`Choose ${title}`}
          onClick={() => setIsPickerOpen((currentValue) => !currentValue)}
          type="button"
        >
          <PickerTriggerHeader>
            <PickerTriggerTitle>
              {selectedCount ? `${selectedCount} selected` : `Choose ${title}`}
            </PickerTriggerTitle>
            <PickerTriggerMeta>{options.length} available</PickerTriggerMeta>
          </PickerTriggerHeader>
          {previewOptions.length ? (
            <TriggerChipRow>
              {previewOptions.map((option) => (
                <TriggerChip key={`${name}-preview-${option.value}`}>
                  <OptionFlag
                    flagEmoji={option.flagEmoji}
                    flagImageUrl={option.flagImageUrl}
                    size="compact"
                  />
                  {option.label}
                </TriggerChip>
              ))}
              {selectedCount > previewOptions.length ? (
                <TriggerChip key={`${name}-preview-more`}>
                  +{selectedCount - previewOptions.length} more
                </TriggerChip>
              ) : null}
            </TriggerChipRow>
          ) : (
            <PickerPlaceholder>No options selected yet.</PickerPlaceholder>
          )}
          <PickerTriggerFooter>
            <AppIcon name="search" size={14} />
            Search, bulk-select shown results, and review flags inline.
          </PickerTriggerFooter>
        </PickerTrigger>
        {isPickerOpen ? (
          <PickerPanel>
            <PickerModalContent>
              <SearchableCheckboxActions>
                <SearchableCheckboxActionGroup>
                  <ActionButton onClick={() => setIsPickerOpen(false)} type="button">
                    Done
                  </ActionButton>
                </SearchableCheckboxActionGroup>
                <SmallText>{selectedCount} selected</SmallText>
              </SearchableCheckboxActions>

            <SearchFieldWrap>
              <AppIcon name="search" size={15} />
              <SearchInput
                aria-label={`Search ${title}`}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                type="search"
                value={query}
              />
            </SearchFieldWrap>

            <SearchableCheckboxActions>
              <SearchableCheckboxActionGroup>
                <ActionButton
                  disabled={!hasVisibleOptions || allVisibleSelected}
                  onClick={handleSelectVisible}
                  type="button"
                >
                  {query ? "Select shown" : "Select all"}
                </ActionButton>
                <ActionButton
                  disabled={!hasVisibleOptions || !visibleOptionValues.some((value) => selectedValueSet.has(value))}
                  onClick={handleDeselectVisible}
                  type="button"
                >
                  {query ? "Deselect shown" : "Deselect all"}
                </ActionButton>
              </SearchableCheckboxActionGroup>
              <SmallText>{selectedCount} selected</SmallText>
            </SearchableCheckboxActions>

            {selectedOptions.length ? (
              <SelectedSummaryPanel>
                <SmallText>Selected summary</SmallText>
                <SelectedSummaryChips>
                  {selectedOptions.map((option) => (
                    <TriggerChip key={`${name}-selected-${option.value}`}>
                      <OptionFlag
                        flagEmoji={option.flagEmoji}
                        flagImageUrl={option.flagImageUrl}
                        size="compact"
                      />
                      {option.label}
                    </TriggerChip>
                  ))}
                </SelectedSummaryChips>
              </SelectedSummaryPanel>
            ) : null}

            <SearchableCheckboxList aria-busy="false">
              {filteredOptions.length ? (
                <SearchableCheckboxGrid>
                  {filteredOptions.map((option) => (
                    <CheckboxChip key={`${name}-${option.value}`}>
                      <input
                        checked={selectedValueSet.has(normalizeOptionValue(option.value))}
                        onChange={(event) => handleToggle(option.value, event.target.checked)}
                        name={name}
                        type="checkbox"
                        value={option.value}
                      />
                      <CheckboxLabelContent>
                        <OptionFlag
                          flagEmoji={option.flagEmoji}
                          flagImageUrl={option.flagImageUrl}
                          size="compact"
                        />
                        <CheckboxLabelText>
                          <CheckboxLabelTitle>{option.label}</CheckboxLabelTitle>
                          {option.description ? (
                            <CheckboxLabelDescription>{option.description}</CheckboxLabelDescription>
                          ) : null}
                        </CheckboxLabelText>
                      </CheckboxLabelContent>
                    </CheckboxChip>
                  ))}
                </SearchableCheckboxGrid>
              ) : (
                <StateText>No options match your current search.</StateText>
              )}
            </SearchableCheckboxList>

            <SmallText>
              Showing {filteredOptions.length} of {options.length} options.
            </SmallText>
            </PickerModalContent>
          </PickerPanel>
        ) : null}
      </PickerWrap>
    </Field>
  );
}
