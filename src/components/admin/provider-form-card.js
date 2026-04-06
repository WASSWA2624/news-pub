"use client";

import { useMemo, useState } from "react";

import {
  ButtonRow,
  CheckboxChip,
  CheckboxRow,
  Field,
  FieldGrid,
  FieldLabel,
  FormSection,
  FormSectionTitle,
  Input,
  PrimaryButton,
  SmallText,
  Textarea,
} from "@/components/admin/news-admin-ui";
import SearchableSelect from "@/components/common/searchable-select";
import { getProviderRequestDefaultValues, listProviderDefinitions } from "@/lib/news/provider-definitions";
import ProviderFilterFields from "@/components/admin/provider-filter-fields";

export default function ProviderFormCard({
  action,
  provider,
}) {
  const providerDefinitions = useMemo(() => listProviderDefinitions(), []);
  const providerKeyOptions = useMemo(
    () =>
      providerDefinitions.map((definition) => ({
        badge: definition.key,
        description: definition.docsUrl,
        label: definition.label,
        value: definition.key,
      })),
    [providerDefinitions],
  );
  const [providerKey, setProviderKey] = useState(provider?.providerKey || providerDefinitions[0]?.key || "");
  const selectedDefinition = providerDefinitions.find((definition) => definition.key === providerKey) || null;

  return (
    <form action={action}>
      <FieldGrid>
        <Field as="div">
          <FieldLabel>Provider Key</FieldLabel>
          <SearchableSelect
            ariaLabel="Provider key"
            name="providerKey"
            onChange={(value) => setProviderKey(`${value || ""}`)}
            options={providerKeyOptions}
            placeholder="Select a provider"
            value={providerKey}
          />
        </Field>
        <Field>
          <FieldLabel>Label</FieldLabel>
          <Input defaultValue={provider?.label || selectedDefinition?.label || ""} name="label" required />
        </Field>
        <Field>
          <FieldLabel>Base URL</FieldLabel>
          <Input defaultValue={provider?.baseUrl || ""} name="baseUrl" />
        </Field>
      </FieldGrid>

      <FormSection>
        <FormSectionTitle>Provider Notes</FormSectionTitle>
        <Field>
          <FieldLabel>Description</FieldLabel>
          <Textarea defaultValue={provider?.description || ""} name="description" />
        </Field>
        {selectedDefinition?.docsUrl ? (
          <SmallText>
            Official docs: <a href={selectedDefinition.docsUrl} rel="noreferrer" target="_blank">{selectedDefinition.docsUrl}</a>
          </SmallText>
        ) : null}
      </FormSection>

      <ProviderFilterFields
        key={`provider-defaults-${providerKey}`}
        namePrefix="requestDefault"
        providerKey={providerKey}
        scope="provider"
        values={getProviderRequestDefaultValues(provider)}
      />

      <FormSection>
        <FormSectionTitle>Availability</FormSectionTitle>
        <CheckboxRow>
          <CheckboxChip>
            <input defaultChecked={provider?.isEnabled ?? true} name="isEnabled" type="checkbox" /> Enabled
          </CheckboxChip>
          <CheckboxChip>
            <input defaultChecked={provider?.isSelectable ?? true} name="isSelectable" type="checkbox" /> Selectable
          </CheckboxChip>
          <CheckboxChip>
            <input defaultChecked={provider?.isDefault ?? false} name="isDefault" type="checkbox" /> Default
          </CheckboxChip>
        </CheckboxRow>
        <ButtonRow>
          <PrimaryButton type="submit">Save provider</PrimaryButton>
        </ButtonRow>
      </FormSection>
    </form>
  );
}
