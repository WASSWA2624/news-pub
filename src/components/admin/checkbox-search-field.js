"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";

import {
  CheckboxChip,
  CheckboxRow,
  Field,
  FieldLabel,
  Input,
  SecondaryButton,
  SmallText,
} from "@/components/admin/news-admin-ui";
import { MULTI_VALUE_EMPTY_SENTINEL } from "@/lib/news/provider-definitions";

const SearchableCheckboxWrap = styled.div`
  display: grid;
  gap: 0.55rem;
`;

const SearchableCheckboxList = styled.div`
  background: rgba(248, 251, 255, 0.86);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 14px;
  max-height: 260px;
  overflow: auto;
  padding: 0.7rem;
`;

const SearchableCheckboxGrid = styled(CheckboxRow)`
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
`;

const SearchableCheckboxActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: space-between;
`;

const SearchableCheckboxActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const ActionButton = styled(SecondaryButton)`
  min-height: 30px;
  padding: 0.42rem 0.72rem;
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
      <SearchableCheckboxWrap>
        <Input
          aria-label={`Search ${title}`}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          value={query}
        />
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
        <input name={name} type="hidden" value={MULTI_VALUE_EMPTY_SENTINEL} />
        <SearchableCheckboxList>
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
                {option.label}
              </CheckboxChip>
            ))}
          </SearchableCheckboxGrid>
        </SearchableCheckboxList>
        <SmallText>
          Showing {filteredOptions.length} of {options.length} options.
        </SmallText>
      </SearchableCheckboxWrap>
    </Field>
  );
}
