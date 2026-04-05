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
  SmallText,
  Textarea,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import SearchableSelect from "@/components/common/searchable-select";
import { getTemplateValidationIssues } from "@/lib/validation/configuration";

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
    <form action={action} onSubmit={handleSubmit}>
      {template ? <input name="id" type="hidden" value={template.id} /> : null}
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
            ) : null}
          </Field>
          {template ? (
            <>
              <Field>
                <FieldLabel>Locale override</FieldLabel>
                <Input defaultValue={template.locale || ""} name="locale" />
              </Field>
              <Field as="div">
                <FieldLabel>Category override</FieldLabel>
                <SearchableSelect
                  ariaLabel="Category override"
                  defaultValue={template.categoryId || ""}
                  name="categoryId"
                  options={categoryOptions}
                  placeholder="Select a category override"
                />
              </Field>
            </>
          ) : null}
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

      <FormSection>
        <FormSectionTitle>{template ? "Template content" : "Body template"}</FormSectionTitle>
        {template ? (
          <>
            <Field>
              <FieldLabel>Title template</FieldLabel>
              <Textarea defaultValue={template.titleTemplate || ""} name="titleTemplate" />
            </Field>
            <Field>
              <FieldLabel>Summary template</FieldLabel>
              <Textarea defaultValue={template.summaryTemplate || ""} name="summaryTemplate" />
            </Field>
          </>
        ) : null}
        <Field>
          <FieldLabel>Body template</FieldLabel>
          <Textarea
            defaultValue={template?.bodyTemplate || ""}
            name="bodyTemplate"
            placeholder="{{title}}\n\n{{summary}}\n\nRead more: {{canonicalUrl}}"
          />
        </Field>
        {template ? (
          <Field>
            <FieldLabel>Hashtags template</FieldLabel>
            <Textarea defaultValue={template.hashtagsTemplate || ""} name="hashtagsTemplate" />
          </Field>
        ) : null}
        <ButtonRow>
          {template ? (
            <label>
              <input defaultChecked={template.isDefault} name="isDefault" type="checkbox" /> Default for platform
            </label>
          ) : null}
          <PrimaryButton disabled={issues.length > 0} type="submit">
            {submitLabel}
          </PrimaryButton>
        </ButtonRow>
        {template ? (
          <SmallText>
            Linked streams: {(template.streams || []).map((stream) => stream.name).join(", ") || "None"}
          </SmallText>
        ) : null}
      </FormSection>
    </form>
  );
}
