"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import styled from "styled-components";

import {
  ActionIcon,
  ButtonIcon,
  ButtonRow,
  CheckboxChip,
  CheckboxRow,
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
import { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
import {
  destinationFormUtils,
  socialGuardrailFieldDefinitions,
} from "@/components/admin/destination-form-card.helpers";
import SearchableSelect from "@/components/common/searchable-select";
import {
  getAllowedDestinationKinds,
  getDestinationValidationIssues,
} from "@/lib/validation/configuration";
const {
  buildDestinationSettingsPayload,
  buildEffectiveCredentialState,
  buildFacebookPageOptions,
  buildInitialSocialGuardrails,
  buildInstagramAccountOptions,
  buildKindOptions,
  buildMetaCredentialDefaultsPreview,
  createDestinationSlug,
  decodeDiscoveryValue,
  formatAccountHandle,
  hasMetaCredentialDefaults,
  normalizeMetaCredentialDefaults,
  normalizeDisplayText,
  normalizeSettings,
  removeKnownMetaSettings,
  safeParseJsonObject,
  toPositiveInteger,
  trimText,
} = destinationFormUtils;

const DestinationForm = styled.form`
  display: grid;
  gap: 0.95rem;
`;

const SectionSurface = styled.div`
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  display: grid;
  gap: 0.7rem;
  padding: 0.9rem;
`;

const WideGrid = styled(FieldGrid)`
  @media (min-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const FieldHelp = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const ExampleBlock = styled.pre`
  background: rgba(245, 248, 252, 0.96);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-md, 1px);
  color: #1b2d49;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.73rem;
  line-height: 1.48;
  margin: 0;
  overflow-x: auto;
  padding: 0.7rem 0.78rem;
  white-space: pre-wrap;
`;

const StatusHint = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const StatusChip = styled.span`
  align-items: center;
  background: ${({ $tone }) =>
    $tone === "success"
      ? "rgba(27, 138, 73, 0.1)"
      : $tone === "danger"
        ? "rgba(176, 46, 34, 0.1)"
        : "rgba(168, 113, 12, 0.12)"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "success"
        ? "rgba(27, 138, 73, 0.16)"
        : $tone === "danger"
          ? "rgba(176, 46, 34, 0.18)"
          : "rgba(168, 113, 12, 0.2)"};
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $tone }) =>
    $tone === "success" ? "#197341" : $tone === "danger" ? "#a63725" : "#8f630c"};
  display: inline-flex;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: 24px;
  padding: 0 0.55rem;
  text-transform: uppercase;
`;

function getStatusTone(status) {
  if (status === "CONNECTED") {
    return "success";
  }

  if (status === "ERROR") {
    return "danger";
  }

  return "warning";
}

export default function DestinationFormCard({
  action,
  connectionStatusOptions = [],
  destination = null,
  kindOptions = [],
  metaConfig = {
    credentialDefaultsBySlug: {},
    defaultGraphApiBaseUrl: "https://graph.facebook.com/v25.0",
    hasDiscoveryAccessToken: false,
    socialGuardrails: {},
  },
  platformOptions = [],
  submitLabel,
}) {
  const initialSettings = useMemo(() => {
    const settingsJson = normalizeSettings(destination?.settingsJson);
    const initialSlug = `${destination?.slug || ""}`;
    const initialKind = `${destination?.kind || "WEBSITE"}`;
    const initialCredentialState = buildEffectiveCredentialState({
      destination,
      kind: initialKind,
      metaConfig,
      slug: initialSlug,
    });

    return {
      advancedSettingsJson: JSON.stringify(removeKnownMetaSettings(settingsJson), null, 2),
      credentialDefaults: initialCredentialState.credentialDefaults,
      externalAccountId: initialCredentialState.externalAccountId,
      graphApiBaseUrl: initialCredentialState.graphApiBaseUrl,
      hasCredentialDefaults: initialCredentialState.hasCredentialDefaults,
      instagramUserId: initialCredentialState.instagramUserId,
      pageId: initialCredentialState.pageId,
      profileId: initialCredentialState.profileId,
      socialGuardrails: buildInitialSocialGuardrails(settingsJson, metaConfig?.socialGuardrails || {}),
      useDestinationCredentialOverrides: initialCredentialState.useDestinationCredentialOverrides,
    };
  }, [destination, metaConfig]);
  const [name, setName] = useState(`${destination?.name || ""}`);
  const [slug, setSlug] = useState(`${destination?.slug || ""}`);
  const [platform, setPlatform] = useState(`${destination?.platform || "WEBSITE"}`);
  const [kind, setKind] = useState(`${destination?.kind || "WEBSITE"}`);
  const [connectionStatus, setConnectionStatus] = useState(`${destination?.connectionStatus || "DISCONNECTED"}`);
  const [accountHandle, setAccountHandle] = useState(`${destination?.accountHandle || ""}`);
  const [nameWasEdited, setNameWasEdited] = useState(Boolean(trimText(destination?.name)));
  const [slugWasEdited, setSlugWasEdited] = useState(Boolean(trimText(destination?.slug)));
  const [accountHandleWasEdited, setAccountHandleWasEdited] = useState(
    Boolean(trimText(destination?.accountHandle)),
  );
  const [useDestinationCredentialOverrides, setUseDestinationCredentialOverrides] = useState(
    initialSettings.useDestinationCredentialOverrides,
  );
  const [externalAccountId, setExternalAccountId] = useState(initialSettings.externalAccountId);
  const [graphApiBaseUrl, setGraphApiBaseUrl] = useState(initialSettings.graphApiBaseUrl);
  const [pageId, setPageId] = useState(initialSettings.pageId);
  const [profileId, setProfileId] = useState(initialSettings.profileId);
  const [instagramUserId, setInstagramUserId] = useState(initialSettings.instagramUserId);
  const [tokenValue, setTokenValue] = useState("");
  const [clearToken, setClearToken] = useState(false);
  const [advancedSettingsJson, setAdvancedSettingsJson] = useState(initialSettings.advancedSettingsJson);
  const [socialGuardrails, setSocialGuardrails] = useState(initialSettings.socialGuardrails);
  const [selectedFacebookPage, setSelectedFacebookPage] = useState("");
  const [selectedInstagramAccount, setSelectedInstagramAccount] = useState("");
  const [metaDiscovery, setMetaDiscovery] = useState({
    data: null,
    error: "",
    loaded: false,
    loading: false,
  });
  const formId = useId();
  const issues = getDestinationValidationIssues({ kind, platform });
  const allowedKinds = getAllowedDestinationKinds(platform).map((value) => formatEnumLabel(value));
  const resolvedKindOptions = buildKindOptions(kindOptions, platform);
  const parsedAdvancedSettings = useMemo(() => safeParseJsonObject(advancedSettingsJson), [advancedSettingsJson]);
  const metaDefaults = useMemo(
    () => ({
      ...metaConfig?.socialGuardrails,
      defaultGraphApiBaseUrl: metaConfig?.defaultGraphApiBaseUrl || "https://graph.facebook.com/v25.0",
    }),
    [metaConfig],
  );
  const credentialDefaults = useMemo(() => normalizeMetaCredentialDefaults(metaConfig, slug), [metaConfig, slug]);
  const hasCredentialDefaults = useMemo(() => hasMetaCredentialDefaults(credentialDefaults), [credentialDefaults]);
  const shouldPersistCredentialOverrides = useDestinationCredentialOverrides || !hasCredentialDefaults;
  const shouldPersistCredentialOverrideFlag = useDestinationCredentialOverrides && hasCredentialDefaults;
  const credentialInputsDisabled = hasCredentialDefaults && !useDestinationCredentialOverrides;
  const submittedExternalAccountId = shouldPersistCredentialOverrides ? trimText(externalAccountId) : "";
  const submittedGraphApiBaseUrl = shouldPersistCredentialOverrides ? graphApiBaseUrl : "";
  const submittedInstagramUserId = shouldPersistCredentialOverrides ? instagramUserId : "";
  const submittedPageId = shouldPersistCredentialOverrides ? pageId : "";
  const submittedProfileId = shouldPersistCredentialOverrides ? profileId : "";
  const credentialDefaultsPreview = useMemo(
    () => buildMetaCredentialDefaultsPreview(credentialDefaults),
    [credentialDefaults],
  );
  const isMetaPlatform = platform === "FACEBOOK" || platform === "INSTAGRAM";
  const shouldShowFacebookDiscovery = kind === "FACEBOOK_PAGE";
  const shouldShowInstagramDiscovery = kind === "INSTAGRAM_BUSINESS";
  const settingsJsonValue = useMemo(
    () =>
      JSON.stringify(
        buildDestinationSettingsPayload({
          advancedSettings: parsedAdvancedSettings.value,
          defaults: metaDefaults,
          graphApiBaseUrl: submittedGraphApiBaseUrl,
          instagramUserId: submittedInstagramUserId,
          kind,
          pageId: submittedPageId,
          profileId: submittedProfileId,
          socialGuardrails,
          useDestinationCredentialOverrides: shouldPersistCredentialOverrideFlag,
        }),
      ),
    [
      kind,
      metaDefaults,
      parsedAdvancedSettings.value,
      shouldPersistCredentialOverrideFlag,
      socialGuardrails,
      submittedGraphApiBaseUrl,
      submittedInstagramUserId,
      submittedPageId,
      submittedProfileId,
    ],
  );
  const socialGuardrailErrors = useMemo(
    () =>
      socialGuardrailFieldDefinitions
        .filter((field) => !toPositiveInteger(socialGuardrails[field.key]))
        .map((field) => `${field.label} must be greater than 0.`),
    [socialGuardrails],
  );
  const facebookPageOptions = useMemo(() => buildFacebookPageOptions(metaDiscovery.data), [metaDiscovery.data]);
  const instagramAccountOptions = useMemo(() => buildInstagramAccountOptions(metaDiscovery.data), [metaDiscovery.data]);
  const activeFacebookSelection = useMemo(() => decodeDiscoveryValue(selectedFacebookPage), [selectedFacebookPage]);
  const activeInstagramSelection = useMemo(() => decodeDiscoveryValue(selectedInstagramAccount), [selectedInstagramAccount]);
  const activeDiscoverySelection = useMemo(() => {
    if (kind === "FACEBOOK_PAGE") {
      return {
        sourceKey: activeFacebookSelection.sourceKey,
        targetId: activeFacebookSelection.targetId,
        targetType: activeFacebookSelection.targetId ? "FACEBOOK_PAGE" : "",
      };
    }

    if (kind === "INSTAGRAM_BUSINESS") {
      return {
        sourceKey: activeInstagramSelection.sourceKey,
        targetId: activeInstagramSelection.targetId,
        targetType: activeInstagramSelection.targetId ? "INSTAGRAM_ACCOUNT" : "",
      };
    }

    return {
      sourceKey: "",
      targetId: "",
      targetType: "",
    };
  }, [activeFacebookSelection.sourceKey, activeFacebookSelection.targetId, activeInstagramSelection.sourceKey, activeInstagramSelection.targetId, kind]);
  const hasFormErrors = issues.length > 0 || Boolean(parsedAdvancedSettings.error) || socialGuardrailErrors.length > 0;

  function activateCredentialOverrides() {
    if (hasCredentialDefaults && !useDestinationCredentialOverrides) {
      setUseDestinationCredentialOverrides(true);
    }

    if (clearToken) {
      setClearToken(false);
    }
  }

  function resetCredentialOverridesToDefaults() {
    if (!hasCredentialDefaults) {
      return;
    }

    setUseDestinationCredentialOverrides(false);
    setTokenValue("");
    setClearToken(true);
    setSelectedFacebookPage("");
    setSelectedInstagramAccount("");
  }

  const applyIdentitySuggestion = useCallback(
    ({ handle = "", label = "" } = {}) => {
      const normalizedLabel = normalizeDisplayText(label);
      const normalizedHandle = trimText(handle);
      let nextSlugSource = "";

      if ((!nameWasEdited || !trimText(name)) && normalizedLabel) {
        setName(normalizedLabel);
        nextSlugSource = normalizedLabel;
      }

      if ((!slugWasEdited || !trimText(slug)) && nextSlugSource) {
        setSlug(createDestinationSlug(nextSlugSource));
      }

      if ((!accountHandleWasEdited || !trimText(accountHandle)) && normalizedHandle) {
        setAccountHandle(normalizedHandle);
      }
    },
    [accountHandle, accountHandleWasEdited, name, nameWasEdited, slug, slugWasEdited],
  );

  useEffect(() => {
    if (!destination) {
      return;
    }

    if (hasCredentialDefaults) {
      return;
    }

    setUseDestinationCredentialOverrides(true);
  }, [destination, hasCredentialDefaults]);

  useEffect(() => {
    if (destination || !hasCredentialDefaults) {
      return;
    }

    const hasManualCredentialState = Boolean(
      trimText(externalAccountId)
        || trimText(instagramUserId)
        || trimText(pageId)
        || trimText(profileId)
        || trimText(selectedFacebookPage)
        || trimText(selectedInstagramAccount)
        || trimText(tokenValue),
    );

    if (!hasManualCredentialState) {
      setUseDestinationCredentialOverrides(false);
    }
  }, [
    destination,
    externalAccountId,
    hasCredentialDefaults,
    instagramUserId,
    pageId,
    profileId,
    selectedFacebookPage,
    selectedInstagramAccount,
    tokenValue,
  ]);

  useEffect(() => {
    if (!hasCredentialDefaults || useDestinationCredentialOverrides) {
      return;
    }

    setExternalAccountId(getPrimaryAccountIdForKind(kind, credentialDefaults));
    setGraphApiBaseUrl(credentialDefaults?.graphApiBaseUrl || metaConfig?.defaultGraphApiBaseUrl || "");
    setInstagramUserId(credentialDefaults?.instagramUserId || "");
    setPageId(credentialDefaults?.pageId || "");
    setProfileId(credentialDefaults?.profileId || "");
  }, [
    credentialDefaults,
    hasCredentialDefaults,
    kind,
    metaConfig?.defaultGraphApiBaseUrl,
    useDestinationCredentialOverrides,
  ]);

  async function refreshMetaDiscovery() {
    setMetaDiscovery((currentState) => ({
      ...currentState,
      error: "",
      loading: true,
    }));

    try {
      const response = await fetch("/api/destinations/meta-discovery", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(
          trimText(payload?.message)
          || `Connected Meta assets could not be loaded (${response.status}).`,
        );
      }

      setMetaDiscovery({
        data: payload.data || null,
        error: "",
        loaded: true,
        loading: false,
      });
    } catch (error) {
      setMetaDiscovery({
        data: null,
        error:
          trimText(error?.message)
          || "Connected Meta assets could not be loaded right now.",
        loaded: true,
        loading: false,
      });
    }
  }

  useEffect(() => {
    if (!isMetaPlatform || metaDiscovery.loaded || metaDiscovery.loading) {
      return;
    }

    void refreshMetaDiscovery();
  }, [isMetaPlatform, metaDiscovery.loaded, metaDiscovery.loading]);

  useEffect(() => {
    if (!shouldShowFacebookDiscovery || selectedFacebookPage || !facebookPageOptions.length) {
      return;
    }

    const matchedOption = facebookPageOptions.find((option) => option.pageId === trimText(pageId));
    const fallbackOption = !trimText(pageId) && facebookPageOptions.length === 1 ? facebookPageOptions[0] : null;
    const nextOption = matchedOption || fallbackOption;

    if (!nextOption) {
      return;
    }

    setSelectedFacebookPage(nextOption.value);

    if (!trimText(pageId)) {
      setPageId(nextOption.pageId);
      setExternalAccountId(nextOption.pageId);
    }

    applyIdentitySuggestion({
      handle: formatAccountHandle(nextOption.username, nextOption.label),
      label: nextOption.label,
    });
  }, [applyIdentitySuggestion, facebookPageOptions, pageId, selectedFacebookPage, shouldShowFacebookDiscovery]);

  useEffect(() => {
    if (!shouldShowInstagramDiscovery || selectedInstagramAccount || !instagramAccountOptions.length) {
      return;
    }

    const matchedOption = instagramAccountOptions.find((option) => decodeDiscoveryValue(option.value).targetId === trimText(instagramUserId));
    const fallbackOption =
      !trimText(instagramUserId) && instagramAccountOptions.length === 1 ? instagramAccountOptions[0] : null;
    const nextOption = matchedOption || fallbackOption;

    if (!nextOption) {
      return;
    }

    const selection = decodeDiscoveryValue(nextOption.value);

    setSelectedInstagramAccount(nextOption.value);

    if (!trimText(instagramUserId)) {
      setInstagramUserId(selection.targetId);
      setExternalAccountId(selection.targetId);
      setPageId(nextOption.connectedPageId || "");
    }
    applyIdentitySuggestion({
      handle: formatAccountHandle(nextOption.username, nextOption.label),
      label: nextOption.label,
    });
  }, [applyIdentitySuggestion, instagramAccountOptions, instagramUserId, selectedInstagramAccount, shouldShowInstagramDiscovery]);

  function handleSubmit(event) {
    if (!hasFormErrors) {
      return;
    }

    event.preventDefault();
  }

  return (
    <DestinationForm action={action} id={formId} onSubmit={handleSubmit}>
      <input name="externalAccountId" type="hidden" value={submittedExternalAccountId} />
      <input name="graphApiBaseUrl" type="hidden" value={submittedGraphApiBaseUrl} />
      <input name="instagramUserId" type="hidden" value={submittedInstagramUserId} />
      <input
        name="metaDiscoverySourceKey"
        type="hidden"
        value={shouldPersistCredentialOverrides ? activeDiscoverySelection.sourceKey : ""}
      />
      <input
        name="metaDiscoveryTargetId"
        type="hidden"
        value={shouldPersistCredentialOverrides ? activeDiscoverySelection.targetId : ""}
      />
      <input
        name="metaDiscoveryTargetType"
        type="hidden"
        value={shouldPersistCredentialOverrides ? activeDiscoverySelection.targetType : ""}
      />
      <input name="pageId" type="hidden" value={submittedPageId} />
      <input name="profileId" type="hidden" value={submittedProfileId} />
      <input name="settingsJson" type="hidden" value={settingsJsonValue} />
      {socialGuardrailFieldDefinitions.map((field) => (
        <input key={field.key} name={`socialGuardrail.${field.key}`} type="hidden" value={socialGuardrails[field.key] || ""} />
      ))}

      <SectionSurface>
        <FormSectionTitle>Routing and status</FormSectionTitle>
        <WideGrid>
          <Field as="div">
            <FieldLabel>Platform</FieldLabel>
            <SearchableSelect
              ariaLabel="Platform"
              invalid={issues.length > 0}
              name="platform"
              onChange={(value) => setPlatform(`${value || ""}`)}
              options={platformOptions}
              placeholder="Select a platform"
              value={platform}
            />
          </Field>
          <Field as="div">
            <FieldLabel>Kind</FieldLabel>
            <SearchableSelect
              ariaLabel="Destination kind"
              invalid={issues.length > 0}
              name="kind"
              onChange={(value) => setKind(`${value || ""}`)}
              options={resolvedKindOptions}
              placeholder="Select a destination kind"
              value={kind}
            />
            <SmallText>
              Compatible kinds for {formatEnumLabel(platform)}: {allowedKinds.join(", ") || "Choose a platform first."}
            </SmallText>
          </Field>
          <Field as="div">
            <FieldLabel>Connection status</FieldLabel>
            <SearchableSelect
              ariaLabel="Connection status"
              name="connectionStatus"
              onChange={(value) => setConnectionStatus(`${value || ""}`)}
              options={connectionStatusOptions}
              placeholder="Select a connection status"
              value={connectionStatus}
            />
            <StatusHint>
              <StatusChip $tone={getStatusTone(connectionStatus)}>{formatEnumLabel(connectionStatus)}</StatusChip>
            </StatusHint>
          </Field>
        </WideGrid>
      </SectionSurface>

      <SectionSurface>
        <FormSectionTitle>Identity</FormSectionTitle>
        <WideGrid>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              name="name"
              onChange={(event) => {
                const nextValue = event.target.value;

                setName(nextValue);
                setNameWasEdited(true);

                if (!slugWasEdited) {
                  setSlug(createDestinationSlug(nextValue));
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
                setSlug(event.target.value);
                setSlugWasEdited(true);
              }}
              required
              value={slug}
            />
          </Field>
          <Field>
            <FieldLabel>Account handle</FieldLabel>
            <Input
              name="accountHandle"
              onChange={(event) => {
                setAccountHandle(event.target.value);
                setAccountHandleWasEdited(true);
              }}
              value={accountHandle}
            />
          </Field>
        </WideGrid>
      </SectionSurface>

      {issues.length ? (
        <NoticeBanner $tone="danger">
          <NoticeTitle>Incompatible destination configuration</NoticeTitle>
          <NoticeList>
            {issues.map((issue) => (
              <NoticeItem key={issue.code}>{issue.message}</NoticeItem>
            ))}
          </NoticeList>
        </NoticeBanner>
      ) : null}

      <SectionSurface>
        <FormSectionTitle>Connection details</FormSectionTitle>
        <SmallText>
          Connect supported Meta pages or accounts here. NewsPub stores the selected page or account identity and resolves a fresh publish credential at runtime when possible.
        </SmallText>
        {isMetaPlatform ? (
          <>
            <ButtonRow>
              <SecondaryButton onClick={() => void refreshMetaDiscovery()} type="button">
                <ButtonIcon>
                  <ActionIcon name="refresh" />
                </ButtonIcon>
                Refresh connected assets
              </SecondaryButton>
              {hasCredentialDefaults ? (
                <SecondaryButton onClick={resetCredentialOverridesToDefaults} type="button">
                  Reset to env defaults
                </SecondaryButton>
              ) : null}
            </ButtonRow>
            <SmallText>
              {metaDiscovery.loading
                ? "Loading connected Meta pages and accounts..."
                : metaDiscovery.data
                  ? `${metaDiscovery.data.pages.length} publish-ready Facebook page${metaDiscovery.data.pages.length === 1 ? "" : "s"} and ${metaDiscovery.data.instagramAccounts.length} Instagram account${metaDiscovery.data.instagramAccounts.length === 1 ? "" : "s"} discovered.`
                  : metaConfig?.hasDiscoveryAccessToken
                    ? "A refreshable Meta discovery source is configured. Refresh connected assets to prefill supported destinations automatically."
                    : "Set META_SYSTEM_USER_ACCESS_TOKEN and/or META_USER_ACCESS_TOKEN to support automatic Meta credential resolution."}
            </SmallText>
            {metaDiscovery.error ? (
              <NoticeBanner $tone="danger">
                <NoticeTitle>Meta discovery failed</NoticeTitle>
                <SmallText>{metaDiscovery.error}</SmallText>
              </NoticeBanner>
            ) : null}
            {metaDiscovery.data?.errors?.length ? (
              <NoticeBanner $tone="warning">
                <NoticeTitle>Meta discovery notices</NoticeTitle>
                <NoticeList>
                  {metaDiscovery.data.errors.map((error) => (
                    <NoticeItem key={`${error.sourceKey || "global"}-${error.message}`}>
                      {error.sourceLabel ? `${error.sourceLabel}: ` : ""}
                      {error.message}
                    </NoticeItem>
                  ))}
                </NoticeList>
              </NoticeBanner>
            ) : null}
            {hasCredentialDefaults ? (
              <NoticeBanner $tone="warning">
                <NoticeTitle>
                  {useDestinationCredentialOverrides
                    ? "Destination-specific Meta credential overrides are active"
                    : "Environment defaults are active for this destination"}
                </NoticeTitle>
                <FieldHelp>
                  <SmallText>
                    {useDestinationCredentialOverrides
                      ? `This destination is overriding the environment-backed Meta defaults for slug "${slug || destination?.slug || "new-destination"}".`
                      : `This destination is currently using environment-backed Meta defaults for slug "${slug || destination?.slug || "new-destination"}".`}
                  </SmallText>
                  <SmallText>
                    {credentialDefaults?.sourceLabel
                      ? `Credential source: ${credentialDefaults.sourceLabel}.`
                      : "The environment-backed credential defaults are resolved server-side."}
                  </SmallText>
                  {metaConfig?.facebookPublishStrategyLabel ? (
                    <SmallText>Facebook publish strategy: {metaConfig.facebookPublishStrategyLabel}</SmallText>
                  ) : null}
                  <ExampleBlock>{credentialDefaultsPreview}</ExampleBlock>
                </FieldHelp>
              </NoticeBanner>
            ) : null}
            {hasCredentialDefaults ? (
              <CheckboxRow>
                <CheckboxChip>
                  <input
                    checked={useDestinationCredentialOverrides}
                    onChange={(event) => {
                      setUseDestinationCredentialOverrides(event.target.checked);

                      if (event.target.checked) {
                        setClearToken(false);
                      } else {
                        setTokenValue("");
                        setClearToken(true);
                        setSelectedFacebookPage("");
                        setSelectedInstagramAccount("");
                      }
                    }}
                    type="checkbox"
                  />{" "}
                  Override environment-backed Meta defaults for this destination
                </CheckboxChip>
              </CheckboxRow>
            ) : (
              <SmallText>
                No environment-backed Meta defaults match this destination slug, so values entered below are stored directly with the destination.
              </SmallText>
            )}
          </>
        ) : null}
        {shouldShowFacebookDiscovery ? (
          <Field as="div">
            <FieldLabel>Connected Facebook page</FieldLabel>
            <SearchableSelect
              ariaLabel="Connected Facebook page"
              emptyMessage="No publish-ready Facebook pages were discovered from the configured Meta access token."
              loading={metaDiscovery.loading}
              loadingMessage="Loading connected Facebook pages..."
              onChange={(value) => {
                const selectedOption = facebookPageOptions.find((option) => option.value === value) || null;

                activateCredentialOverrides();
                setSelectedFacebookPage(value);

                if (!selectedOption) {
                  return;
                }

                setPageId(selectedOption.pageId);
                setExternalAccountId(selectedOption.pageId);
                applyIdentitySuggestion({
                  handle: formatAccountHandle(selectedOption.username, selectedOption.label),
                  label: selectedOption.label,
                });
              }}
              options={facebookPageOptions}
              placeholder="Select a connected Facebook page"
              value={selectedFacebookPage}
            />
          </Field>
        ) : null}
        {shouldShowInstagramDiscovery ? (
          <Field as="div">
            <FieldLabel>Connected Instagram account</FieldLabel>
            <SearchableSelect
              ariaLabel="Connected Instagram account"
              emptyMessage="No Instagram business or creator accounts were discovered from the configured Meta credential sources."
              loading={metaDiscovery.loading}
              loadingMessage="Loading connected Instagram accounts..."
              onChange={(value) => {
                const selectedOption = instagramAccountOptions.find((option) => option.value === value) || null;
                const selection = decodeDiscoveryValue(value);

                activateCredentialOverrides();
                setSelectedInstagramAccount(value);

                if (!selectedOption) {
                  return;
                }

                setInstagramUserId(selection.targetId);
                setExternalAccountId(selection.targetId);
                setPageId(selectedOption.connectedPageId || "");
                applyIdentitySuggestion({
                  handle: formatAccountHandle(selectedOption.username, selectedOption.label),
                  label: selectedOption.label,
                });
              }}
              options={instagramAccountOptions}
              placeholder="Select a connected Instagram account"
              value={selectedInstagramAccount}
            />
          </Field>
        ) : null}
        <WideGrid>
          <Field>
            <FieldLabel>External account ID</FieldLabel>
            <Input
              disabled={credentialInputsDisabled}
              onChange={(event) => {
                const nextValue = event.target.value;

                activateCredentialOverrides();
                setExternalAccountId(nextValue);

                if (kind === "FACEBOOK_PAGE") {
                  setPageId(nextValue);

                  if (trimText(nextValue) !== activeFacebookSelection.targetId) {
                    setSelectedFacebookPage("");
                  }
                }

                if (kind === "FACEBOOK_PROFILE") {
                  setProfileId(nextValue);
                }

                if (kind === "INSTAGRAM_BUSINESS") {
                  setInstagramUserId(nextValue);

                  if (trimText(nextValue) !== activeInstagramSelection.targetId) {
                    setSelectedInstagramAccount("");
                    setPageId("");
                  }
                }

                if (kind === "INSTAGRAM_PERSONAL") {
                  setInstagramUserId(nextValue);
                }
              }}
              value={externalAccountId}
            />
            <SmallText>
              {hasCredentialDefaults && !useDestinationCredentialOverrides
                ? "Currently inherited from environment-backed Meta defaults."
                : "The primary publish target ID used by the runtime publisher."}
            </SmallText>
          </Field>
          {kind === "FACEBOOK_PAGE" || kind === "INSTAGRAM_BUSINESS" ? (
            <Field>
              <FieldLabel>Facebook page ID</FieldLabel>
              <Input
                disabled={credentialInputsDisabled}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  activateCredentialOverrides();
                  setPageId(nextValue);

                  if (kind === "FACEBOOK_PAGE") {
                    setExternalAccountId(nextValue);
                  }

                  if (trimText(nextValue) !== activeFacebookSelection.targetId) {
                    setSelectedFacebookPage("");
                  }
                }}
                value={pageId}
              />
              <SmallText>
                {kind === "INSTAGRAM_BUSINESS"
                  ? "Optional linked Facebook page ID for the connected Instagram business account."
                  : "The Facebook page ID published to by this destination."}
              </SmallText>
            </Field>
          ) : null}
          {kind === "FACEBOOK_PROFILE" ? (
            <Field>
              <FieldLabel>Facebook profile ID</FieldLabel>
              <Input
                disabled={credentialInputsDisabled}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  activateCredentialOverrides();
                  setProfileId(nextValue);
                  setExternalAccountId(nextValue);
                }}
                value={profileId}
              />
            </Field>
          ) : null}
          {["INSTAGRAM_BUSINESS", "INSTAGRAM_PERSONAL"].includes(kind) ? (
            <Field>
              <FieldLabel>Instagram user ID</FieldLabel>
              <Input
                disabled={credentialInputsDisabled}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  activateCredentialOverrides();
                  setInstagramUserId(nextValue);
                  setExternalAccountId(nextValue);

                  if (trimText(nextValue) !== activeInstagramSelection.targetId) {
                    setSelectedInstagramAccount("");
                  }
                }}
                value={instagramUserId}
              />
            </Field>
          ) : null}
          <Field>
            <FieldLabel>Graph API base URL</FieldLabel>
            <Input
              disabled={credentialInputsDisabled}
              onChange={(event) => {
                activateCredentialOverrides();
                setGraphApiBaseUrl(event.target.value);
              }}
              placeholder={metaConfig?.defaultGraphApiBaseUrl || "https://graph.facebook.com/v25.0"}
              value={graphApiBaseUrl}
            />
            <SmallText>
              Defaults to {metaConfig?.defaultGraphApiBaseUrl || "https://graph.facebook.com/v25.0"} when no override is stored.
            </SmallText>
          </Field>
          <Field>
            <FieldLabel>Update token</FieldLabel>
            <Input
              disabled={credentialInputsDisabled}
              name="token"
              onChange={(event) => {
                activateCredentialOverrides();
                setTokenValue(event.target.value);
              }}
              placeholder={
                credentialInputsDisabled && credentialDefaults?.hasAccessToken
                  ? "Using access token from environment-backed Meta defaults"
                  : destination?.tokenHint
                    ? `Stored token ending ${destination.tokenHint}`
                    : "Paste a manual override token"
              }
              value={tokenValue}
            />
            <SmallText>
              Environment credentials stay server-side. Paste a token here only for a manual destination-specific override or legacy fallback.
            </SmallText>
          </Field>
        </WideGrid>
        <CheckboxRow>
          <CheckboxChip>
            <input
              checked={clearToken}
              name="clearToken"
              onChange={(event) => {
                setClearToken(event.target.checked);

                if (event.target.checked) {
                  setTokenValue("");
                }
              }}
              type="checkbox"
            />{" "}
            Clear stored destination token
          </CheckboxChip>
        </CheckboxRow>
      </SectionSurface>

      {isMetaPlatform ? (
        <SectionSurface>
          <FormSectionTitle>Publishing guardrails</FormSectionTitle>
          <ButtonRow>
            <SecondaryButton
              onClick={() => setSocialGuardrails(buildInitialSocialGuardrails({}, metaConfig?.socialGuardrails || {}))}
              type="button"
            >
              Reset to defaults
            </SecondaryButton>
          </ButtonRow>
          <WideGrid>
            {socialGuardrailFieldDefinitions.map((field) => (
              <Field key={field.key}>
                <FieldLabel>{field.label}</FieldLabel>
                <Input
                  min="1"
                  onChange={(event) =>
                    setSocialGuardrails((currentValues) => ({
                      ...currentValues,
                      [field.key]: event.target.value,
                    }))
                  }
                  type="number"
                  value={socialGuardrails[field.key] || ""}
                />
                <SmallText>
                  Default: {metaConfig?.socialGuardrails?.[field.key]} {field.suffix}. Backed by {field.envField}.
                </SmallText>
              </Field>
            ))}
          </WideGrid>
          {socialGuardrailErrors.length ? (
            <NoticeBanner $tone="danger">
              <NoticeTitle>Guardrail values need attention</NoticeTitle>
              <NoticeList>
                {socialGuardrailErrors.map((error) => (
                  <NoticeItem key={error}>{error}</NoticeItem>
                ))}
              </NoticeList>
            </NoticeBanner>
          ) : null}
        </SectionSurface>
      ) : null}

      <SectionSurface>
        <FormSectionTitle>Operational notes</FormSectionTitle>
        <Field>
          <FieldLabel>Connection error</FieldLabel>
          <Textarea
            defaultValue={destination?.connectionError || ""}
            name="connectionError"
            placeholder="Graph API returned 190: Invalid OAuth 2.0 Access Token on 2026-04-06. Reconnect with a fresh token."
          />
          <FieldHelp>
            <SmallText>Leave blank when the destination is healthy or the issue has been resolved.</SmallText>
          </FieldHelp>
        </Field>
      </SectionSurface>

      <SectionSurface>
        <FormSectionTitle>Advanced settings</FormSectionTitle>
        <Field>
          <FieldLabel>Additional settings JSON</FieldLabel>
          <Textarea onChange={(event) => setAdvancedSettingsJson(event.target.value)} placeholder="{}" value={advancedSettingsJson} />
          <FieldHelp>
            <SmallText>
              Only add extra platform-specific keys here. Graph API base URL, discovered IDs, and guardrail overrides are managed above.
            </SmallText>
            {parsedAdvancedSettings.error ? (
              <NoticeBanner $tone="danger">
                <NoticeTitle>Advanced settings are invalid</NoticeTitle>
                <SmallText>{parsedAdvancedSettings.error}</SmallText>
              </NoticeBanner>
            ) : null}
            <SmallText>Saved settings preview</SmallText>
            <ExampleBlock>{JSON.stringify(JSON.parse(settingsJsonValue || "{}"), null, 2)}</ExampleBlock>
          </FieldHelp>
        </Field>
      </SectionSurface>

      <FormSection>
        {destination ? (
          <SmallText>
            Streams linked: {(destination.streams || []).map((stream) => stream.name).join(", ") || "None"}
          </SmallText>
        ) : (
          <SmallText>
            New destinations can be configured here with connected Meta assets, runtime credential resolution, and per-destination publishing guardrails.
          </SmallText>
        )}
      </FormSection>

      <AdminModalFooterActions>
        <PrimaryButton disabled={hasFormErrors} form={formId} type="submit">
          <ButtonIcon>
            <ActionIcon name={destination ? "save" : "plus"} />
          </ButtonIcon>
          {submitLabel}
        </PrimaryButton>
      </AdminModalFooterActions>
    </DestinationForm>
  );
}
