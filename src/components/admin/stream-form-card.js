"use client";

import { useState } from "react";

import {
  ButtonRow,
  Field,
  FieldGrid,
  FieldLabel,
  FormSection,
  FormSectionTitle,
  Input,
  NoticeBanner,
  NoticeItem,
  NoticeList,
  NoticeTitle,
  PrimaryButton,
  SecondaryButton,
  SmallText,
  Textarea,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import CheckboxSearchField from "@/components/admin/checkbox-search-field";
import ProviderFilterFields from "@/components/admin/provider-filter-fields";
import SearchableSelect from "@/components/common/searchable-select";
import { getStreamProviderFormValues } from "@/lib/news/provider-definitions";
import {
  getStreamValidationIssues,
  isDestinationKindAutoPublishCapable,
} from "@/lib/validation/configuration";

function buildTemplateOptions(templateOptions, destination) {
  return templateOptions.map((option) => {
    if (!option.value) {
      return option;
    }

    const compatible = !destination?.platform || option.platform === destination.platform;

    return {
      ...option,
      description: compatible
        ? option.description
        : `${option.description} Requires a ${formatEnumLabel(option.platform)} destination.`,
      disabled: !compatible,
    };
  });
}

function buildModeOptions(modeOptions, destination) {
  return modeOptions.map((option) => {
    if (option.value !== "AUTO_PUBLISH" || !destination?.kind) {
      return option;
    }

    const compatible = isDestinationKindAutoPublishCapable(destination.kind);

    return {
      ...option,
      description: compatible
        ? option.description
        : `${option.description} ${formatEnumLabel(destination.kind)} destinations must stay in Review Required mode.`,
      disabled: !compatible,
    };
  });
}

export default function StreamFormCard({
  action,
  categoryOptions = [],
  destinationOptions = [],
  modeOptions = [],
  providerOptions = [],
  runNowAction,
  statusOptions = [],
  stream = null,
  submitLabel,
  templateOptions = [],
}) {
  const [activeProviderId, setActiveProviderId] = useState(
    stream?.activeProviderId || providerOptions[0]?.value || "",
  );
  const [destinationId, setDestinationId] = useState(stream?.destinationId || destinationOptions[0]?.value || "");
  const [defaultTemplateId, setDefaultTemplateId] = useState(stream?.defaultTemplateId || "");
  const [mode, setMode] = useState(stream?.mode || "REVIEW_REQUIRED");
  const [status, setStatus] = useState(stream?.status || "ACTIVE");
  const selectedDestination = destinationOptions.find((option) => option.value === destinationId) || null;
  const selectedProvider = providerOptions.find((option) => option.value === activeProviderId) || null;
  const selectedTemplate = templateOptions.find((option) => option.value === defaultTemplateId) || null;
  const issues = getStreamValidationIssues({
    destination: selectedDestination,
    mode,
    template: selectedTemplate?.value ? selectedTemplate : null,
  });
  const resolvedTemplateOptions = buildTemplateOptions(templateOptions, selectedDestination);
  const resolvedModeOptions = buildModeOptions(modeOptions, selectedDestination);

  function handleSubmit(event) {
    if (!issues.length) {
      return;
    }

    event.preventDefault();
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      {stream ? <input name="streamId" type="hidden" value={stream.id} /> : null}
      <FormSection>
        <FormSectionTitle>Core setup</FormSectionTitle>
        <FieldGrid>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input defaultValue={stream?.name || ""} name="name" required />
          </Field>
          <Field>
            <FieldLabel>Slug</FieldLabel>
            <Input defaultValue={stream?.slug || ""} name="slug" required={Boolean(stream)} />
          </Field>
          <Field as="div">
            <FieldLabel>Destination</FieldLabel>
            <SearchableSelect
              ariaLabel="Destination"
              invalid={issues.length > 0}
              name="destinationId"
              onChange={(value) => setDestinationId(`${value || ""}`)}
              options={destinationOptions}
              placeholder="Select a destination"
              value={destinationId}
            />
            {selectedDestination ? (
              <SmallText>
                Platform: {formatEnumLabel(selectedDestination.platform)} | Kind: {formatEnumLabel(selectedDestination.kind)}
              </SmallText>
            ) : null}
          </Field>
          <Field as="div">
            <FieldLabel>Provider</FieldLabel>
            <SearchableSelect
              ariaLabel="Provider"
              name="activeProviderId"
              onChange={(value) => setActiveProviderId(`${value || ""}`)}
              options={providerOptions}
              placeholder="Select a provider"
              value={activeProviderId}
            />
            {selectedProvider?.docsUrl ? (
              <SmallText>
                Official docs: <a href={selectedProvider.docsUrl} rel="noreferrer" target="_blank">{selectedProvider.docsUrl}</a>
              </SmallText>
            ) : null}
          </Field>
          <Field as="div">
            <FieldLabel>Mode</FieldLabel>
            <SearchableSelect
              ariaLabel="Stream mode"
              invalid={issues.length > 0}
              name="mode"
              onChange={(value) => setMode(`${value || ""}`)}
              options={resolvedModeOptions}
              placeholder="Select a mode"
              value={mode}
            />
          </Field>
          <Field as="div">
            <FieldLabel>Status</FieldLabel>
            <SearchableSelect
              ariaLabel="Stream status"
              name="status"
              onChange={(value) => setStatus(`${value || ""}`)}
              options={statusOptions}
              placeholder="Select a status"
              value={status}
            />
          </Field>
          <Field>
            <FieldLabel>Locale</FieldLabel>
            <Input defaultValue={stream?.locale || "en"} name="locale" required />
          </Field>
          <Field>
            <FieldLabel>Timezone</FieldLabel>
            <Input defaultValue={stream?.timezone || "UTC"} name="timezone" required />
          </Field>
          <Field as="div">
            <FieldLabel>Default template</FieldLabel>
            <SearchableSelect
              ariaLabel="Default template"
              invalid={issues.length > 0}
              name="defaultTemplateId"
              onChange={(value) => setDefaultTemplateId(`${value || ""}`)}
              options={resolvedTemplateOptions}
              placeholder="Select a template"
              value={defaultTemplateId}
            />
            {selectedDestination ? (
              <SmallText>
                Compatible template platform: {formatEnumLabel(selectedDestination.platform)}
              </SmallText>
            ) : null}
          </Field>
        </FieldGrid>
        <Field>
          <FieldLabel>Description</FieldLabel>
          <Textarea defaultValue={stream?.description || ""} name="description" />
        </Field>
      </FormSection>

      {issues.length ? (
        <FormSection>
          <NoticeBanner $tone="danger">
            <NoticeTitle>Incompatible stream configuration</NoticeTitle>
            <NoticeList>
              {issues.map((issue) => (
                <NoticeItem key={issue.code}>{issue.message}</NoticeItem>
              ))}
            </NoticeList>
          </NoticeBanner>
        </FormSection>
      ) : null}

      <FormSection>
        <FormSectionTitle>Scheduling and limits</FormSectionTitle>
        <FieldGrid>
          <Field>
            <FieldLabel>Schedule interval minutes</FieldLabel>
            <Input
              defaultValue={stream?.scheduleIntervalMinutes || 60}
              name="scheduleIntervalMinutes"
              type="number"
            />
          </Field>
          <Field>
            <FieldLabel>Schedule expression</FieldLabel>
            <Input defaultValue={stream?.scheduleExpression || ""} name="scheduleExpression" />
          </Field>
          <Field>
            <FieldLabel>Max posts per run</FieldLabel>
            <Input defaultValue={stream?.maxPostsPerRun || 5} name="maxPostsPerRun" type="number" />
          </Field>
          <Field>
            <FieldLabel>Duplicate window hours</FieldLabel>
            <Input
              defaultValue={stream?.duplicateWindowHours || 48}
              name="duplicateWindowHours"
              type="number"
            />
          </Field>
          <Field>
            <FieldLabel>Retry limit</FieldLabel>
            <Input defaultValue={stream?.retryLimit || 3} name="retryLimit" type="number" />
          </Field>
          <Field>
            <FieldLabel>Retry backoff minutes</FieldLabel>
            <Input
              defaultValue={stream?.retryBackoffMinutes || 15}
              name="retryBackoffMinutes"
              type="number"
            />
          </Field>
        </FieldGrid>
      </FormSection>

      {selectedProvider?.providerKey ? (
        <ProviderFilterFields
          key={`stream-provider-filters-${selectedProvider.providerKey}`}
          namePrefix="providerFilter"
          providerKey={selectedProvider.providerKey}
          scope="stream"
          values={getStreamProviderFormValues(stream)}
        />
      ) : null}

      <FormSection>
        <FormSectionTitle>Targeting rules</FormSectionTitle>
        <Field>
          <FieldLabel>Include keywords</FieldLabel>
          <Textarea
            defaultValue={(stream?.includeKeywordsJson || []).join(", ")}
            name="includeKeywordsJson"
          />
        </Field>
        <Field>
          <FieldLabel>Exclude keywords</FieldLabel>
          <Textarea
            defaultValue={(stream?.excludeKeywordsJson || []).join(", ")}
            name="excludeKeywordsJson"
          />
        </Field>
        <CheckboxSearchField
          description="Assign internal NewsPub categories used for matching, landing pages, and publication organization."
          name="categoryIds"
          options={categoryOptions}
          selectedValues={stream?.streamCategories?.map((category) => category.id) || []}
          title="Categories"
        />
        <ButtonRow>
          <PrimaryButton disabled={issues.length > 0} type="submit">
            {submitLabel}
          </PrimaryButton>
          {stream ? (
            <SecondaryButton
              disabled={issues.length > 0}
              formAction={runNowAction}
              formNoValidate
              type="submit"
            >
              Run now
            </SecondaryButton>
          ) : null}
        </ButtonRow>
        {stream ? (
          <SmallText>
            Destination: {stream.destination?.name || "Unknown"} | Provider: {stream.activeProvider?.label || "Unknown"}
          </SmallText>
        ) : (
          <SmallText>
            New streams can be created with schedule, retry, and targeting rules in a single pass.
          </SmallText>
        )}
      </FormSection>
    </form>
  );
}
