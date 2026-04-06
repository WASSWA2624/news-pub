"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";

import {
  CheckboxChip,
  CheckboxRow,
  Field,
  FieldLabel,
  Input,
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

function normalizeText(value) {
  return `${value ?? ""}`.trim().toLowerCase();
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
  const selectedValueSet = useMemo(
    () => new Set((selectedValues || []).map((value) => `${value ?? ""}`)),
    [selectedValues],
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
        <input name={name} type="hidden" value={MULTI_VALUE_EMPTY_SENTINEL} />
        <SearchableCheckboxList>
          <SearchableCheckboxGrid>
            {filteredOptions.map((option) => (
              <CheckboxChip key={`${name}-${option.value}`}>
                <input
                  defaultChecked={selectedValueSet.has(option.value)}
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
