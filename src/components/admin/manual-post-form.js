"use client";

import { useId, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import {
  ButtonRow,
  Field,
  FieldGrid,
  FieldLabel,
  Input,
  Textarea,
} from "@/components/admin/news-admin-ui";
import {
  AdminDisclosureSection,
  AdminValidationSummary,
  scrollToFirstBlockingField,
} from "@/components/admin/admin-form-primitives";
import { PendingSubmitButton } from "@/components/admin/pending-action";
import SearchableSelect from "@/components/common/searchable-select";

const ManualPostFormRoot = styled.form`
  display: grid;
  gap: 0.95rem;
`;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isFuturePublishAt(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return false;
  }

  const parsedValue = new Date(normalizedValue);

  return !Number.isNaN(parsedValue.getTime()) && parsedValue > new Date();
}

function buildManualPostValidationState({
  contentMd,
  publishAt,
  sourceName,
  sourceUrl,
  streamId,
  submitIntent,
  title,
}) {
  const routingMissingCount = streamId ? 0 : 1;
  const sourceMissingCount = [sourceName, sourceUrl].filter((value) => !normalizeText(value)).length;
  const copyMissingCount = [title, contentMd].filter((value) => !normalizeText(value)).length;
  const publishingMessages = [];

  if (submitIntent === "schedule" && !isFuturePublishAt(publishAt)) {
    publishingMessages.push("Choose a future publish time before scheduling the story.");
  }

  return {
    messages: [
      ...(routingMissingCount ? ["Choose the website stream that should own this story."] : []),
      ...(sourceMissingCount ? ["Add the required source attribution before saving."] : []),
      ...(copyMissingCount ? ["Enter a title and body before continuing."] : []),
      ...publishingMessages,
    ],
    sections: {
      publishing: {
        errorCount: publishingMessages.length,
      },
      routing: {
        missingCount: routingMissingCount,
      },
      source: {
        missingCount: sourceMissingCount,
      },
      storyCopy: {
        missingCount: copyMissingCount,
      },
    },
  };
}

/**
 * Renders the manual-story editor using the shared NewsPub admin disclosure
 * and validation contract.
 *
 * @param {object} props - Form action and option lists.
 * @returns {JSX.Element} The manual story form.
 */
export default function ManualPostForm({
  action,
  categoryOptions = [],
  defaultStreamId = "",
  streamOptions = [],
}) {
  const formId = useId();
  const formRef = useRef(null);
  const [streamId, setStreamId] = useState(defaultStreamId || "");
  const [sourceName, setSourceName] = useState("NewsPub Editorial");
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [slug, setSlug] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [categoryIds, setCategoryIds] = useState([]);
  const [submitIntent, setSubmitIntent] = useState("save");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const validationState = useMemo(
    () =>
      buildManualPostValidationState({
        contentMd,
        publishAt,
        sourceName,
        sourceUrl,
        streamId,
        submitIntent,
        title,
      }),
    [contentMd, publishAt, sourceName, sourceUrl, streamId, submitIntent, title],
  );
  const showValidationState = hasAttemptedSubmit;

  function handleSubmit(event) {
    const nextSubmitIntent = `${event.nativeEvent?.submitter?.value || "save"}`;
    const formElement = formRef.current;
    const hasHtmlValidationIssues = !(formElement?.checkValidity?.() ?? true);
    const nextValidationState = buildManualPostValidationState({
      contentMd,
      publishAt,
      sourceName,
      sourceUrl,
      streamId,
      submitIntent: nextSubmitIntent,
      title,
    });
    const hasCustomValidationIssues = nextValidationState.messages.length > 0;

    setSubmitIntent(nextSubmitIntent);
    setHasAttemptedSubmit(true);

    if (!hasHtmlValidationIssues && !hasCustomValidationIssues) {
      return;
    }

    event.preventDefault();
    scrollToFirstBlockingField(formElement);
  }

  return (
    <ManualPostFormRoot action={action} id={formId} onSubmit={handleSubmit} ref={formRef}>
      <AdminValidationSummary
        items={showValidationState ? validationState.messages : []}
        title="Fix the highlighted manual story sections before continuing."
      />

      <AdminDisclosureSection
        completionLabel={streamId ? "Routing ready" : ""}
        defaultOpen
        missingCount={showValidationState ? validationState.sections.routing.missingCount : 0}
        meta={[
          {
            label: streamId ? "Stream ready" : "Pick stream",
            tone: streamId ? "success" : "warning",
          },
        ]}
        summary="Choose the website stream and optional slug that should own the manual story."
        title="Routing"
      >
        <FieldGrid>
          <Field as="div">
            <FieldLabel>Website stream</FieldLabel>
            <SearchableSelect
              ariaLabel="Website stream"
              invalid={showValidationState && validationState.sections.routing.missingCount > 0}
              name="streamId"
              onChange={(value) => setStreamId(`${value || ""}`)}
              options={streamOptions}
              placeholder="Select a website stream"
              value={streamId}
            />
          </Field>
          <Field>
            <FieldLabel>Slug</FieldLabel>
            <Input
              name="slug"
              onChange={(event) => setSlug(event.target.value)}
              placeholder="optional-custom-slug"
              value={slug}
            />
          </Field>
        </FieldGrid>
      </AdminDisclosureSection>

      <AdminDisclosureSection
        completionLabel={normalizeText(sourceName) && normalizeText(sourceUrl) ? "Attribution ready" : ""}
        defaultOpen={false}
        missingCount={showValidationState ? validationState.sections.source.missingCount : 0}
        meta={[{ label: "Required attribution", tone: "muted" }]}
        summary="Store the human-visible source attribution that NewsPub keeps attached to the canonical story."
        title="Source attribution"
      >
        <FieldGrid>
          <Field>
            <FieldLabel>Source name</FieldLabel>
            <Input
              aria-invalid={showValidationState && !normalizeText(sourceName) ? "true" : undefined}
              name="sourceName"
              onChange={(event) => setSourceName(event.target.value)}
              required
              value={sourceName}
            />
          </Field>
          <Field>
            <FieldLabel>Source URL</FieldLabel>
            <Input
              aria-invalid={showValidationState && !normalizeText(sourceUrl) ? "true" : undefined}
              name="sourceUrl"
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://example.com/source-story"
              required
              type="url"
              value={sourceUrl}
            />
          </Field>
        </FieldGrid>
      </AdminDisclosureSection>

      <AdminDisclosureSection
        completionLabel={normalizeText(title) && normalizeText(contentMd) ? "Copy ready" : ""}
        defaultOpen
        missingCount={showValidationState ? validationState.sections.storyCopy.missingCount : 0}
        meta={[{ label: "Editorial draft", tone: "accent" }]}
        summary="Enter the canonical copy that the website stream, editor, and publish history will continue to manage."
        title="Story copy"
      >
        <Field>
          <FieldLabel>Title</FieldLabel>
          <Input
            aria-invalid={showValidationState && !normalizeText(title) ? "true" : undefined}
            name="title"
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </Field>
        <Field>
          <FieldLabel>Summary</FieldLabel>
          <Textarea
            name="summary"
            onChange={(event) => setSummary(event.target.value)}
            placeholder="A short editorial summary for listings and social previews."
            value={summary}
          />
        </Field>
        <Field>
          <FieldLabel>Body markdown</FieldLabel>
          <Textarea
            aria-invalid={showValidationState && !normalizeText(contentMd) ? "true" : undefined}
            name="contentMd"
            onChange={(event) => setContentMd(event.target.value)}
            required
            style={{ minHeight: "320px" }}
            value={contentMd}
          />
        </Field>
      </AdminDisclosureSection>

      <AdminDisclosureSection
        completionLabel={submitIntent === "schedule" && !isFuturePublishAt(publishAt) ? "" : "Publishing ready"}
        defaultOpen={false}
        errorCount={showValidationState ? validationState.sections.publishing.errorCount : 0}
        meta={[{ label: "Draft, schedule, or publish", tone: "muted" }]}
        summary="Assign categories, choose an optional publish time, and decide whether this story should save, schedule, or publish immediately."
        title="Publishing"
      >
        <Field as="div">
          <FieldLabel>Categories</FieldLabel>
          <SearchableSelect
            ariaLabel="Story categories"
            multiple
            name="categoryIds"
            onChange={(value) => setCategoryIds(Array.isArray(value) ? value : [])}
            options={categoryOptions}
            placeholder="Select one or more categories"
            value={categoryIds}
          />
        </Field>
        <Field>
          <FieldLabel>Schedule publish time</FieldLabel>
          <Input
            aria-invalid={
              showValidationState && submitIntent === "schedule" && !isFuturePublishAt(publishAt)
                ? "true"
                : undefined
            }
            name="publishAt"
            onChange={(event) => setPublishAt(event.target.value)}
            type="datetime-local"
            value={publishAt}
          />
        </Field>
        <ButtonRow>
          <PendingSubmitButton
            icon="save"
            name="intent"
            pendingLabel="Saving draft..."
            tone="secondary"
            type="submit"
            value="save"
          >
            Save draft
          </PendingSubmitButton>
          <PendingSubmitButton
            icon="schedule"
            name="intent"
            pendingLabel="Scheduling story..."
            tone="secondary"
            type="submit"
            value="schedule"
          >
            Schedule publish
          </PendingSubmitButton>
          <PendingSubmitButton
            icon="publish"
            name="intent"
            pendingLabel="Publishing story..."
            tone="primary"
            type="submit"
            value="publish"
          >
            Publish now
          </PendingSubmitButton>
        </ButtonRow>
      </AdminDisclosureSection>
    </ManualPostFormRoot>
  );
}
