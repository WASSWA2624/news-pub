"use client";

/**
 * Admin modal form for editing NewsPub canonical post content, publishing state, and diagnostics.
 */

import { useId, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import {
  Field,
  FieldGrid,
  FieldLabel,
  Input,
  Textarea,
} from "@/components/admin/news-admin-ui";
import {
  AdminDisclosureGroup,
  AdminDisclosureSection,
  AdminValidationSummary,
  scrollToFirstBlockingField,
} from "@/components/admin/admin-form-primitives";
import { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import { PendingSubmitButton } from "@/components/admin/pending-action";
import SearchableSelect from "@/components/common/searchable-select";

const EditorForm = styled.form`
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

function buildEditorValidationState({
  publishAt,
  slug,
  submitIntent,
  title,
}) {
  const editorialMissingCount = slug ? 0 : 1;
  const copyMissingCount = title ? 0 : 1;
  const publishingMessages = [];

  if (submitIntent === "schedule" && !isFuturePublishAt(publishAt)) {
    publishingMessages.push("Choose a future publish time before scheduling this story.");
  }

  return {
    messages: [
      ...(editorialMissingCount ? ["Add a canonical slug before saving."] : []),
      ...(copyMissingCount ? ["Add a title before continuing."] : []),
      ...publishingMessages,
    ],
    sections: {
      editorial: {
        missingCount: editorialMissingCount,
      },
      publishing: {
        errorCount: publishingMessages.length,
      },
      storyCopy: {
        missingCount: copyMissingCount,
      },
    },
  };
}

/**
 * Renders the post-editor modal form with shared validation recovery and
 * disclosure state for long-form editorial workflows.
 *
 * @param {object} props - Editor form action, options, and initial post values.
 * @returns {JSX.Element} The post editor form inside the modal shell.
 */
export default function PostEditorModalForm({
  action,
  articleMatchOptions = [],
  articleMatches = [],
  categoryOptions = [],
  defaultArticleMatchId = "",
  defaultLocale = "en",
  editorialStageOptions = [],
  post,
  selectedTranslation,
  statusOptions = [],
}) {
  const formId = useId();
  const formRef = useRef(null);
  const [slug, setSlug] = useState(post.slug);
  const [status, setStatus] = useState(post.status);
  const [editorial_stage, setEditorialStage] = useState(post.editorial_stage);
  const [article_match_id, setArticleMatchId] = useState(defaultArticleMatchId || "");
  const [title, setTitle] = useState(selectedTranslation?.title || "");
  const [summary, setSummary] = useState(selectedTranslation?.summary || post.excerpt || "");
  const [content_md, setContentMd] = useState(selectedTranslation?.content_md || "");
  const [publishAt, setPublishAt] = useState("");
  const [categoryIds, setCategoryIds] = useState(post.categories.map((category) => category.id));
  const [submitIntent, setSubmitIntent] = useState("save");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const selectedMatch =
    articleMatches.find((match) => match.id === article_match_id)
    || articleMatches.find((match) => match.id === defaultArticleMatchId)
    || articleMatches[0]
    || null;
  const validationState = useMemo(
    () =>
      buildEditorValidationState({
        publishAt,
        slug: normalizeText(slug),
        submitIntent,
        title: normalizeText(title),
      }),
    [publishAt, slug, submitIntent, title],
  );
  const showValidationState = hasAttemptedSubmit;

  function handleSubmit(event) {
    const nextSubmitIntent = `${event.nativeEvent?.submitter?.value || "save"}`;
    const formElement = formRef.current;
    const hasHtmlValidationIssues = !(formElement?.checkValidity?.() ?? true);
    const nextValidationState = buildEditorValidationState({
      publishAt,
      slug: normalizeText(slug),
      submitIntent: nextSubmitIntent,
      title: normalizeText(title),
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
    <EditorForm action={action} id={formId} onSubmit={handleSubmit} ref={formRef}>
      <input name="locale" type="hidden" value={selectedTranslation?.locale || defaultLocale} />
      <input name="post_id" type="hidden" value={post.id} />

      <AdminValidationSummary
        items={showValidationState ? validationState.messages : []}
        title="Fix the highlighted editorial sections before continuing."
      />

      <AdminDisclosureGroup>
        <AdminDisclosureSection
          completionLabel={normalizeText(slug) ? "Editorial settings ready" : ""}
          defaultOpen
          meta={[
            { label: status, tone: status === "PUBLISHED" ? "success" : "warning" },
            { label: editorial_stage, tone: editorial_stage === "APPROVED" ? "success" : "accent" },
            ...(selectedMatch?.optimization_status ? [{ label: selectedMatch.optimization_status, tone: "muted" }] : []),
          ]}
          missingCount={showValidationState ? validationState.sections.editorial.missingCount : 0}
          summary="Choose the editorial stage, canonical slug, and destination match that the workflow actions should target."
          title="Editorial settings"
        >
          <FieldGrid>
            <Field>
              <FieldLabel>Slug</FieldLabel>
              <Input
                aria-invalid={showValidationState && !normalizeText(slug) ? "true" : undefined}
                name="slug"
                onChange={(event) => setSlug(event.target.value)}
                required
                value={slug}
              />
            </Field>
            <Field as="div">
              <FieldLabel>Status</FieldLabel>
              <SearchableSelect
                ariaLabel="Story status"
                name="status"
                onChange={(value) => setStatus(`${value || ""}`)}
                options={statusOptions}
                placeholder="Select a status"
                value={status}
              />
            </Field>
            <Field as="div">
              <FieldLabel>Editorial stage</FieldLabel>
              <SearchableSelect
                ariaLabel="Editorial stage"
                name="editorial_stage"
                onChange={(value) => setEditorialStage(`${value || ""}`)}
                options={editorialStageOptions}
                placeholder="Select an editorial stage"
                value={editorial_stage}
              />
            </Field>
            <Field as="div">
              <FieldLabel>Publish target match</FieldLabel>
              <SearchableSelect
                ariaLabel="Publish target match"
                name="article_match_id"
                onChange={(value) => setArticleMatchId(`${value || ""}`)}
                options={articleMatchOptions}
                placeholder="Select a destination match"
                value={article_match_id}
              />
            </Field>
          </FieldGrid>
        </AdminDisclosureSection>

        <AdminDisclosureSection
          completionLabel={normalizeText(title) ? "Copy ready" : ""}
          defaultOpen
          meta={[
            { label: selectedTranslation?.locale || defaultLocale, tone: "muted" },
            {
              label: normalizeText(title) ? "Copy loaded" : "Needs copy",
              tone: normalizeText(title) ? "success" : "warning",
            },
          ]}
          missingCount={showValidationState ? validationState.sections.storyCopy.missingCount : 0}
          summary="Edit the canonical title, summary, and body that feed both the website rendering path and destination optimization."
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
            <Textarea name="summary" onChange={(event) => setSummary(event.target.value)} value={summary} />
          </Field>
          <Field>
            <FieldLabel>Body markdown</FieldLabel>
            <Textarea
              name="content_md"
              onChange={(event) => setContentMd(event.target.value)}
              style={{ minHeight: "280px" }}
              value={content_md}
            />
          </Field>
        </AdminDisclosureSection>

        <AdminDisclosureSection
          completionLabel={submitIntent === "schedule" && !isFuturePublishAt(publishAt) ? "" : "Publishing ready"}
          defaultOpen={false}
          errorCount={showValidationState ? validationState.sections.publishing.errorCount : 0}
          meta={[
            ...(selectedMatch?.optimization_status
              ? [{ label: selectedMatch.optimization_status, tone: "muted" }]
              : []),
            ...(selectedMatch?.policy_status ? [{ label: selectedMatch.policy_status, tone: "warning" }] : []),
          ]}
          summary="Set categories, schedule publication, and run the editorial actions that approve, optimize, hold, or publish this story."
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
        </AdminDisclosureSection>
      </AdminDisclosureGroup>

      <AdminModalFooterActions>
        <PendingSubmitButton
          form={formId}
          icon="sparkles"
          name="intent"
          pendingLabel="Optimizing preview..."
          tone="secondary"
          type="submit"
          value="optimize"
        >
          Optimize now
        </PendingSubmitButton>
        <PendingSubmitButton
          form={formId}
          icon="badge-check"
          name="intent"
          pendingLabel="Approving story..."
          tone="secondary"
          type="submit"
          value="approve"
        >
          Approve
        </PendingSubmitButton>
        <PendingSubmitButton
          form={formId}
          icon="warning"
          name="intent"
          pendingLabel="Holding story..."
          tone="secondary"
          type="submit"
          value="reject"
        >
          Reject
        </PendingSubmitButton>
        <PendingSubmitButton
          form={formId}
          icon="save"
          name="intent"
          pendingLabel="Saving story..."
          tone="secondary"
          type="submit"
          value="save"
        >
          Save story
        </PendingSubmitButton>
        <PendingSubmitButton
          form={formId}
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
          form={formId}
          icon="publish"
          name="intent"
          pendingLabel="Publishing now..."
          tone="primary"
          type="submit"
          value="publish"
        >
          Publish now
        </PendingSubmitButton>
        <ConfirmSubmitButton
          confirmLabel="Archive story"
          description="The story will be moved to an archived state. Use this when it should no longer remain active in the editorial flow."
          formId={formId}
          icon="archive"
          submitName="intent"
          submitValue="archive"
          title="Archive this story?"
          tone="danger"
        >
          Archive story
        </ConfirmSubmitButton>
      </AdminModalFooterActions>
    </EditorForm>
  );
}
