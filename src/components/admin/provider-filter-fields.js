"use client";

import { useMemo, useState } from "react";
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
import { getProviderFormDefinition } from "@/lib/news/provider-definitions";

const ProviderFieldGrid = styled(FieldGrid)`
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
`;

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

export default function ProviderFilterFields({
  namePrefix = "",
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

  const definition = useMemo(
    () => getProviderFormDefinition(providerKey, scope, dynamicValues),
    [dynamicValues, providerKey, scope],
  );

  if (!definition?.sections?.length) {
    return null;
  }

  return (
    <>
      {definition.sections.map((section) => {
        const standardFields = section.fields.filter((field) => field.input !== "checkboxes");
        const checkboxFields = section.fields.filter((field) => field.input === "checkboxes");

        return (
          <FormSection key={`${providerKey}-${section.key}`}>
            <FormSectionTitle>{section.title}</FormSectionTitle>
            {section.description ? <SmallText>{section.description}</SmallText> : null}
            {standardFields.length ? (
              <ProviderFieldGrid>
                {standardFields.map((field) => (
                  <Field key={field.key}>
                    <FieldLabel>{field.label}</FieldLabel>
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
                        defaultValue={readFieldValue(field, values)}
                        name={getFieldName(field, namePrefix)}
                        placeholder={field.placeholder || ""}
                        type={field.input === "date" ? "date" : "text"}
                      />
                    )}
                    {field.description ? <SmallText>{field.description}</SmallText> : null}
                  </Field>
                ))}
              </ProviderFieldGrid>
            ) : null}
            {checkboxFields.map((field) => (
              <CheckboxSearchField
                description={field.description}
                key={field.key}
                name={getFieldName(field, namePrefix)}
                options={field.options || []}
                selectedValues={readFieldValue(field, values)}
                title={field.label}
              />
            ))}
          </FormSection>
        );
      })}
    </>
  );
}
