"use client";

import { useId, useMemo, useState } from "react";
import styled from "styled-components";

import {
  ActionIcon,
  ButtonIcon,
  Field,
  FieldGrid,
  FieldHint,
  FieldLabel,
  Input,
  SmallText,
  Textarea,
} from "@/components/admin/news-admin-ui";
import {
  AdminDisclosureSection,
  AdminValidationSummary,
} from "@/components/admin/admin-form-primitives";
import { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
import { PendingSubmitButton } from "@/components/admin/pending-action";
import SearchableSelect from "@/components/common/searchable-select";
import ProviderFilterFields from "@/components/admin/provider-filter-fields";
import { getProviderRequestDefaultValues, listProviderDefinitions } from "@/lib/news/provider-definitions";

const ProviderForm = styled.form`
  display: grid;
  gap: 0.95rem;
`;

const SectionActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
`;

const ToggleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
`;

const ToggleChip = styled.label`
  align-items: center;
  background: rgba(16, 32, 51, 0.04);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  gap: 0.38rem;
  min-height: calc(var(--admin-control-min-height) - 8px);
  padding: 0 0.68rem;

  input {
    accent-color: var(--theme-primary);
    margin: 0;
  }
`;

const ResetButton = styled.button`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(var(--theme-surface-alt-rgb), 0.975));
  border: 1px solid rgba(16, 32, 51, 0.1);
  border-radius: 0;
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.8rem;
  font-weight: 800;
  gap: var(--admin-control-gap);
  justify-content: center;
  min-height: var(--admin-button-min-height);
  padding: var(--admin-control-padding-block) var(--admin-control-padding-inline);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(27, 79, 147, 0.08);
    outline: none;
  }
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

/**
 * Renders the provider editor used by the admin workspace modal.
 *
 * @param {object} props - Provider form configuration props.
 * @returns {JSX.Element} The provider editor form.
 */
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
  const requestDefaultCount = Object.keys(nextRequestDefaults || {}).length;

  return (
    <ProviderForm action={action} id={formId}>
      <AdminValidationSummary
        items={[]}
        title="Provider metadata is ready to save."
        tone="success"
      />

      <AdminDisclosureSection
        defaultOpen
        meta={[
          {
            label: provider ? "Existing provider" : "New provider",
            tone: "muted",
          },
          ...(providerKey ? [{ label: providerKey, tone: "accent" }] : []),
        ]}
        summary="Choose the provider registry entry, adjust the saved label, and confirm the request base URL."
        title="Provider identity"
      >
        <FieldGrid key={`provider-core-${providerKey}-${metadataResetKey}`}>
          <Field as="div">
            <FieldLabel>Provider key</FieldLabel>
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
            <FieldHint>The provider key keeps the saved record aligned with the supported API adapter.</FieldHint>
          </Field>
          <Field>
            <FieldLabel>Label</FieldLabel>
            <Input defaultValue={nextLabel} name="label" required />
            <FieldHint>Use a clear editorial label that is easy to recognize in stream forms and job history.</FieldHint>
          </Field>
          <Field>
            <FieldLabel>Base URL</FieldLabel>
            <Input defaultValue={nextBaseUrl} name="baseUrl" />
            <FieldHint>Leave the official endpoint unless your provider contract requires a fixed regional host.</FieldHint>
          </Field>
        </FieldGrid>
      </AdminDisclosureSection>

      <AdminDisclosureSection
        defaultOpen
        meta={selectedDefinition?.docsUrl ? [{ label: "Docs linked", tone: "success" }] : []}
        summary="Capture the saved notes operators see before they connect streams to this provider."
        title="Provider notes"
      >
        <SectionActionRow>
          <ResetButton
            onClick={() => setMetadataResetKey((currentValue) => currentValue + 1)}
            type="button"
          >
            <ButtonIcon>
              <ActionIcon name="refresh" />
            </ButtonIcon>
            Reset to defaults
          </ResetButton>
        </SectionActionRow>
        <Field>
          <FieldLabel>Description</FieldLabel>
          <Textarea defaultValue={nextDescription} name="description" />
          <FieldHint>
            Describe the provider in operator language so the stream editor makes sense at a glance.
          </FieldHint>
        </Field>
        {selectedDefinition?.docsUrl ? (
          <SmallText>
            Official docs: <a href={selectedDefinition.docsUrl} rel="noreferrer" target="_blank">{selectedDefinition.docsUrl}</a>
          </SmallText>
        ) : null}
      </AdminDisclosureSection>

      <AdminDisclosureSection
        defaultOpen
        meta={[
          {
            label: `${requestDefaultCount} saved default${requestDefaultCount === 1 ? "" : "s"}`,
            tone: "muted",
          },
        ]}
        summary="Keep the request defaults deterministic so stream-level overrides stay small and predictable."
        title="Request defaults"
      >
        <SectionActionRow>
          <ResetButton
            onClick={() => setRequestDefaultsResetKey((currentValue) => currentValue + 1)}
            type="button"
          >
            <ButtonIcon>
              <ActionIcon name="refresh" />
            </ButtonIcon>
            Reset request defaults
          </ResetButton>
        </SectionActionRow>
        <FieldHint>
          Restore the selected provider&apos;s default request settings before saving when you want to discard local tweaks.
        </FieldHint>
        <ProviderFilterFields
          key={`provider-defaults-${providerKey}-${requestDefaultsResetKey}`}
          namePrefix="requestDefault"
          providerKey={providerKey}
          scope="provider"
          values={nextRequestDefaults}
        />
      </AdminDisclosureSection>

      <AdminDisclosureSection
        defaultOpen
        meta={[
          {
            label: provider?.isEnabled ?? true ? "Enabled" : "Disabled",
            tone: provider?.isEnabled ?? true ? "success" : "warning",
          },
        ]}
        summary="Control whether the provider is available for new streams and whether it can serve as the workspace default."
        title="Availability"
      >
        <ToggleRow>
          <ToggleChip>
            <input defaultChecked={provider?.isEnabled ?? true} name="isEnabled" type="checkbox" />
            Enabled
          </ToggleChip>
          <ToggleChip>
            <input defaultChecked={provider?.isSelectable ?? true} name="isSelectable" type="checkbox" />
            Selectable
          </ToggleChip>
          <ToggleChip>
            <input defaultChecked={provider?.isDefault ?? false} name="isDefault" type="checkbox" />
            Default
          </ToggleChip>
        </ToggleRow>
      </AdminDisclosureSection>

      <AdminModalFooterActions>
        <PendingSubmitButton
          form={formId}
          icon="save"
          pendingLabel="Saving provider..."
          tone="primary"
          type="submit"
        >
          Save provider
        </PendingSubmitButton>
      </AdminModalFooterActions>
    </ProviderForm>
  );
}
