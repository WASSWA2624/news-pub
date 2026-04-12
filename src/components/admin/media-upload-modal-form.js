"use client";

/**
 * Admin modal form for uploading and annotating NewsPub media assets.
 */

import { useId, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import {
  Field,
  FieldGrid,
  FieldLabel,
  Input,
  SmallText,
  Textarea,
} from "@/components/admin/news-admin-ui";
import {
  AdminDisclosureGroup,
  AdminDisclosureSection,
  AdminValidationSummary,
  scrollToFirstBlockingField,
} from "@/components/admin/admin-form-primitives";
import { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
import { PendingSubmitButton } from "@/components/admin/pending-action";

const UploadFormRoot = styled.form`
  display: grid;
  gap: 0.95rem;
`;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Builds the section-level validation state for the media upload modal.
 *
 * @param {object} input - Current file and metadata values.
 * @returns {object} Aggregated validation messages and section state.
 */
function buildMediaUploadValidationState({ hasSelectedFile }) {
  const assetMissingCount = hasSelectedFile ? 0 : 1;

  return {
    messages: assetMissingCount ? ["Choose a file before uploading the media asset."] : [],
    sections: {
      asset: {
        missingCount: assetMissingCount,
      },
    },
  };
}

/**
 * Renders the shared media upload modal form with disclosure summaries and
 * submit-failure recovery.
 *
 * @param {object} props - Form action prop for the server upload handler.
 * @returns {JSX.Element} The media upload form.
 */
export default function MediaUploadModalForm({ action }) {
  const formId = useId();
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [source_url, setSourceUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [attribution_text, setAttributionText] = useState("");
  const [caption, setCaption] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const hasSelectedFile = Boolean(selectedFileName);
  const validationState = useMemo(
    () => buildMediaUploadValidationState({ hasSelectedFile }),
    [hasSelectedFile],
  );
  const showValidationState = hasAttemptedSubmit;

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;

    setSelectedFileName(file?.name || "");
  }

  function handleSubmit(event) {
    const formElement = formRef.current;
    const resolvedHasSelectedFile = Boolean(fileInputRef.current?.files?.length || selectedFileName);
    const hasHtmlValidationIssues = !(formElement?.checkValidity?.() ?? true);
    const nextValidationState = buildMediaUploadValidationState({
      hasSelectedFile: resolvedHasSelectedFile,
    });
    const hasCustomValidationIssues = nextValidationState.messages.length > 0;

    setHasAttemptedSubmit(true);

    if (!hasHtmlValidationIssues && !hasCustomValidationIssues) {
      return;
    }

    event.preventDefault();
    scrollToFirstBlockingField(formElement);
  }

  return (
    <UploadFormRoot action={action} id={formId} onSubmit={handleSubmit} ref={formRef}>
      <AdminValidationSummary
        items={showValidationState ? validationState.messages : []}
        title="Fix the highlighted upload section before continuing."
      />

      <AdminDisclosureGroup>
        <AdminDisclosureSection
          completionLabel={hasSelectedFile ? "Asset ready" : ""}
          defaultOpen
          meta={[
            {
              label: hasSelectedFile ? "File selected" : "Required file",
              tone: hasSelectedFile ? "success" : "warning",
            },
          ]}
          missingCount={showValidationState ? validationState.sections.asset.missingCount : 0}
          summary="Choose the file NewsPub should ingest through the shared storage adapter and responsive variant pipeline."
          title="Asset file"
        >
          <Field>
            <FieldLabel>File</FieldLabel>
            <Input
              aria-invalid={showValidationState && !hasSelectedFile ? "true" : undefined}
              name="file"
              onChange={handleFileChange}
              ref={fileInputRef}
              required
              type="file"
            />
            <SmallText>
              {hasSelectedFile ? `Selected file: ${selectedFileName}` : "Choose an image or supported asset file to upload."}
            </SmallText>
          </Field>
        </AdminDisclosureSection>

        <AdminDisclosureSection
          completionLabel={
            normalizeText(source_url) || normalizeText(alt) || normalizeText(attribution_text) || normalizeText(caption)
              ? "Metadata added"
              : ""
          }
          defaultOpen={false}
          meta={[{ label: "Optional metadata", tone: "muted" }]}
          summary="Add descriptive text and attribution so the asset stays understandable in the editorial library later."
          title="Source and metadata"
        >
          <FieldGrid>
            <Field>
              <FieldLabel>Source URL</FieldLabel>
              <Input
                name="source_url"
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://example.com/original-asset"
                type="url"
                value={source_url}
              />
            </Field>
            <Field>
              <FieldLabel>Alt text</FieldLabel>
              <Input
                name="alt"
                onChange={(event) => setAlt(event.target.value)}
                placeholder="Describe the subject of the image"
                value={alt}
              />
            </Field>
            <Field>
              <FieldLabel>Attribution</FieldLabel>
              <Input
                name="attribution_text"
                onChange={(event) => setAttributionText(event.target.value)}
                placeholder="Photo desk, wire service, or photographer"
                value={attribution_text}
              />
            </Field>
          </FieldGrid>
          <Field>
            <FieldLabel>Caption</FieldLabel>
            <Textarea
              name="caption"
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Short editorial context for library previews and story embeds."
              value={caption}
            />
          </Field>
        </AdminDisclosureSection>
      </AdminDisclosureGroup>

      <AdminModalFooterActions>
        <PendingSubmitButton
          form={formId}
          icon="upload"
          pendingLabel="Uploading asset..."
          tone="primary"
          type="submit"
        >
          Upload asset
        </PendingSubmitButton>
      </AdminModalFooterActions>
    </UploadFormRoot>
  );
}
