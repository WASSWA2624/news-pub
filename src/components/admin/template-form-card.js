"use client";

import { useId, useState } from "react";
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
  PrimaryButton,
  SmallText,
  Textarea,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
import SearchableSelect from "@/components/common/searchable-select";
import { getTemplateValidationIssues } from "@/lib/validation/configuration";

const TemplateForm = styled.form`
  display: grid;
  gap: 0.9rem;
`;

const RuleBanner = styled.div`
  background:
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.12), transparent 52%),
    linear-gradient(180deg, rgba(247, 251, 255, 0.98), rgba(255, 255, 255, 0.96));
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 16px;
  display: grid;
  gap: 0.7rem;
  padding: 0.85rem;
`;

const RuleHeader = styled.div`
  display: grid;
  gap: 0.18rem;
`;

const RuleEyebrow = styled.span`
  color: #0f5f79;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const RuleTitle = styled.strong`
  color: #162744;
  font-size: 0.94rem;
  letter-spacing: -0.02em;
`;

const RuleGrid = styled.div`
  display: grid;
  gap: 0.5rem;

  @media (min-width: 720px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const RuleCard = styled.div`
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(16, 32, 51, 0.06);
  border-radius: 12px;
  display: grid;
  gap: 0.2rem;
  min-width: 0;
  padding: 0.72rem;
`;

const RuleStep = styled.span`
  color: rgba(73, 87, 112, 0.82);
  font-size: 0.63rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const RuleCardTitle = styled.strong`
  color: #182742;
  font-size: 0.82rem;
`;

const RuleCardText = styled.p`
  color: rgba(72, 85, 108, 0.92);
  font-size: 0.76rem;
  line-height: 1.42;
  margin: 0;
`;

const ContentGrid = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const TemplateCanvas = styled.div`
  background:
    linear-gradient(180deg, rgba(249, 252, 255, 0.98), rgba(255, 255, 255, 0.96)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.05), transparent 54%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 16px;
  display: grid;
  gap: 0.75rem;
  padding: 0.85rem;
`;

const CanvasHeader = styled.div`
  display: grid;
  gap: 0.24rem;
`;

const CanvasTitle = styled.strong`
  color: #162744;
  font-size: 0.92rem;
  letter-spacing: -0.02em;
`;

const TokenGrid = styled.div`
  display: grid;
  gap: 0.45rem;

  @media (min-width: 820px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const TokenCard = styled.div`
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: 12px;
  display: grid;
  gap: 0.28rem;
  padding: 0.7rem;
`;

const TokenLabel = styled.code`
  color: #0d5f79;
  font-family: var(--font-mono, "Consolas", monospace);
  font-size: 0.74rem;
  font-weight: 700;
`;

const TokenDescription = styled.p`
  color: rgba(72, 85, 108, 0.9);
  font-size: 0.74rem;
  line-height: 1.4;
  margin: 0;
`;

const TemplateTextarea = styled(Textarea)`
  min-height: ${({ $compact }) => ($compact ? "96px" : "180px")};
`;

const CheckboxPill = styled.label`
  align-items: center;
  background: rgba(16, 32, 51, 0.04);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 999px;
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  gap: 0.5rem;
  min-height: 40px;
  padding: 0 0.85rem;

  input {
    accent-color: #0f6f8d;
    margin: 0;
  }
`;

const TemplateFooter = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  justify-content: space-between;
`;

const visibleTokenCards = [
  {
    description: "Story headline as it exists before destination-specific formatting.",
    label: "{{title}}",
  },
  {
    description: "Short summary or standfirst pulled from the article record.",
    label: "{{summary}}",
  },
  {
    description: "Canonical article URL for website read-more links or attribution.",
    label: "{{canonicalUrl}}",
  },
];

function buildPlatformOptions(platformOptions, linkedPlatforms = []) {
  if (!linkedPlatforms.length) {
    return platformOptions;
  }

  if (linkedPlatforms.length > 1) {
    return platformOptions.map((option) => ({
      ...option,
      description: `${option.description} Linked streams must be fixed first before this template can be saved.`,
      disabled: true,
    }));
  }

  return platformOptions.map((option) => {
    const compatible = option.value === linkedPlatforms[0];

    return {
      ...option,
      description: compatible
        ? option.description
        : `${option.description} Linked streams require ${formatEnumLabel(linkedPlatforms[0])}.`,
      disabled: !compatible,
    };
  });
}

export default function TemplateFormCard({
  action,
  categoryOptions = [],
  platformOptions = [],
  submitLabel,
  template = null,
}) {
  const [platform, setPlatform] = useState(`${template?.platform || "WEBSITE"}`);
  const formId = useId();
  const linkedPlatforms = [
    ...new Set(
      (template?.streams || [])
        .map((stream) => `${stream?.destination?.platform || ""}`.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  const issues = getTemplateValidationIssues({
    platform,
    streams: template?.streams || [],
  });
  const resolvedPlatformOptions = buildPlatformOptions(platformOptions, linkedPlatforms);

  function handleSubmit(event) {
    if (!issues.length) {
      return;
    }

    event.preventDefault();
  }

  return (
    <TemplateForm action={action} id={formId} onSubmit={handleSubmit}>
      {template ? <input name="id" type="hidden" value={template.id} /> : null}
      <RuleBanner>
        <RuleHeader>
          <RuleEyebrow>{template ? "Template editing" : "New template"}</RuleEyebrow>
          <RuleTitle>
            {template ? "Adjust the resolution rules before touching the content blocks." : "Define where this template wins in the fallback chain."}
          </RuleTitle>
        </RuleHeader>
        <RuleGrid>
          <RuleCard>
            <RuleStep>Priority 01</RuleStep>
            <RuleCardTitle>Category-specific overrides</RuleCardTitle>
            <RuleCardText>Use these when a destination needs distinct copy for a coverage lane.</RuleCardText>
          </RuleCard>
          <RuleCard>
            <RuleStep>Priority 02</RuleStep>
            <RuleCardTitle>Locale-specific variants</RuleCardTitle>
            <RuleCardText>Keep language or regional tailoring separate without cloning every rule.</RuleCardText>
          </RuleCard>
          <RuleCard>
            <RuleStep>Priority 03</RuleStep>
            <RuleCardTitle>Platform default</RuleCardTitle>
            <RuleCardText>Fallback templates keep streams publishing even when no override matches.</RuleCardText>
          </RuleCard>
        </RuleGrid>
      </RuleBanner>

      <FormSection>
        <FormSectionTitle>Resolution rules</FormSectionTitle>
        <FieldGrid>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input defaultValue={template?.name || ""} name="name" required />
          </Field>
          <Field as="div">
            <FieldLabel>Platform</FieldLabel>
            <SearchableSelect
              ariaLabel="Template platform"
              invalid={issues.length > 0}
              name="platform"
              onChange={(value) => setPlatform(`${value || ""}`)}
              options={resolvedPlatformOptions}
              placeholder="Select a platform"
              value={platform}
            />
            {linkedPlatforms.length ? (
              <SmallText>
                Linked stream platforms: {linkedPlatforms.map((value) => formatEnumLabel(value)).join(", ")}
              </SmallText>
            ) : (
              <SmallText>Choose the publishing surface this copy structure is optimized for.</SmallText>
            )}
          </Field>
          <Field>
            <FieldLabel>Locale override</FieldLabel>
            <Input defaultValue={template?.locale || ""} name="locale" placeholder="en, en-UG, fr" />
          </Field>
          <Field as="div">
            <FieldLabel>Category override</FieldLabel>
            <SearchableSelect
              ariaLabel="Category override"
              defaultValue={template?.categoryId || ""}
              name="categoryId"
              options={categoryOptions}
              placeholder="Select a category override"
            />
          </Field>
        </FieldGrid>
      </FormSection>

      {issues.length ? (
        <FormSection>
          <NoticeBanner $tone="danger">
            <NoticeTitle>Incompatible template configuration</NoticeTitle>
            <NoticeList>
              {issues.map((issue) => (
                <NoticeItem key={issue.code}>{issue.message}</NoticeItem>
              ))}
            </NoticeList>
          </NoticeBanner>
        </FormSection>
      ) : null}

      <ContentGrid>
        <TemplateCanvas>
          <CanvasHeader>
            <FormSectionTitle>{template ? "Content blocks" : "Compose template"}</FormSectionTitle>
            <CanvasTitle>Structure the final payload with reusable story tokens.</CanvasTitle>
            <SmallText>Leave optional fields blank when the destination only needs a body message.</SmallText>
          </CanvasHeader>

          <TokenGrid>
            {visibleTokenCards.map((token) => (
              <TokenCard key={token.label}>
                <TokenLabel>{token.label}</TokenLabel>
                <TokenDescription>{token.description}</TokenDescription>
              </TokenCard>
            ))}
          </TokenGrid>

          <FieldGrid>
            <Field>
              <FieldLabel>Title template</FieldLabel>
              <TemplateTextarea
                $compact
                defaultValue={template?.titleTemplate || ""}
                name="titleTemplate"
                placeholder="{{title}}"
              />
            </Field>
            <Field>
              <FieldLabel>Summary template</FieldLabel>
              <TemplateTextarea
                $compact
                defaultValue={template?.summaryTemplate || ""}
                name="summaryTemplate"
                placeholder="{{summary}}"
              />
            </Field>
            <Field>
              <FieldLabel>Hashtags template</FieldLabel>
              <TemplateTextarea
                $compact
                defaultValue={template?.hashtagsTemplate || ""}
                name="hashtagsTemplate"
                placeholder="#news #update"
              />
            </Field>
          </FieldGrid>

          <Field>
            <FieldLabel>Body template</FieldLabel>
            <TemplateTextarea
              defaultValue={template?.bodyTemplate || ""}
              name="bodyTemplate"
              placeholder="{{title}}\n\n{{summary}}\n\nRead more: {{canonicalUrl}}"
            />
          </Field>
        </TemplateCanvas>

        <TemplateFooter>
          <div>
            <CheckboxPill>
              <input defaultChecked={template?.isDefault} name="isDefault" type="checkbox" />
              Default for this platform
            </CheckboxPill>
          </div>
        </TemplateFooter>

        <SmallText>
          Linked streams: {(template?.streams || []).map((stream) => stream.name).join(", ") || "None"}
        </SmallText>
      </ContentGrid>
      <AdminModalFooterActions>
        <PrimaryButton disabled={issues.length > 0} form={formId} type="submit">
          <ButtonIcon>
            <ActionIcon name={template ? "save" : "plus"} />
          </ButtonIcon>
          {submitLabel}
        </PrimaryButton>
      </AdminModalFooterActions>
    </TemplateForm>
  );
}
