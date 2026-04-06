"use client";

import { useId, useMemo, useState } from "react";
import styled from "styled-components";

import {
  ActionIcon,
  ButtonRow,
  ButtonIcon,
  CheckboxChip,
  CheckboxRow,
  Field,
  FieldGrid,
  FieldLabel,
  FormSection,
  FormSectionTitle,
  Input,
  PrimaryButton,
  SecondaryButton,
  SmallText,
  Textarea,
} from "@/components/admin/news-admin-ui";
import { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
import SearchableSelect from "@/components/common/searchable-select";
import { getProviderRequestDefaultValues, listProviderDefinitions } from "@/lib/news/provider-definitions";
import ProviderFilterFields from "@/components/admin/provider-filter-fields";

const ProviderForm = styled.form`
  display: grid;
  gap: 0.95rem;
`;

const providerDescriptions = Object.freeze({
  mediastack: "Mediastack provider integration with the official live news filters.",
  newsapi: "NewsAPI provider integration with official Top Headlines and Everything filters.",
  newsdata: "NewsData provider integration with official Latest and Archive request filters.",
});

const providerBaseUrls = Object.freeze({
  mediastack: "https://api.mediastack.com/v1/news",
  newsapi: "https://newsapi.org/v2/top-headlines",
  newsdata: "https://newsdata.io/api/1/latest",
});

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
  const [metadataResetKey, setMetadataResetKey] = useState(0);
  const [requestDefaultsResetKey, setRequestDefaultsResetKey] = useState(0);
  const formId = useId();
  const selectedDefinition = providerDefinitions.find((definition) => definition.key === providerKey) || null;
  const isExistingProviderSelection = provider?.providerKey === providerKey;
  const nextLabel = isExistingProviderSelection ? provider?.label || selectedDefinition?.label || "" : selectedDefinition?.label || "";
  const nextBaseUrl = isExistingProviderSelection ? provider?.baseUrl || providerBaseUrls[providerKey] || "" : providerBaseUrls[providerKey] || "";
  const nextDescription = isExistingProviderSelection
    ? provider?.description || providerDescriptions[providerKey] || ""
    : providerDescriptions[providerKey] || "";
  const nextRequestDefaults = isExistingProviderSelection
    ? getProviderRequestDefaultValues(provider)
    : selectedDefinition?.defaultRequestDefaults || {};

  return (
    <ProviderForm action={action} id={formId}>
      <FieldGrid key={`provider-core-${providerKey}-${metadataResetKey}`}>
        <Field as="div">
          <FieldLabel>Provider Key</FieldLabel>
          <SearchableSelect
            ariaLabel="Provider key"
            name="providerKey"
            onChange={(value) => {
              setProviderKey(`${value || ""}`);
              setMetadataResetKey((currentValue) => currentValue + 1);
              setRequestDefaultsResetKey((currentValue) => currentValue + 1);
            }}
            options={providerKeyOptions}
            placeholder="Select a provider"
            value={providerKey}
          />
        </Field>
        <Field>
          <FieldLabel>Label</FieldLabel>
          <Input defaultValue={nextLabel} name="label" required />
        </Field>
        <Field>
          <FieldLabel>Base URL</FieldLabel>
          <Input defaultValue={nextBaseUrl} name="baseUrl" />
        </Field>
      </FieldGrid>

      <FormSection key={`provider-notes-${providerKey}-${metadataResetKey}`}>
        <FormSectionTitle>Provider Notes</FormSectionTitle>
        <ButtonRow>
          <SecondaryButton
            onClick={() => setMetadataResetKey((currentValue) => currentValue + 1)}
            type="button"
          >
            Reset to defaults
          </SecondaryButton>
        </ButtonRow>
        <Field>
          <FieldLabel>Description</FieldLabel>
          <Textarea defaultValue={nextDescription} name="description" />
        </Field>
        {selectedDefinition?.docsUrl ? (
          <SmallText>
            Official docs: <a href={selectedDefinition.docsUrl} rel="noreferrer" target="_blank">{selectedDefinition.docsUrl}</a>
          </SmallText>
        ) : null}
      </FormSection>

      <FormSection>
        <FormSectionTitle>Request Defaults</FormSectionTitle>
        <ButtonRow>
          <SecondaryButton
            onClick={() => setRequestDefaultsResetKey((currentValue) => currentValue + 1)}
            type="button"
          >
            Reset request defaults
          </SecondaryButton>
        </ButtonRow>
        <SmallText>
          Restore the selected provider&apos;s default request settings before saving.
        </SmallText>
      </FormSection>

      <ProviderFilterFields
        key={`provider-defaults-${providerKey}-${requestDefaultsResetKey}`}
        namePrefix="requestDefault"
        providerKey={providerKey}
        scope="provider"
        values={nextRequestDefaults}
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
      </FormSection>
      <AdminModalFooterActions>
        <PrimaryButton form={formId} type="submit">
          <ButtonIcon>
            <ActionIcon name="save" />
          </ButtonIcon>
          Save provider
        </PrimaryButton>
      </AdminModalFooterActions>
    </ProviderForm>
  );
}
