"use client";

/**
 * Provider filter form sections used by the provider and stream editors.
 *
 * The stream scope deliberately distinguishes request-shaping fields from the
 * downstream local filtering that still happens after normalization.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import {
  Field,
  FieldGrid,
  FieldLabel,
  FormSection,
  FormSectionTitle,
  Input,
  SmallText,
} from "@/components/admin/news-admin-ui";
import CheckboxSearchField from "@/components/admin/checkbox-search-field";
import SearchableSelect from "@/components/common/searchable-select";
import { formatFetchWindowInputValue } from "@/lib/news/fetch-window";
import { getProviderFormDefinition } from "@/lib/news/provider-definitions";

const ProviderFieldGrid = styled(FieldGrid)`
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
`;

const ScopeBadge = styled.span`
  align-items: center;
  background: rgba(15, 111, 141, 0.1);
  border: 1px solid rgba(15, 111, 141, 0.16);
  border-radius: var(--theme-radius-lg, 2px);
  color: #0d5f79;
  display: inline-flex;
  font-size: 0.62rem;
  font-weight: 800;
  justify-self: start;
  min-height: var(--admin-compact-pill-min-height);
  padding: 0 0.48rem;
  text-transform: uppercase;
`;

const windowFieldKeys = new Set(["dateFrom", "dateTo", "fromDate", "timeframe", "toDate"]);

function createChangeSignature(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => createChangeSignature(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${key}:${createChangeSignature(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value ?? null);
}

function getFieldName(field, namePrefix = "") {
  if (!namePrefix) {
    return field.key;
  }

  return `${namePrefix}.${field.key}`;
}

function readFieldValue(field, values = {}) {
  const rawValue = values?.[field.key];

  if (field.input === "checkboxes") {
    return Array.isArray(rawValue) ? rawValue : [];
  }

  if (Array.isArray(rawValue)) {
    return rawValue[0] || "";
  }

  return `${rawValue ?? ""}`;
}

function readFieldInputValue(field, values = {}) {
  const rawValue = readFieldValue(field, values);

  if (field.input !== "date") {
    return rawValue;
  }

  return (
    formatFetchWindowInputValue(
      rawValue,
      field.precision === "datetime" ? "datetime" : "date",
    ) || rawValue
  );
}

/**
 * Renders provider-managed request fields for either provider defaults or one
 * stream-specific override set.
 *
 * @param {object} props - Provider filter rendering props.
 * @returns {JSX.Element|null} Provider request filter sections.
 */
export default function ProviderFilterFields({
  hideManagedWindowFields = false,
  namePrefix = "",
  onValuesChange = null,
  providerKey,
  scope,
  values = {},
}) {
  const [dynamicOverrides, setDynamicOverrides] = useState({});
  const dynamicValues = useMemo(
    () => ({
      ...(values || {}),
      ...(dynamicOverrides || {}),
    }),
    [dynamicOverrides, values],
  );
  const dynamicValuesSignature = useMemo(() => createChangeSignature(dynamicValues), [dynamicValues]);
  const emittedDynamicValuesRef = useRef(dynamicValues);

  const definition = useMemo(
    () => getProviderFormDefinition(providerKey, scope, dynamicValues),
    [dynamicValues, providerKey, scope],
  );

  useEffect(() => {
    emittedDynamicValuesRef.current = dynamicValues;
  }, [dynamicValues]);

  useEffect(() => {
    onValuesChange?.(emittedDynamicValuesRef.current);
  }, [dynamicValuesSignature, onValuesChange]);

  if (!definition?.sections?.length) {
    return null;
  }

  return (
    <>
      {definition.sections.map((section) => {
        const visibleFields = section.fields.filter(
          (field) => !(hideManagedWindowFields && scope === "stream" && windowFieldKeys.has(field.key)),
        );
        const standardFields = visibleFields.filter((field) => field.input !== "checkboxes");
        const checkboxFields = visibleFields.filter((field) => field.input === "checkboxes");

        if (!visibleFields.length) {
          return null;
        }

        return (
          <FormSection key={`${providerKey}-${section.key}`}>
            <FormSectionTitle>{section.title}</FormSectionTitle>
            {section.description ? <SmallText>{section.description}</SmallText> : null}
            {scope === "stream" ? (
              <SmallText>
                These fields narrow the upstream provider request. Keyword rules, category matching, duplicate checks, review, and destination decisions still run locally after NewsPub normalizes the fetched pool.
              </SmallText>
            ) : null}
            {standardFields.length ? (
              <ProviderFieldGrid>
                {standardFields.map((field) => (
                  <Field key={field.key}>
                    <FieldLabel>{field.label}</FieldLabel>
                    <ScopeBadge>
                      {["countryAllowlistJson", "languageAllowlistJson"].includes(field.key)
                        ? "Upstream + local"
                        : "Upstream request"}
                    </ScopeBadge>
                    {field.input === "single-select" ? (
                      <SearchableSelect
                        ariaLabel={field.label}
                        name={getFieldName(field, namePrefix)}
                        onChange={(value) =>
                          setDynamicOverrides((currentValues) => ({
                            ...currentValues,
                            [field.key]: value,
                          }))
                        }
                        options={field.options || []}
                        placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
                        value={readFieldValue(field, dynamicValues)}
                      />
                    ) : (
                      <Input
                        defaultValue={readFieldInputValue(field, values)}
                        name={getFieldName(field, namePrefix)}
                        placeholder={field.placeholder || ""}
                        type={
                          field.input === "date"
                            ? field.precision === "datetime"
                              ? "datetime-local"
                              : "date"
                            : "text"
                        }
                      />
                    )}
                    {field.description ? <SmallText>{field.description}</SmallText> : null}
                  </Field>
                ))}
              </ProviderFieldGrid>
            ) : null}
            {checkboxFields.map((field) => (
              <div key={field.key}>
                <ScopeBadge>
                  {["countryAllowlistJson", "languageAllowlistJson"].includes(field.key)
                    ? "Upstream + local"
                    : "Upstream request"}
                </ScopeBadge>
                <CheckboxSearchField
                  description={field.description}
                  name={getFieldName(field, namePrefix)}
                  options={field.options || []}
                  selectedValues={readFieldValue(field, values)}
                  title={field.label}
                />
              </div>
            ))}
          </FormSection>
        );
      })}
    </>
  );
}
