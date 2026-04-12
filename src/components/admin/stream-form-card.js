"use client";

/**
 * Admin stream editor that configures NewsPub filters, schedules, fetch windows, and publish behavior.
 */

import { useCallback, useId, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import {
  ActionIcon,
  ButtonIcon,
  Field,
  FieldErrorText,
  FieldGrid,
  FieldHint,
  FieldLabel,
  Input,
  SecondaryButton,
  SmallText,
  Textarea,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import {
  AdminDisclosureGroup,
  AdminDisclosureSection,
  AdminValidationSummary,
  scrollToFirstBlockingField,
} from "@/components/admin/admin-form-primitives";
import { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
import CheckboxSearchField from "@/components/admin/checkbox-search-field";
import FetchWindowControls from "@/components/admin/fetch-window-controls";
import { PendingSubmitButton } from "@/components/admin/pending-action";
import ProviderFilterFields from "@/components/admin/provider-filter-fields";
import AppIcon from "@/components/common/app-icon";
import SearchableSelect from "@/components/common/searchable-select";
import { createSlug, normalizeDisplayText } from "@/lib/normalization";
import {
  MULTI_VALUE_EMPTY_SENTINEL,
  getProviderDefinition,
  getProviderExecutionLimits,
  getProviderRequestDefaultValues,
  getStreamProviderFormValues,
} from "@/lib/news/provider-definitions";
import { getStreamSocialPostSettings } from "@/lib/news/social-post";
import {
  buildFetchWindowCapabilityDetails,
  createDefaultRunWindowState,
  createRunFetchWindowRequest,
} from "@/components/admin/stream-management-screen.helpers";
import {
  applyStreamFormResetSeed,
  createStreamFormResetSeed,
} from "@/components/admin/stream-form-card.helpers";
import {
  getStreamValidationIssues,
  isDestinationKindAutoPublishCapable,
} from "@/lib/validation/configuration";

const StreamForm = styled.form`
  display: grid;
  gap: 0.95rem;

  input[type="text"],
  input[type="number"],
  input[type="date"],
  input[type="datetime-local"],
  textarea,
  select {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(var(--theme-text-rgb), 0.6);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.94) inset,
      0 10px 22px rgba(22, 36, 49, 0.06);
  }

  input[type="text"]:hover,
  input[type="number"]:hover,
  input[type="date"]:hover,
  input[type="datetime-local"]:hover,
  textarea:hover,
  select:hover {
    border-color: rgba(var(--theme-text-rgb), 0.74);
  }
`;

const StreamFieldGrid = styled(FieldGrid)`
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
`;

const HelperRow = styled(FieldHint)`
  align-items: center;
  display: inline-flex;
  gap: 0.38rem;

  svg {
    flex: 0 0 auto;
    height: 0.82rem;
    width: 0.82rem;
  }
`;

const SectionActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
`;

function trimFieldValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseScopedFormValues(formElement, prefix) {
  if (!(formElement instanceof HTMLFormElement)) {
    return {};
  }

  const groupedEntries = new Map();

  for (const [rawKey, rawValue] of new FormData(formElement).entries()) {
    if (!rawKey.startsWith(prefix)) {
      continue;
    }

    const key = `${rawKey.slice(prefix.length)}`.trim();
    const value = typeof rawValue === "string" ? rawValue.trim() : "";

    if (!key) {
      continue;
    }

    if (!groupedEntries.has(key)) {
      groupedEntries.set(key, []);
    }

    groupedEntries.get(key).push(value);
  }

  return [...groupedEntries.entries()].reduce((result, [key, values]) => {
    const hadSentinel = values.includes(MULTI_VALUE_EMPTY_SENTINEL);
    const cleanedValues = values.filter((value) => value && value !== MULTI_VALUE_EMPTY_SENTINEL);

    result[key] = values.length > 1 || hadSentinel ? cleanedValues : cleanedValues[0] || "";

    return result;
  }, {});
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

function getSuggestedStreamMode(destination) {
  return destination?.platform === "WEBSITE" ? "AUTO_PUBLISH" : "REVIEW_REQUIRED";
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

function getRunWindowErrorMessage(error) {
  if (error instanceof Error && error.message === "run_window_boundaries_required") {
    return "Enter both the start and end boundaries before running the stream.";
  }

  if (error instanceof Error && error.message === "run_window_start_after_end") {
    return "Fetch window start must be earlier than or equal to the end boundary.";
  }

  return "NewsPub could not start the stream with the current manual window.";
}

function areProviderFormValuesEqual(leftValue, rightValue) {
  if (leftValue === rightValue) {
    return true;
  }

  if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
    if (!Array.isArray(leftValue) || !Array.isArray(rightValue) || leftValue.length !== rightValue.length) {
      return false;
    }

    return leftValue.every((entry, index) => areProviderFormValuesEqual(entry, rightValue[index]));
  }

  if (leftValue && rightValue && typeof leftValue === "object" && typeof rightValue === "object") {
    const leftKeys = Object.keys(leftValue);
    const rightKeys = Object.keys(rightValue);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(rightValue, key)
        && areProviderFormValuesEqual(leftValue[key], rightValue[key]),
    );
  }

  return `${leftValue ?? ""}` === `${rightValue ?? ""}`;
}

function buildStreamProviderFilterSeedValues(provider, stream, providerId) {
  if (stream?.activeProviderId === providerId) {
    return getStreamProviderFormValues(stream);
  }

  return getProviderRequestDefaultValues(provider);
}

function getOfficialProviderDefaultValues(providerKey) {
  return getProviderDefinition(providerKey)?.defaultRequestDefaults || {};
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

/**
 * Renders the stream editor used by the admin streams workspace modal.
 *
 * @param {object} props - Stream form configuration props.
 * @returns {JSX.Element} The stream editor form.
 */
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
  uiNowIso = "",
}) {
  const socialPostSettings = getStreamSocialPostSettings(stream);
  const initialActiveProviderId = stream?.activeProviderId || providerOptions[0]?.value || "";
  const initialDestinationId = stream?.destinationId || destinationOptions[0]?.value || "";
  const initialSelectedDestination =
    destinationOptions.find((option) => option.value === initialDestinationId) || null;
  const initialSelectedProvider =
    providerOptions.find((option) => option.value === initialActiveProviderId) || null;
  const initialProviderFormValues = buildStreamProviderFilterSeedValues(
    initialSelectedProvider,
    stream,
    initialActiveProviderId,
  );
  const initialSuggestedIdentity = buildSuggestedStreamIdentity(
    initialSelectedDestination,
    initialSelectedProvider,
  );
  const initialSuggestedMode = getSuggestedStreamMode(initialSelectedDestination);
  const initialName = stream?.name || initialSuggestedIdentity.name;
  const initialSlug = stream?.slug || initialSuggestedIdentity.slug;
  const initialRunWindowState = createDefaultRunWindowState(uiNowIso || new Date());
  const initialNameWasEdited = Boolean(
    normalizeDisplayText(initialName)
    && normalizeDisplayText(initialName) !== initialSuggestedIdentity.name,
  );
  const initialSlugWasEdited = Boolean(
    trimFieldValue(initialSlug) && trimFieldValue(initialSlug) !== initialSuggestedIdentity.slug,
  );
  const initialModeWasEdited = Boolean(stream?.mode && stream.mode !== initialSuggestedMode);
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [activeProviderId, setActiveProviderId] = useState(initialActiveProviderId);
  const [destinationId, setDestinationId] = useState(initialDestinationId);
  const [defaultTemplateId, setDefaultTemplateId] = useState(stream?.defaultTemplateId || "");
  const [mode, setMode] = useState(stream?.mode || initialSuggestedMode);
  const [status, setStatus] = useState(stream?.status || "ACTIVE");
  const [maxPostsPerRun, setMaxPostsPerRun] = useState(`${stream?.maxPostsPerRun ?? 5}`);
  const [postLinkPlacement, setPostLinkPlacement] = useState(socialPostSettings.linkPlacement);
  const [providerFormValues, setProviderFormValues] = useState(initialProviderFormValues);
  const [providerFiltersResetKey, setProviderFiltersResetKey] = useState(0);
  const [formResetKey, setFormResetKey] = useState(0);
  const [runWindowState, setRunWindowState] = useState(initialRunWindowState);
  const [runWindowError, setRunWindowError] = useState("");
  const [nameWasEdited, setNameWasEdited] = useState(initialNameWasEdited);
  const [slugWasEdited, setSlugWasEdited] = useState(initialSlugWasEdited);
  const [modeWasEdited, setModeWasEdited] = useState(initialModeWasEdited);
  const formId = useId();
  const formRef = useRef(null);
  const initialSeedRef = useRef(
    createStreamFormResetSeed({
      activeProviderId: initialActiveProviderId,
      defaultTemplateId: stream?.defaultTemplateId || "",
      destinationId: initialDestinationId,
      maxPostsPerRun: `${stream?.maxPostsPerRun ?? 5}`,
      mode: stream?.mode || initialSuggestedMode,
      modeWasEdited: initialModeWasEdited,
      name: initialName,
      nameWasEdited: initialNameWasEdited,
      postLinkPlacement: socialPostSettings.linkPlacement,
      providerKey: initialSelectedProvider?.providerKey,
      providerFormValues: initialProviderFormValues,
      runWindowState: initialRunWindowState,
      slug: initialSlug,
      slugWasEdited: initialSlugWasEdited,
      status: stream?.status || "ACTIVE",
    }),
  );
  const selectedDestination = destinationOptions.find((option) => option.value === destinationId) || null;
  const selectedProvider = providerOptions.find((option) => option.value === activeProviderId) || null;
  const selectedTemplate = templateOptions.find((option) => option.value === defaultTemplateId) || null;
  const providerExecutionLimits = selectedProvider?.providerKey
    ? getProviderExecutionLimits(selectedProvider.providerKey)
    : {};
  const maxPostsPerRunLimit = providerExecutionLimits.maxPostsPerRun || null;
  const suggestedIdentity = buildSuggestedStreamIdentity(selectedDestination, selectedProvider);
  const suggestedMode = getSuggestedStreamMode(selectedDestination);
  const issues = getStreamValidationIssues({
    destination: selectedDestination || undefined,
    maxPostsPerRun,
    mode,
    providerDefaults:
      selectedProvider?.requestDefaultsJson
      || stream?.activeProvider?.requestDefaultsJson
      || {},
    providerFilters: providerFormValues,
    providerKey: selectedProvider?.providerKey,
    template: selectedTemplate?.value ? selectedTemplate : undefined,
  });
  const resolvedTemplateOptions = buildTemplateOptions(templateOptions, selectedDestination);
  const resolvedModeOptions = buildModeOptions(modeOptions, selectedDestination);
  const fetchWindowCapabilityDetails = selectedProvider?.providerKey
    ? buildFetchWindowCapabilityDetails([
        {
          activeProvider: {
            label: selectedProvider.label,
            providerKey: selectedProvider.providerKey,
            requestDefaultsJson:
              selectedProvider.requestDefaultsJson
              || stream?.activeProvider?.requestDefaultsJson
              || {},
          },
          countryAllowlistJson: stream?.countryAllowlistJson || [],
          languageAllowlistJson: stream?.languageAllowlistJson || [],
          locale: stream?.locale || "en",
          settingsJson: {
            providerFilters: providerFormValues,
          },
        },
      ])
    : [];

  function handleProviderFormValuesChange(nextValues) {
    setProviderFormValues((currentValues) =>
      areProviderFormValuesEqual(currentValues, nextValues) ? currentValues : nextValues,
    );
  }

  function syncProviderFormValuesFromForm() {
    const nextProviderFormValues = parseScopedFormValues(formRef.current, "providerFilter.");

    setProviderFormValues((currentValues) =>
      areProviderFormValuesEqual(currentValues, nextProviderFormValues)
        ? currentValues
        : nextProviderFormValues,
    );
  }

  function resetProviderFiltersToSelectedProviderDefaults() {
    const savedProviderDefaults = getProviderRequestDefaultValues(selectedProvider);
    const nextProviderFormValues = Object.keys(savedProviderDefaults).length
      ? savedProviderDefaults
      : getOfficialProviderDefaultValues(selectedProvider?.providerKey);

    setProviderFormValues(nextProviderFormValues);
    setProviderFiltersResetKey((currentValue) => currentValue + 1);
  }

  function restoreProviderFiltersToOfficialDefaults() {
    setProviderFormValues(getOfficialProviderDefaultValues(selectedProvider?.providerKey));
    setProviderFiltersResetKey((currentValue) => currentValue + 1);
  }

  function resetStreamFormDefaults() {
    formRef.current?.reset();
    applyStreamFormResetSeed(initialSeedRef.current, {
      setActiveProviderId,
      setDefaultTemplateId,
      setDestinationId,
      setMaxPostsPerRun,
      setMode,
      setModeWasEdited,
      setName,
      setNameWasEdited,
      setPostLinkPlacement,
      setProviderFormValues,
      setRunWindowState,
      setSlug,
      setSlugWasEdited,
      setStatus,
    });
    setFormResetKey((currentValue) => currentValue + 1);
    setProviderFiltersResetKey((currentValue) => currentValue + 1);
    setRunWindowError("");
  }

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
    scrollToFirstBlockingField(formRef.current);
  }

  function resetRunWindow() {
    setRunWindowState(createDefaultRunWindowState(uiNowIso || new Date()));
    setRunWindowError("");
  }

  function handleRunNowClick() {
    if (!stream) {
      return;
    }

    try {
      const fetchWindow = createRunFetchWindowRequest(runWindowState);

      setRunWindowError("");
      onRunNow?.({
        fetchWindow,
        stream,
      });
    } catch (error) {
      setRunWindowError(getRunWindowErrorMessage(error));
      formRef.current
        ?.querySelector("input[type='datetime-local']")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }
  }

  return (
    <StreamForm
      action={action}
      id={formId}
      onChangeCapture={syncProviderFormValuesFromForm}
      onInputCapture={syncProviderFormValuesFromForm}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {stream ? <input name="streamId" type="hidden" value={stream.id} /> : null}

      <AdminValidationSummary
        items={issues.map((issue) => issue.message)}
        title="Fix the highlighted stream sections before saving."
      />

      <AdminDisclosureGroup>
      <AdminDisclosureSection
        completionLabel={name && slug ? "Core setup ready" : ""}
        defaultOpen
        errorCount={issues.length}
        meta={[
          {
            label: selectedDestination?.platform ? formatEnumLabel(selectedDestination.platform) : "Destination pending",
            tone: selectedDestination?.platform ? "muted" : "warning",
          },
          {
            label: formatEnumLabel(mode),
            tone: mode === "AUTO_PUBLISH" ? "accent" : "warning",
          },
          {
            label: formatEnumLabel(status),
            tone: status === "ACTIVE" ? "success" : "warning",
          },
        ]}
        summary="Choose the destination, provider, workflow mode, and template compatibility before editing targeting rules."
        title="Core setup"
      >
        <SectionActionRow>
          <SecondaryButton onClick={resetStreamFormDefaults} type="button">
            <ButtonIcon>
              <ActionIcon name="refresh" />
            </ButtonIcon>
            Reset stream form
          </SecondaryButton>
        </SectionActionRow>
        <StreamFieldGrid key={`stream-core-${formResetKey}`}>
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
            <FieldHint>Use a stream name operators can recognize immediately in the dashboard, jobs page, and review flows.</FieldHint>
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

                if (!modeWasEdited) {
                  setMode(getSuggestedStreamMode(nextDestination));
                  setModeWasEdited(false);
                }
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
            ) : (
              <FieldHint>Select the publishing destination this stream should feed.</FieldHint>
            )}
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
                const nextProviderFormValues = buildStreamProviderFilterSeedValues(nextProvider, stream, nextProviderId);

                setActiveProviderId(nextProviderId);
                setProviderFormValues(nextProviderFormValues);
                setProviderFiltersResetKey((currentValue) => currentValue + 1);
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
            ) : (
              <FieldHint>Choose the source provider whose normalized stories should enter this workflow.</FieldHint>
            )}
          </Field>
          <Field as="div">
            <FieldLabel>Mode</FieldLabel>
            <SearchableSelect
              ariaLabel="Stream mode"
              invalid={issues.length > 0}
              name="mode"
              onChange={(value) => {
                const nextMode = `${value || ""}` || suggestedMode;

                setMode(nextMode);
                setModeWasEdited(nextMode !== suggestedMode);
              }}
              options={resolvedModeOptions}
              placeholder="Select a mode"
              value={mode}
            />
            <FieldHint>
              Website streams default to Auto Publish so every locally eligible story can ship promptly. Social destinations stay safer by default in Review Required mode, and Auto Publish only works for compatible destination kinds.
            </FieldHint>
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
            <FieldHint>Pause a stream when it should stay configured but stop manual and scheduled execution.</FieldHint>
          </Field>
          <Field>
            <FieldLabel>Locale</FieldLabel>
            <Input defaultValue={stream?.locale || "en"} name="locale" required />
            <FieldHint>The locale controls translation, SEO path generation, and template resolution.</FieldHint>
          </Field>
          <Field>
            <FieldLabel>Timezone</FieldLabel>
            <Input defaultValue={stream?.timezone || "UTC"} name="timezone" required />
            <FieldHint>Use the stream timezone for scheduling, publish windows, and operator-facing run timing.</FieldHint>
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
            ) : (
              <FieldHint>Leave the template unset to let NewsPub resolve the best platform-aware fallback automatically.</FieldHint>
            )}
            {issues.length ? <FieldErrorText>{issues[0].message}</FieldErrorText> : null}
          </Field>
        </StreamFieldGrid>
        <Field key={`stream-description-${formResetKey}`}>
          <FieldLabel>Description</FieldLabel>
          <Textarea defaultValue={stream?.description || ""} name="description" />
          <FieldHint>Describe the stream in operator language so future edits are faster and safer.</FieldHint>
        </Field>
      </AdminDisclosureSection>

      <AdminDisclosureSection
        completionLabel="24h + 30m default ready"
        defaultOpen
        meta={[
          {
            label: "24h lookback + 30m buffer",
            tone: "accent",
          },
          {
            label: runWindowState.writeCheckpointOnSuccess ? "Checkpoint writes on" : "Checkpoint writes off",
            tone: runWindowState.writeCheckpointOnSuccess ? "warning" : "muted",
          },
        ]}
        summary="NewsPub resolves one normalized manual window for every run. The default spans the previous 24 hours through the next 30 minutes so the newest stories are protected from provider indexing, API, and processing delays before provider-specific mapping is applied."
        title="Fetch window defaults"
      >
        <FetchWindowControls
          capabilityDetails={fetchWindowCapabilityDetails}
          endValue={runWindowState.endInputValue}
          onEndChange={(value) =>
            setRunWindowState((currentState) => ({
              ...currentState,
              endInputValue: value,
            }))
          }
          onReset={resetRunWindow}
          onStartChange={(value) =>
            setRunWindowState((currentState) => ({
              ...currentState,
              startInputValue: value,
            }))
          }
          onWriteCheckpointChange={(value) =>
            setRunWindowState((currentState) => ({
              ...currentState,
              writeCheckpointOnSuccess: value,
            }))
          }
          startValue={runWindowState.startInputValue}
          writeCheckpointOnSuccess={runWindowState.writeCheckpointOnSuccess}
        />
        {runWindowError ? <FieldErrorText>{runWindowError}</FieldErrorText> : null}
      </AdminDisclosureSection>

      <AdminDisclosureSection
        completionLabel="Scheduling ready"
        defaultOpen={false}
        meta={[
          {
            label: `${stream?.scheduleIntervalMinutes ?? 60} min cadence`,
            tone: "muted",
          },
          {
            label: `${stream?.retryLimit ?? 3} retries`,
            tone: "muted",
          },
        ]}
        summary="Set the run cadence, result limits, duplicate window, and retry policy that shape end-to-end automation."
        title="Scheduling and limits"
      >
        <StreamFieldGrid key={`stream-scheduling-${formResetKey}`}>
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
            <Input
              max={maxPostsPerRunLimit?.max}
              min={maxPostsPerRunLimit?.min || 1}
              name="maxPostsPerRun"
              onChange={(event) => setMaxPostsPerRun(event.target.value)}
              step="1"
              type="number"
              value={maxPostsPerRun}
            />
            <FieldHint>
              {maxPostsPerRunLimit
                ? `Keep this between ${maxPostsPerRunLimit.min} and ${maxPostsPerRunLimit.max} for ${selectedProvider?.label || "the selected provider"}. ${maxPostsPerRunLimit.reason}`
                : "Keep social runs bounded so queues stay responsive. Website streams still publish every locally eligible article from the fetched pool."}
            </FieldHint>
          </Field>
          <Field>
            <FieldLabel>Duplicate window hours</FieldLabel>
            <Input
              defaultValue={stream?.duplicateWindowHours ?? 48}
              min="1"
              name="duplicateWindowHours"
              step="1"
              type="number"
            />
            <FieldHint>Stories published inside this cooldown stay blocked unless a manual repost bypass is requested.</FieldHint>
          </Field>
          <Field>
            <FieldLabel>Retry limit</FieldLabel>
            <Input defaultValue={stream?.retryLimit ?? 3} min="0" name="retryLimit" step="1" type="number" />
            <FieldHint>Retryable publish attempts stop once this limit is reached.</FieldHint>
          </Field>
          <Field>
            <FieldLabel>Retry backoff minutes</FieldLabel>
            <Input
              defaultValue={stream?.retryBackoffMinutes ?? 15}
              min="0"
              name="retryBackoffMinutes"
              step="1"
              type="number"
            />
            <FieldHint>Use a modest backoff so flaky destinations recover without overwhelming downstream APIs.</FieldHint>
          </Field>
        </StreamFieldGrid>
      </AdminDisclosureSection>

      <AdminDisclosureSection
        completionLabel="Social options ready"
        defaultOpen={false}
        meta={[
          {
            label: postLinkPlacement === "RANDOM" ? "Random placement" : formatEnumLabel(postLinkPlacement),
            tone: "muted",
          },
        ]}
        summary="Control the optional plain-text CTA link inserted into supported social destination payloads."
        title="Social post options"
      >
        <StreamFieldGrid key={`stream-social-${formResetKey}`}>
          <Field>
            <FieldLabel>Post link URL</FieldLabel>
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
            <FieldLabel>Post link placement</FieldLabel>
            <SearchableSelect
              ariaLabel="Post link placement"
              name="postLinkPlacement"
              onChange={(value) => setPostLinkPlacement(`${value || "RANDOM"}`)}
              options={socialPostLinkPlacementOptions}
              placeholder="Select placement"
              value={postLinkPlacement}
            />
            <FieldHint>Choose whether the plain-text link sits below the title, near the CTA, or alternates automatically.</FieldHint>
          </Field>
        </StreamFieldGrid>
      </AdminDisclosureSection>

      {selectedProvider?.providerKey ? (
        <AdminDisclosureSection
          completionLabel="Provider filters ready"
          defaultOpen={false}
          meta={[
            {
              label: selectedProvider.providerKey,
              tone: "accent",
            },
          ]}
          summary="Override provider-specific request filters only when this stream needs narrower fetch behavior than the saved provider defaults. Compatible multi-stream runs fetch broadly once, then NewsPub filters locally per stream."
          title="Provider request filters"
        >
          <SectionActionRow>
            <SecondaryButton
              onClick={resetProviderFiltersToSelectedProviderDefaults}
              type="button"
            >
              <ButtonIcon>
                <ActionIcon name="refresh" />
              </ButtonIcon>
              Reset to provider defaults
            </SecondaryButton>
            <SecondaryButton
              onClick={restoreProviderFiltersToOfficialDefaults}
              type="button"
            >
              <ButtonIcon>
                <ActionIcon name="sparkles" />
              </ButtonIcon>
              Restore official defaults
            </SecondaryButton>
          </SectionActionRow>
          <FieldHint>
            Reset uses the saved provider profile defaults and falls back to official defaults when none are saved. Restore official defaults always reloads the integration baseline.
          </FieldHint>
          <ProviderFilterFields
            key={`stream-provider-filters-${selectedProvider.providerKey}-${providerFiltersResetKey}-${formResetKey}`}
            hideManagedWindowFields
            namePrefix="providerFilter"
            onValuesChange={handleProviderFormValuesChange}
            providerKey={selectedProvider.providerKey}
            scope="stream"
            values={providerFormValues}
          />
        </AdminDisclosureSection>
      ) : null}

      <AdminDisclosureSection
        completionLabel="Targeting ready"
        defaultOpen
        meta={[
          {
            label: `${categoryOptions.length} available categor${categoryOptions.length === 1 ? "y" : "ies"}`,
            tone: "muted",
          },
        ]}
        summary="Apply keyword filters and category targeting so fetched stories stay within the editorial lane this destination expects."
        title="Targeting rules"
      >
        <Field key={`stream-targeting-include-${formResetKey}`}>
          <FieldLabel>Include keywords</FieldLabel>
          <Textarea
            defaultValue={(stream?.includeKeywordsJson || []).join(", ")}
            name="includeKeywordsJson"
          />
          <FieldHint>Use comma-separated terms that must appear in the normalized source article before the stream accepts it.</FieldHint>
        </Field>
        <Field key={`stream-targeting-exclude-${formResetKey}`}>
          <FieldLabel>Exclude keywords</FieldLabel>
          <Textarea
            defaultValue={(stream?.excludeKeywordsJson || []).join(", ")}
            name="excludeKeywordsJson"
          />
          <FieldHint>Use comma-separated terms that should immediately disqualify a fetched story from this stream.</FieldHint>
        </Field>
        <CheckboxSearchField
          key={`stream-targeting-categories-${formResetKey}`}
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
      </AdminDisclosureSection>
      </AdminDisclosureGroup>

      <AdminModalFooterActions>
        {stream ? (
          <SecondaryButton
            disabled={issues.length > 0 || runInProgress}
            onClick={handleRunNowClick}
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
    </StreamForm>
  );
}
