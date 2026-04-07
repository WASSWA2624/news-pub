"use client";

import { useCallback, useId, useState } from "react";
import styled from "styled-components";

import {
  ActionIcon,
  ButtonRow,
  ButtonIcon,
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
  SecondaryButton,
  SmallText,
  Textarea,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
import CheckboxSearchField from "@/components/admin/checkbox-search-field";
import { PendingSubmitButton } from "@/components/admin/pending-action";
import ProviderFilterFields from "@/components/admin/provider-filter-fields";
import AppIcon from "@/components/common/app-icon";
import SearchableSelect from "@/components/common/searchable-select";
import { createSlug, normalizeDisplayText } from "@/lib/normalization";
import { getStreamProviderFormValues } from "@/lib/news/provider-definitions";
import { getStreamSocialPostSettings } from "@/lib/news/social-post";
import {
  getStreamValidationIssues,
  isDestinationKindAutoPublishCapable,
} from "@/lib/validation/configuration";

const StreamFieldGrid = styled(FieldGrid)`
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
`;

const HelperRow = styled(SmallText)`
  align-items: center;
  display: inline-flex;
  gap: 0.38rem;

  svg {
    flex: 0 0 auto;
    height: 0.82rem;
    width: 0.82rem;
  }
`;

function trimFieldValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createOptionalStreamSlug(value) {
  const normalizedValue = normalizeDisplayText(value);

  return normalizedValue ? createSlug(normalizedValue, "stream") : "";
}

function getDestinationPlatformIcon(platform) {
  if (platform === "FACEBOOK") {
    return "facebook";
  }

  if (platform === "INSTAGRAM") {
    return "instagram";
  }

  return "globe";
}

function buildSuggestedStreamName(destination, provider) {
  const destinationLabel = normalizeDisplayText(destination?.label || destination?.name || "");
  const providerLabel = normalizeDisplayText(provider?.label || "");

  if (destinationLabel && providerLabel) {
    return `${destinationLabel} via ${providerLabel}`;
  }

  if (destinationLabel) {
    return `${destinationLabel} stream`;
  }

  if (providerLabel) {
    return `${providerLabel} stream`;
  }

  return "";
}

function buildSuggestedStreamIdentity(destination, provider) {
  const name = buildSuggestedStreamName(destination, provider);

  return {
    name,
    slug: createOptionalStreamSlug(name),
  };
}

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

const socialPostLinkPlacementOptions = [
  {
    description: "Choose below-title or end placement at publish time.",
    label: "Random",
    value: "RANDOM",
  },
  {
    description: "Insert the extra link immediately after the title.",
    label: "Below Title",
    value: "BELOW_TITLE",
  },
  {
    description: "Insert the extra link after the story CTA near the end.",
    label: "End",
    value: "END",
  },
];

export default function StreamFormCard({
  action,
  categoryOptions = [],
  destinationOptions = [],
  modeOptions = [],
  onRunNow,
  providerOptions = [],
  runInProgress = false,
  statusOptions = [],
  stream = null,
  submitLabel,
  templateOptions = [],
}) {
  const socialPostSettings = getStreamSocialPostSettings(stream);
  const initialActiveProviderId = stream?.activeProviderId || providerOptions[0]?.value || "";
  const initialDestinationId = stream?.destinationId || destinationOptions[0]?.value || "";
  const initialSelectedDestination =
    destinationOptions.find((option) => option.value === initialDestinationId) || null;
  const initialSelectedProvider =
    providerOptions.find((option) => option.value === initialActiveProviderId) || null;
  const initialSuggestedIdentity = buildSuggestedStreamIdentity(
    initialSelectedDestination,
    initialSelectedProvider,
  );
  const initialName = stream?.name || initialSuggestedIdentity.name;
  const initialSlug = stream?.slug || initialSuggestedIdentity.slug;
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [activeProviderId, setActiveProviderId] = useState(
    initialActiveProviderId,
  );
  const [destinationId, setDestinationId] = useState(initialDestinationId);
  const [defaultTemplateId, setDefaultTemplateId] = useState(stream?.defaultTemplateId || "");
  const [mode, setMode] = useState(stream?.mode || "REVIEW_REQUIRED");
  const [status, setStatus] = useState(stream?.status || "ACTIVE");
  const [postLinkPlacement, setPostLinkPlacement] = useState(socialPostSettings.linkPlacement);
  const [nameWasEdited, setNameWasEdited] = useState(
    Boolean(
      normalizeDisplayText(initialName)
      && normalizeDisplayText(initialName) !== initialSuggestedIdentity.name,
    ),
  );
  const [slugWasEdited, setSlugWasEdited] = useState(
    Boolean(trimFieldValue(initialSlug) && trimFieldValue(initialSlug) !== initialSuggestedIdentity.slug),
  );
  const formId = useId();
  const selectedDestination = destinationOptions.find((option) => option.value === destinationId) || null;
  const selectedProvider = providerOptions.find((option) => option.value === activeProviderId) || null;
  const selectedTemplate = templateOptions.find((option) => option.value === defaultTemplateId) || null;
  const suggestedIdentity = buildSuggestedStreamIdentity(selectedDestination, selectedProvider);
  const issues = getStreamValidationIssues({
    destination: selectedDestination || undefined,
    mode,
    template: selectedTemplate?.value ? selectedTemplate : undefined,
  });
  const resolvedTemplateOptions = buildTemplateOptions(templateOptions, selectedDestination);
  const resolvedModeOptions = buildModeOptions(modeOptions, selectedDestination);

  const applyIdentitySuggestion = useCallback(
    (nextSuggestedIdentity) => {
      let nextSlugValue = "";

      if ((!nameWasEdited || !normalizeDisplayText(name)) && nextSuggestedIdentity.name) {
        setName(nextSuggestedIdentity.name);
        setNameWasEdited(false);
        nextSlugValue = nextSuggestedIdentity.slug;

        if (!slugWasEdited || !normalizeDisplayText(slug)) {
          setSlug(nextSlugValue);
          setSlugWasEdited(false);
        }
      }
    },
    [name, nameWasEdited, slug, slugWasEdited],
  );

  function handleSubmit(event) {
    if (!issues.length) {
      return;
    }

    event.preventDefault();
  }

  return (
    <form action={action} id={formId} onSubmit={handleSubmit}>
      {stream ? <input name="streamId" type="hidden" value={stream.id} /> : null}
      <FormSection>
        <FormSectionTitle>Core setup</FormSectionTitle>
        <StreamFieldGrid>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              name="name"
              onChange={(event) => {
                const nextValue = event.target.value;
                const normalizedNextValue = normalizeDisplayText(nextValue);

                setName(nextValue);
                setNameWasEdited(
                  Boolean(normalizedNextValue && normalizedNextValue !== suggestedIdentity.name),
                );

                if (!slugWasEdited) {
                  setSlug(createOptionalStreamSlug(nextValue));
                  setSlugWasEdited(false);
                }
              }}
              required
              value={name}
            />
          </Field>
          <Field>
            <FieldLabel>Slug</FieldLabel>
            <Input
              name="slug"
              onChange={(event) => {
                const nextValue = event.target.value;

                setSlug(nextValue);
                setSlugWasEdited(
                  Boolean(trimFieldValue(nextValue) && trimFieldValue(nextValue) !== suggestedIdentity.slug),
                );
              }}
              required={Boolean(stream)}
              value={slug}
            />
            <HelperRow>
              <AppIcon name="sparkles" size={12} />
              Name and slug stay suggested from the selected destination and provider until you customize them.
            </HelperRow>
          </Field>
          <Field as="div">
            <FieldLabel>Destination</FieldLabel>
            <SearchableSelect
              ariaLabel="Destination"
              invalid={issues.length > 0}
              name="destinationId"
              onChange={(value) => {
                const nextDestinationId = `${value || ""}`;
                const nextDestination =
                  destinationOptions.find((option) => option.value === nextDestinationId) || null;

                setDestinationId(nextDestinationId);
                applyIdentitySuggestion(buildSuggestedStreamIdentity(nextDestination, selectedProvider));
              }}
              options={destinationOptions}
              placeholder="Select a destination"
              value={destinationId}
            />
            {selectedDestination ? (
              <HelperRow>
                <AppIcon name={getDestinationPlatformIcon(selectedDestination.platform)} size={12} />
                Platform: {formatEnumLabel(selectedDestination.platform)} | Kind: {formatEnumLabel(selectedDestination.kind)}
              </HelperRow>
            ) : null}
          </Field>
          <Field as="div">
            <FieldLabel>Provider</FieldLabel>
            <SearchableSelect
              ariaLabel="Provider"
              name="activeProviderId"
              onChange={(value) => {
                const nextProviderId = `${value || ""}`;
                const nextProvider =
                  providerOptions.find((option) => option.value === nextProviderId) || null;

                setActiveProviderId(nextProviderId);
                applyIdentitySuggestion(buildSuggestedStreamIdentity(selectedDestination, nextProvider));
              }}
              options={providerOptions}
              placeholder="Select a provider"
              value={activeProviderId}
            />
            {selectedProvider?.docsUrl ? (
              <HelperRow>
                <AppIcon name="server" size={12} />
                Official docs: <a href={selectedProvider.docsUrl} rel="noreferrer" target="_blank">{selectedProvider.docsUrl}</a>
              </HelperRow>
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
              <HelperRow>
                <AppIcon name="layout" size={12} />
                Compatible template platform: {formatEnumLabel(selectedDestination.platform)}
              </HelperRow>
            ) : null}
          </Field>
        </StreamFieldGrid>
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
        <StreamFieldGrid>
          <Field>
            <FieldLabel>Schedule interval minutes</FieldLabel>
            <Input
              defaultValue={stream?.scheduleIntervalMinutes ?? 60}
              min="0"
              name="scheduleIntervalMinutes"
              type="number"
            />
            <HelperRow>
              <AppIcon name="clock" size={12} />
              Set this to 0 to stop the stream from auto-running on the scheduler.
            </HelperRow>
          </Field>
          <Field>
            <FieldLabel>Max posts per run</FieldLabel>
            <Input defaultValue={stream?.maxPostsPerRun ?? 5} name="maxPostsPerRun" type="number" />
          </Field>
          <Field>
            <FieldLabel>Duplicate window hours</FieldLabel>
            <Input
              defaultValue={stream?.duplicateWindowHours ?? 48}
              name="duplicateWindowHours"
              type="number"
            />
          </Field>
          <Field>
            <FieldLabel>Retry limit</FieldLabel>
            <Input defaultValue={stream?.retryLimit ?? 3} name="retryLimit" type="number" />
          </Field>
          <Field>
            <FieldLabel>Retry backoff minutes</FieldLabel>
            <Input
              defaultValue={stream?.retryBackoffMinutes ?? 15}
              name="retryBackoffMinutes"
              type="number"
            />
          </Field>
        </StreamFieldGrid>
      </FormSection>

      <FormSection>
        <FormSectionTitle>Social post options</FormSectionTitle>
        <StreamFieldGrid>
          <Field>
            <FieldLabel>Post Link URL</FieldLabel>
            <Input
              defaultValue={socialPostSettings.linkUrl || ""}
              name="postLinkUrl"
              placeholder="https://example.com/more"
              type="url"
            />
            <HelperRow>
              <AppIcon name="link" size={12} />
              Optional extra plain-text link inserted into supported social posts.
            </HelperRow>
          </Field>
          <Field as="div">
            <FieldLabel>Post Link Placement</FieldLabel>
            <SearchableSelect
              ariaLabel="Post link placement"
              name="postLinkPlacement"
              onChange={(value) => setPostLinkPlacement(`${value || "RANDOM"}`)}
              options={socialPostLinkPlacementOptions}
              placeholder="Select placement"
              value={postLinkPlacement}
            />
          </Field>
        </StreamFieldGrid>
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
      <AdminModalFooterActions>
        {stream ? (
          <SecondaryButton
            disabled={issues.length > 0 || runInProgress}
            onClick={() => onRunNow?.(stream)}
            type="button"
          >
            <ButtonIcon>
              <ActionIcon name="play" />
            </ButtonIcon>
            Run now
          </SecondaryButton>
        ) : null}
        <PendingSubmitButton
          disabled={issues.length > 0}
          form={formId}
          icon={stream ? "save" : "plus"}
          pendingLabel={stream ? "Saving stream..." : "Creating stream..."}
          tone="primary"
          type="submit"
        >
          {submitLabel}
        </PendingSubmitButton>
      </AdminModalFooterActions>
    </form>
  );
}
