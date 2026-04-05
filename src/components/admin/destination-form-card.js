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
    <form action={action} onSubmit={handleSubmit}>
      <DestinationFieldGrid>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input defaultValue={destination?.name || ""} name="name" required />
        </Field>
        <Field>
          <FieldLabel>Slug</FieldLabel>
          <Input defaultValue={destination?.slug || ""} name="slug" required />
        </Field>
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
        {destination ? (
          <>
            <Field as="div">
              <FieldLabel>Connection status</FieldLabel>
              <SearchableSelect
                ariaLabel="Connection status"
                defaultValue={destination.connectionStatus}
                name="connectionStatus"
                options={connectionStatusOptions}
                placeholder="Select a connection status"
              />
            </Field>
            <Field>
              <FieldLabel>Account handle</FieldLabel>
              <Input defaultValue={destination.accountHandle || ""} name="accountHandle" />
            </Field>
          </>
        ) : null}
      </DestinationFieldGrid>

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

      {destination ? (
        <>
          <FormSection>
            <FormSectionTitle>Connection details</FormSectionTitle>
            <DestinationFieldGrid>
              <Field>
                <FieldLabel>External account ID</FieldLabel>
                <Input defaultValue={destination.externalAccountId || ""} name="externalAccountId" />
              </Field>
              <Field>
                <FieldLabel>Update token</FieldLabel>
                <Input
                  name="token"
                  placeholder={
                    destination.tokenHint
                      ? `Stored token ending ${destination.tokenHint}`
                      : "Paste a new token"
                  }
                />
              </Field>
            </DestinationFieldGrid>
            <CheckboxRow>
              <CheckboxChip>
                <input name="clearToken" type="checkbox" /> Clear stored token
              </CheckboxChip>
            </CheckboxRow>
          </FormSection>

          <FormSection>
            <FormSectionTitle>Operational notes</FormSectionTitle>
            <Field>
              <FieldLabel>Connection error</FieldLabel>
              <Textarea defaultValue={destination.connectionError || ""} name="connectionError" />
            </Field>
            <Field>
              <FieldLabel>Settings JSON</FieldLabel>
              <Textarea
                defaultValue={JSON.stringify(destination.settingsJson || {}, null, 2)}
                name="settingsJson"
              />
            </Field>
            <ButtonRow>
              <PrimaryButton disabled={issues.length > 0} type="submit">
                {submitLabel}
              </PrimaryButton>
            </ButtonRow>
            <SmallText>
              Streams linked: {(destination.streams || []).map((stream) => stream.name).join(", ") || "None"}
            </SmallText>
          </FormSection>
        </>
      ) : (
        <FormSection>
          <FormSectionTitle>Save record</FormSectionTitle>
          <ButtonRow>
            <PrimaryButton disabled={issues.length > 0} type="submit">
              {submitLabel}
            </PrimaryButton>
          </ButtonRow>
        </FormSection>
      )}
    </form>
  );
}
