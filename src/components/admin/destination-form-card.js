"use client";

import { useState } from "react";
import styled from "styled-components";

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
  NoticeBanner,
  NoticeItem,
  NoticeList,
  NoticeTitle,
  PrimaryButton,
  SmallText,
  Textarea,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import SearchableSelect from "@/components/common/searchable-select";
import {
  getAllowedDestinationKinds,
  getDestinationPlatformForKind,
  getDestinationValidationIssues,
} from "@/lib/validation/configuration";

function buildKindOptions(kindOptions, platform) {
  return kindOptions.map((option) => {
    const compatiblePlatform = getDestinationPlatformForKind(option.value);
    const compatible = !platform || !compatiblePlatform || compatiblePlatform === platform;

    return {
      ...option,
      description: compatible
        ? option.description
        : `${option.description} Compatible with ${formatEnumLabel(compatiblePlatform)} destinations only.`,
      disabled: !compatible,
    };
  });
}

const DestinationFieldGrid = styled(FieldGrid)`
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
`;

const DestinationForm = styled.form`
  display: grid;
  gap: 0.95rem;
`;

const SetupBanner = styled.div`
  background:
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.12), transparent 52%),
    linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(255, 255, 255, 0.96));
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 16px;
  display: grid;
  gap: 0.72rem;
  padding: 0.9rem;
`;

const SetupHeader = styled.div`
  display: grid;
  gap: 0.16rem;
`;

const SetupEyebrow = styled.span`
  color: #0f5f79;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const SetupTitle = styled.strong`
  color: #162744;
  font-size: 0.94rem;
  letter-spacing: -0.02em;
`;

const SetupGrid = styled.div`
  display: grid;
  gap: 0.5rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const SetupCard = styled.div`
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: 12px;
  display: grid;
  gap: 0.18rem;
  padding: 0.72rem;
`;

const SetupStep = styled.span`
  color: rgba(73, 87, 112, 0.82);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const SetupCardTitle = styled.strong`
  color: #182742;
  font-size: 0.81rem;
`;

const SetupCardText = styled.p`
  color: rgba(72, 85, 108, 0.9);
  font-size: 0.75rem;
  line-height: 1.42;
  margin: 0;
`;

const IdentityGrid = styled(DestinationFieldGrid)`
  @media (min-width: 1180px) {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.05fr) minmax(320px, 1fr);
  }
`;

const RoutingGrid = styled(DestinationFieldGrid)`
  @media (min-width: 1180px) {
    grid-template-columns: minmax(300px, 1.15fr) minmax(260px, 1fr) minmax(0, 1fr);
  }
`;

const SectionSurface = styled.div`
  background:
    linear-gradient(180deg, rgba(249, 252, 255, 0.98), rgba(255, 255, 255, 0.96)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.05), transparent 54%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 16px;
  display: grid;
  gap: 0.75rem;
  padding: 0.9rem;
`;

const FooterSurface = styled.div`
  display: grid;
  gap: 0.65rem;
`;

const FooterActions = styled(ButtonRow)`
  justify-content: flex-end;
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
  border-radius: 999px;
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
  platformOptions = [],
  submitLabel,
}) {
  const [platform, setPlatform] = useState(`${destination?.platform || "WEBSITE"}`);
  const [kind, setKind] = useState(`${destination?.kind || "WEBSITE"}`);
  const [connectionStatus, setConnectionStatus] = useState(`${destination?.connectionStatus || "DISCONNECTED"}`);
  const issues = getDestinationValidationIssues({ kind, platform });
  const allowedKinds = getAllowedDestinationKinds(platform).map((value) => formatEnumLabel(value));
  const resolvedKindOptions = buildKindOptions(kindOptions, platform);

  function handleSubmit(event) {
    if (!issues.length) {
      return;
    }

    event.preventDefault();
  }

  return (
    <DestinationForm action={action} onSubmit={handleSubmit}>
      <SetupBanner>
        <SetupHeader>
          <SetupEyebrow>{destination ? "Destination profile" : "New destination"}</SetupEyebrow>
          <SetupTitle>
            {destination
              ? "Keep identity, routing, and connection state aligned in one place."
              : "Create the endpoint first, then layer credentials and operational metadata."}
          </SetupTitle>
        </SetupHeader>
        <SetupGrid>
          <SetupCard>
            <SetupStep>Step 01</SetupStep>
            <SetupCardTitle>Identity</SetupCardTitle>
            <SetupCardText>Name and slug should stay short, readable, and stable for editors.</SetupCardText>
          </SetupCard>
          <SetupCard>
            <SetupStep>Step 02</SetupStep>
            <SetupCardTitle>Routing</SetupCardTitle>
            <SetupCardText>Platform and kind must agree so streams can resolve the correct publishing path.</SetupCardText>
          </SetupCard>
          <SetupCard>
            <SetupStep>Step 03</SetupStep>
            <SetupCardTitle>Connection</SetupCardTitle>
            <SetupCardText>Status, token updates, and notes help operators understand what is ready to publish.</SetupCardText>
          </SetupCard>
        </SetupGrid>
      </SetupBanner>

      <SectionSurface>
        <FormSectionTitle>Identity</FormSectionTitle>
        <IdentityGrid>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input defaultValue={destination?.name || ""} name="name" required />
          </Field>
          <Field>
            <FieldLabel>Slug</FieldLabel>
            <Input defaultValue={destination?.slug || ""} name="slug" required />
          </Field>
          <Field>
            <FieldLabel>Account handle</FieldLabel>
            <Input defaultValue={destination?.accountHandle || ""} name="accountHandle" />
          </Field>
        </IdentityGrid>
      </SectionSurface>

      <SectionSurface>
        <FormSectionTitle>Routing and status</FormSectionTitle>
        <RoutingGrid>
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
        </RoutingGrid>
      </SectionSurface>

      {issues.length ? (
        <FormSection>
          <NoticeBanner $tone="danger">
            <NoticeTitle>Incompatible destination configuration</NoticeTitle>
            <NoticeList>
              {issues.map((issue) => (
                <NoticeItem key={issue.code}>{issue.message}</NoticeItem>
              ))}
            </NoticeList>
          </NoticeBanner>
        </FormSection>
      ) : null}

      <SectionSurface>
        <FormSectionTitle>Connection details</FormSectionTitle>
        <SmallText>
          Store external identifiers and rotate tokens here without disturbing the destination identity above.
        </SmallText>
        <DestinationFieldGrid>
          <Field>
            <FieldLabel>External account ID</FieldLabel>
            <Input defaultValue={destination?.externalAccountId || ""} name="externalAccountId" />
          </Field>
          <Field>
            <FieldLabel>Update token</FieldLabel>
            <Input
              name="token"
              placeholder={
                destination?.tokenHint ? `Stored token ending ${destination.tokenHint}` : "Paste a new token"
              }
            />
          </Field>
        </DestinationFieldGrid>
        <CheckboxRow>
          <CheckboxChip>
            <input name="clearToken" type="checkbox" /> Clear stored token
          </CheckboxChip>
        </CheckboxRow>
      </SectionSurface>

      <SectionSurface>
        <FormSectionTitle>Operational notes</FormSectionTitle>
        <Field>
          <FieldLabel>Connection error</FieldLabel>
          <Textarea defaultValue={destination?.connectionError || ""} name="connectionError" />
        </Field>
        <Field>
          <FieldLabel>Settings JSON</FieldLabel>
          <Textarea
            defaultValue={JSON.stringify(destination?.settingsJson || {}, null, 2)}
            name="settingsJson"
          />
        </Field>
      </SectionSurface>

      <FooterSurface>
        <FooterActions>
          <PrimaryButton disabled={issues.length > 0} type="submit">
            {submitLabel}
          </PrimaryButton>
        </FooterActions>
        {destination ? (
          <SmallText>
            Streams linked: {(destination.streams || []).map((stream) => stream.name).join(", ") || "None"}
          </SmallText>
        ) : (
          <SmallText>
            New destinations can be fully configured here, including token storage and operational metadata.
          </SmallText>
        )}
      </FooterSurface>
    </DestinationForm>
  );
}
