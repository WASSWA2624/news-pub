"use client";

/**
 * Admin template editor for NewsPub website and social publishing templates.
 */

import { useId, useRef, useState } from "react";
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
  NoticeBanner,
  NoticeItem,
  NoticeList,
  NoticeTitle,
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
import { PendingSubmitButton } from "@/components/admin/pending-action";
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
  border-radius: var(--theme-radius-lg, 2px);
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
  border-radius: var(--theme-radius-md, 1px);
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
  border-radius: var(--theme-radius-md, 1px);
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
  min-height: ${({ $compact }) => ($compact ? "120px" : "220px")};
`;

const CheckboxPill = styled.label`
  align-items: center;
  background: rgba(16, 32, 51, 0.04);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  gap: 0.5rem;
  min-height: calc(var(--admin-control-min-height) - 4px);
  padding: 0 0.85rem;

  input {
    accent-color: #0f6f8d;
    margin: 0;
  }
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

/**
 * Renders the template editor used by the admin template workspace modal.
 *
 * @param {object} props - Template form configuration props.
 * @returns {JSX.Element} The template editor form.
 */
export default function TemplateFormCard({
  action,
  categoryOptions = [],
  platformOptions = [],
  submitLabel,
  template = null,
}) {
  const [platform, setPlatform] = useState(`${template?.platform || "WEBSITE"}`);
  const formId = useId();
  const formRef = useRef(null);
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
    scrollToFirstBlockingField(formRef.current);
  }

  return (
    <TemplateForm action={action} id={formId} onSubmit={handleSubmit} ref={formRef}>
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

      <AdminValidationSummary
        items={issues.map((issue) => issue.message)}
        title="Fix the highlighted template sections before saving."
      />

      <AdminDisclosureGroup>
        <AdminDisclosureSection
          completionLabel="Resolution ready"
          defaultOpen
          errorCount={issues.length}
          meta={[
            {
              label: formatEnumLabel(platform),
              tone: "muted",
            },
            ...(linkedPlatforms.length
              ? [{ label: `${linkedPlatforms.length} linked platform${linkedPlatforms.length === 1 ? "" : "s"}`, tone: "warning" }]
              : []),
          ]}
          summary="Define where this template applies before editing the destination-specific content blocks."
          title="Resolution rules"
        >
          <FieldGrid>
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input defaultValue={template?.name || ""} name="name" required />
              <FieldHint>Name the template for the editorial use case it solves, not just the platform it belongs to.</FieldHint>
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
                <FieldHint>
                  Linked stream platforms: {linkedPlatforms.map((value) => formatEnumLabel(value)).join(", ")}
                </FieldHint>
              ) : (
                <FieldHint>Choose the publishing surface this copy structure is optimized for.</FieldHint>
              )}
              {issues.length ? <FieldErrorText>{issues[0].message}</FieldErrorText> : null}
            </Field>
            <Field>
              <FieldLabel>Locale override</FieldLabel>
              <Input defaultValue={template?.locale || ""} name="locale" placeholder="en, en-UG, fr" />
              <FieldHint>Leave blank to let the template apply across all locales for the selected platform.</FieldHint>
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
              <FieldHint>Use a category override only when a coverage lane truly needs different copy or compliance rules.</FieldHint>
            </Field>
          </FieldGrid>
        </AdminDisclosureSection>

        <AdminDisclosureSection
          completionLabel="Content ready"
          defaultOpen
          meta={[
            {
              label: "Reusable tokens",
              tone: "accent",
            },
            {
              label: template?.isDefault ? "Platform default" : "Optional override",
              tone: template?.isDefault ? "success" : "muted",
            },
          ]}
          summary="Compose the final payload with reusable story tokens so fallback and platform-specific copy stay bounded and predictable."
          title="Content blocks"
        >
          <ContentGrid>
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
                <FieldHint>Leave this blank when the destination should keep the optimized or canonical title unchanged.</FieldHint>
              </Field>
              <Field>
                <FieldLabel>Summary template</FieldLabel>
                <TemplateTextarea
                  $compact
                  defaultValue={template?.summaryTemplate || ""}
                  name="summaryTemplate"
                  placeholder="{{summary}}"
                />
                <FieldHint>Use the summary block for concise destination previews or SEO helper copy.</FieldHint>
              </Field>
              <Field>
                <FieldLabel>Hashtags template</FieldLabel>
                <TemplateTextarea
                  $compact
                  defaultValue={template?.hashtagsTemplate || ""}
                  name="hashtagsTemplate"
                  placeholder="#news #update"
                />
                <FieldHint>Keep hashtag defaults deterministic so runtime publishing stays bounded and reviewable.</FieldHint>
              </Field>
            </FieldGrid>

            <Field>
              <FieldLabel>Body template</FieldLabel>
              <TemplateTextarea
                defaultValue={template?.bodyTemplate || ""}
                name="bodyTemplate"
                placeholder="{{title}}\n\n{{summary}}\n\nRead more: {{canonicalUrl}}"
              />
              <FieldHint>The body template is the last deterministic fallback when no destination-specific optimized payload is available.</FieldHint>
            </Field>

            <CheckboxPill>
              <input defaultChecked={template?.isDefault} name="isDefault" type="checkbox" />
              Default for this platform
            </CheckboxPill>
          </ContentGrid>
        </AdminDisclosureSection>
      </AdminDisclosureGroup>

      {issues.length ? (
        <NoticeBanner $tone="danger">
          <NoticeTitle>Template compatibility needs attention</NoticeTitle>
          <NoticeList>
            {issues.map((issue) => (
              <NoticeItem key={issue.code}>{issue.message}</NoticeItem>
            ))}
          </NoticeList>
        </NoticeBanner>
      ) : null}

      <SmallText>
        Linked streams: {(template?.streams || []).map((stream) => stream.name).join(", ") || "None"}
      </SmallText>

      <AdminModalFooterActions>
        <PendingSubmitButton
          disabled={issues.length > 0}
          form={formId}
          icon={template ? "save" : "plus"}
          pendingLabel={template ? "Saving template..." : "Creating template..."}
          tone="primary"
          type="submit"
        >
          {submitLabel}
        </PendingSubmitButton>
      </AdminModalFooterActions>
    </TemplateForm>
  );
}
