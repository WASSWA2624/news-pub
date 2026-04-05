"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import styled from "styled-components";

import { sanitizeHtmlFragment } from "@/lib/security";

function formatDateTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatJsonField(value, fallback) {
  return JSON.stringify(value ?? fallback, null, 2);
}

function parseJsonField(label, value, fallback) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return fallback;
  }

  try {
    return JSON.parse(trimmedValue);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function toLocalDateTimeInputValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toISOString();
}

function createDraft(data) {
  return {
    categoryIds: data.categories.filter((category) => category.isAssigned).map((category) => category.id),
    contentHtml: data.translation.contentHtml,
    contentMd: data.translation.contentMd,
    disclaimer: data.translation.disclaimer,
    excerpt: data.translation.excerpt,
    faqJsonText: formatJsonField(data.translation.faqJson, []),
    scheduledPublishAt: data.post.scheduledPublishAt,
    slug: data.post.slug,
    structuredContentJsonText: formatJsonField(data.translation.structuredContentJson, {}),
    title: data.translation.title,
  };
}

function getNextEditorialActionLabel(copy, nextEditorialStage) {
  if (nextEditorialStage === "REVIEWED") {
    return copy.advanceToReviewed;
  }

  if (nextEditorialStage === "EDITED") {
    return copy.advanceToEdited;
  }

  if (nextEditorialStage === "APPROVED") {
    return copy.advanceToApproved;
  }

  return null;
}

const Page = styled.main`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  margin: 0 auto;
  max-width: 1400px;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.2), transparent 38%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.12), rgba(16, 32, 51, 0.03));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Eyebrow = styled.p`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1.05;
  margin: 0;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.7;
  margin: 0;
  max-width: 860px;
`;

const SummaryGrid = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};

  @media (min-width: 860px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const SummaryCard = styled.section`
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 18px 50px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const SummaryValue = styled.strong`
  font-size: 1.2rem;
  line-height: 1.2;
`;

const Layout = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: 1120px) {
    grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
  }
`;

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Card = styled.section`
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 18px 50px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const CardTitle = styled.h2`
  font-size: 1.05rem;
  margin: 0;
`;

const SmallText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.6;
  margin: 0;
`;

const StatusBanner = styled.div`
  background: ${({ $tone, theme }) =>
    $tone === "success" ? "rgba(21, 115, 71, 0.12)" : "rgba(180, 35, 24, 0.12)"};
  border: 1px solid ${({ $tone, theme }) => ($tone === "success" ? theme.colors.success : theme.colors.danger)};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing.md};
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Pill = styled.span`
  background: ${({ $tone }) =>
    $tone === "accent"
      ? "rgba(201, 123, 42, 0.18)"
      : $tone === "success"
        ? "rgba(21, 115, 71, 0.12)"
        : "rgba(0, 95, 115, 0.12)"};
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
`;

const MetaGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const MetaCard = styled.div`
  background: rgba(247, 249, 252, 0.86);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
`;

const MetaLabel = styled.strong`
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const FieldLabel = styled.span`
  font-weight: 600;
`;

const FieldGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};

  @media (min-width: 920px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Input = styled.input`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  padding: 0.82rem 0.92rem;
`;

const Textarea = styled.textarea`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: ${({ $rows }) => `${$rows * 1.7}rem`};
  padding: 0.82rem 0.92rem;
  resize: vertical;
`;

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ActionRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ActionPanel = styled.div`
  background:
    linear-gradient(135deg, rgba(0, 95, 115, 0.08), rgba(201, 123, 42, 0.08)),
    rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(0, 95, 115, 0.14);
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
`;

const ActionLabel = styled.strong`
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Button = styled.button`
  background: ${({ $tone, theme }) =>
    $tone === "secondary"
      ? "rgba(247, 249, 252, 0.96)"
      : $tone === "danger"
        ? theme.colors.danger
        : theme.colors.primary};
  border: 1px solid ${({ $tone, theme }) => ($tone === "secondary" ? theme.colors.border : "transparent")};
  border-radius: 999px;
  color: ${({ $tone }) => ($tone === "secondary" ? "inherit" : "white")};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font: inherit;
  font-weight: 700;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.82rem 1.2rem;
`;

const LinkButton = styled(Link)`
  align-items: center;
  background: rgba(247, 249, 252, 0.96);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  display: inline-flex;
  font-weight: 700;
  justify-content: center;
  padding: 0.82rem 1.2rem;
`;

const CategoryGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (min-width: 780px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const CategoryCard = styled.label`
  background: ${({ $selected }) =>
    $selected ? "rgba(0, 95, 115, 0.08)" : "rgba(247, 249, 252, 0.95)"};
  border: 1px solid ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
`;

const Checkbox = styled.input`
  accent-color: ${({ theme }) => theme.colors.primary};
  height: 1rem;
  width: 1rem;
`;

const PreviewFrame = styled.article`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 252, 0.94));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

const PreviewHeader = styled.div`
  background:
    radial-gradient(circle at right top, rgba(201, 123, 42, 0.18), transparent 45%),
    rgba(16, 32, 51, 0.98);
  color: white;
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const PreviewBody = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const PreviewArticle = styled.div`
  background: white;
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: ${({ theme }) => theme.radius.md};
  line-height: 1.7;
  padding: ${({ theme }) => theme.spacing.lg};

  article {
    display: grid;
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

export default function PostEditorScreen({ copy, initialData, permissions }) {
  const [data, setData] = useState(initialData);
  const [draft, setDraft] = useState(() => createDraft(initialData));
  const [notice, setNotice] = useState(null);
  const [contentState, setContentState] = useState("idle");
  const [settingsState, setSettingsState] = useState("idle");
  const [workflowState, setWorkflowState] = useState("idle");

  useEffect(() => {
    setDraft(createDraft(data));
  }, [data]);

  async function applyEditorSnapshot(nextSnapshot) {
    startTransition(() => {
      setData(nextSnapshot);
    });
  }

  async function patchPost(payload) {
    const response = await fetch(`/api/posts/${data.post.id}`, {
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || copy.workflowErrorPrefix);
    }

    await applyEditorSnapshot(result.data.snapshot);
    return result.data.snapshot;
  }

  function handleCategoryToggle(categoryId) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      categoryIds: currentDraft.categoryIds.includes(categoryId)
        ? currentDraft.categoryIds.filter((entry) => entry !== categoryId)
        : [...currentDraft.categoryIds, categoryId],
    }));
  }

  async function handleSaveContent(event) {
    event.preventDefault();
    setContentState("saving");
    setNotice(null);

    try {
      const response = await fetch("/api/save-draft", {
        body: JSON.stringify({
          contentHtml: draft.contentHtml,
          contentMd: draft.contentMd,
          disclaimer: draft.disclaimer,
          excerpt: draft.excerpt,
          faqJson: parseJsonField(copy.fieldFaqJson, draft.faqJsonText, []),
          locale: data.selection.locale,
          postId: data.post.id,
          structuredContentJson: parseJsonField(
            copy.fieldStructuredContentJson,
            draft.structuredContentJsonText,
            {},
          ),
          title: draft.title,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.contentSaveErrorPrefix);
      }

      await applyEditorSnapshot({
        ...data,
        translation: {
          ...data.translation,
          contentHtml: draft.contentHtml,
          contentMd: draft.contentMd,
          disclaimer: draft.disclaimer,
          excerpt: draft.excerpt,
          faqJson: parseJsonField(copy.fieldFaqJson, draft.faqJsonText, []),
          structuredContentJson: parseJsonField(
            copy.fieldStructuredContentJson,
            draft.structuredContentJsonText,
            {},
          ),
          title: draft.title,
          updatedAt: payload.data.translation.updatedAt,
        },
      });

      setContentState("saved");
      setNotice({
        kind: "success",
        message: copy.contentSaveSuccess,
      });
    } catch (error) {
      setContentState("error");
      setNotice({
        kind: "error",
        message: `${copy.contentSaveErrorPrefix}: ${error.message}`,
      });
    }
  }

  async function handleSaveContentAndReview() {
    setContentState("saving");
    setNotice(null);

    try {
      const response = await fetch("/api/save-draft", {
        body: JSON.stringify({
          contentHtml: draft.contentHtml,
          contentMd: draft.contentMd,
          disclaimer: draft.disclaimer,
          excerpt: draft.excerpt,
          faqJson: parseJsonField(copy.fieldFaqJson, draft.faqJsonText, []),
          locale: data.selection.locale,
          postId: data.post.id,
          structuredContentJson: parseJsonField(
            copy.fieldStructuredContentJson,
            draft.structuredContentJsonText,
            {},
          ),
          title: draft.title,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.contentSaveErrorPrefix);
      }

      await applyEditorSnapshot({
        ...data,
        translation: {
          ...data.translation,
          contentHtml: draft.contentHtml,
          contentMd: draft.contentMd,
          disclaimer: draft.disclaimer,
          excerpt: draft.excerpt,
          faqJson: parseJsonField(copy.fieldFaqJson, draft.faqJsonText, []),
          structuredContentJson: parseJsonField(
            copy.fieldStructuredContentJson,
            draft.structuredContentJsonText,
            {},
          ),
          title: draft.title,
          updatedAt: payload.data.translation.updatedAt,
        },
      });

      setContentState("saved");
      setNotice({
        kind: "success",
        message: copy.contentSaveAndReviewSuccess,
      });
      document.getElementById("workflow")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setContentState("error");
      setNotice({
        kind: "error",
        message: `${copy.contentSaveErrorPrefix}: ${error.message}`,
      });
    }
  }

  async function handleSaveSettings(event) {
    event.preventDefault();
    setSettingsState("saving");
    setNotice(null);

    try {
      const response = await fetch(`/api/posts/${data.post.id}`, {
        body: JSON.stringify({
          categoryIds: draft.categoryIds,
          slug: draft.slug,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.settingsSaveErrorPrefix);
      }

      await applyEditorSnapshot(payload.data.snapshot);
      setSettingsState("saved");
      setNotice({
        kind: "success",
        message: copy.settingsSaveSuccess,
      });
    } catch (error) {
      setSettingsState("error");
      setNotice({
        kind: "error",
        message: `${copy.settingsSaveErrorPrefix}: ${error.message}`,
      });
    }
  }

  async function handleAdvanceEditorialStage() {
    if (!data.lifecycle.nextEditorialStage) {
      return;
    }

    setWorkflowState("saving");
    setNotice(null);

    try {
      await patchPost({
        editorialStage: data.lifecycle.nextEditorialStage,
      });
      setNotice({
        kind: "success",
        message: copy.workflowSuccess,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `${copy.workflowErrorPrefix}: ${error.message}`,
      });
    } finally {
      setWorkflowState("idle");
    }
  }

  async function handleStatusAction(kind) {
    setWorkflowState(kind);
    setNotice(null);

    try {
      let response;

      if (kind === "schedule") {
        response = await fetch("/api/publish-post", {
          body: JSON.stringify({
            postId: data.post.id,
            publishAt: toIsoDateTime(draft.scheduledPublishAt),
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });
      } else if (kind === "publish") {
        response = await fetch("/api/publish-post", {
          body: JSON.stringify({
            postId: data.post.id,
            publishAt: null,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });
      } else {
        response = await fetch(`/api/posts/${data.post.id}`, {
          body: JSON.stringify({
            status: kind === "archive" ? "ARCHIVED" : "DRAFT",
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "PATCH",
        });
      }

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.workflowErrorPrefix);
      }

      await applyEditorSnapshot(payload.data.snapshot);
      setNotice({
        kind: "success",
        message:
          kind === "schedule"
            ? copy.scheduleSuccess
            : kind === "publish"
              ? copy.publishSuccess
              : kind === "archive"
                ? copy.archiveSuccess
                : copy.returnToDraftSuccess,
      });
    } catch (error) {
      const prefix =
        kind === "schedule"
          ? copy.scheduleErrorPrefix
          : kind === "publish"
            ? copy.publishErrorPrefix
            : kind === "archive"
              ? copy.archiveErrorPrefix
              : copy.returnToDraftErrorPrefix;

      setNotice({
        kind: "error",
        message: `${prefix}: ${error.message}`,
      });
    } finally {
      setWorkflowState("idle");
    }
  }

  async function handleReviewAndPublish() {
    setWorkflowState("publishing");
    setNotice(null);

    try {
      let snapshot = data;

      while (snapshot.lifecycle.nextEditorialStage) {
        snapshot = await patchPost({
          editorialStage: snapshot.lifecycle.nextEditorialStage,
        });
      }

      const response = await fetch("/api/publish-post", {
        body: JSON.stringify({
          postId: data.post.id,
          publishAt: null,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.publishErrorPrefix);
      }

      await applyEditorSnapshot(payload.data.snapshot);
      setNotice({
        kind: "success",
        message: copy.reviewAndPublishSuccess,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `${copy.publishErrorPrefix}: ${error.message}`,
      });
    } finally {
      setWorkflowState("idle");
    }
  }

  const nextEditorialActionLabel = getNextEditorialActionLabel(copy, data.lifecycle.nextEditorialStage);
  const backToListHref =
    data.post.status === "PUBLISHED" ? "/admin/posts/published" : "/admin/posts/drafts";

  return (
    <Page>
      <Hero>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Title>{copy.title}</Title>
        <Description>{copy.description}</Description>
      </Hero>
      <SummaryGrid>
        <SummaryCard>
          <SmallText>{copy.statusLabel}</SmallText>
          <SummaryValue>{data.post.status}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SmallText>{copy.editorialStageLabel}</SmallText>
          <SummaryValue>{data.post.editorialStage}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SmallText>{copy.updatedAtLabel}</SmallText>
          <SummaryValue>{formatDateTime(data.post.updatedAt) || copy.notAvailable}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SmallText>{copy.categoryCountLabel}</SmallText>
          <SummaryValue>{data.post.categoryCount}</SummaryValue>
        </SummaryCard>
      </SummaryGrid>
      <Layout>
        <Stack>
          <Card>
            <CardTitle>{copy.summaryTitle}</CardTitle>
            <SmallText>{copy.summaryDescription}</SmallText>
            <ActionPanel>
              <ActionLabel>{copy.quickActionsLabel}</ActionLabel>
              <ButtonRow>
                <LinkButton href="#content">{copy.editAction}</LinkButton>
                <LinkButton href="#workflow">{copy.reviewAction}</LinkButton>
                {permissions.canPublish ? (
                  <Button
                    disabled={workflowState !== "idle" || data.post.status === "PUBLISHED"}
                    onClick={() => handleStatusAction("publish")}
                    type="button"
                  >
                    {workflowState === "publish" ? copy.publishWorking : copy.publishAction}
                  </Button>
                ) : null}
                {permissions.canPublish ? (
                  <Button
                    $tone="secondary"
                    disabled={workflowState !== "idle" || data.post.status === "PUBLISHED"}
                    onClick={handleReviewAndPublish}
                    type="button"
                  >
                    {workflowState === "publishing"
                      ? copy.reviewAndPublishWorking
                      : copy.reviewAndPublishAction}
                  </Button>
                ) : null}
              </ButtonRow>
            </ActionPanel>
            <MetaGrid>
              <MetaCard>
                <MetaLabel>{copy.equipmentLabel}</MetaLabel>
                <SmallText>{data.post.equipmentName}</SmallText>
              </MetaCard>
              <MetaCard>
                <MetaLabel>{copy.slugLabel}</MetaLabel>
                <SmallText>{data.post.slug}</SmallText>
              </MetaCard>
              <MetaCard>
                <MetaLabel>{copy.scheduledAtLabel}</MetaLabel>
                <SmallText>{formatDateTime(data.post.scheduledPublishAt) || copy.notAvailable}</SmallText>
              </MetaCard>
              <MetaCard>
                <MetaLabel>{copy.publishedAtLabel}</MetaLabel>
                <SmallText>{formatDateTime(data.post.publishedAt) || copy.notAvailable}</SmallText>
              </MetaCard>
            </MetaGrid>
            <PillRow>
              <Pill>{data.post.status}</Pill>
              <Pill $tone="accent">{data.post.editorialStage}</Pill>
              {data.post.publishedAt ? <Pill $tone="success">{copy.publishedBadge}</Pill> : null}
            </PillRow>
            <ButtonRow>
              <LinkButton href={backToListHref}>{copy.backToListAction}</LinkButton>
              {permissions.canManageLocalization ? (
                <LinkButton href={`/admin/localization?postId=${data.post.id}&locale=${data.selection.locale}`}>
                  {copy.localizationAction}
                </LinkButton>
              ) : null}
              <LinkButton href={data.post.publicPath}>{copy.publicPreviewAction}</LinkButton>
            </ButtonRow>
          </Card>
          <Card id="workflow">
            <CardTitle>{copy.workflowTitle}</CardTitle>
            <SmallText>{copy.workflowDescription}</SmallText>
            {notice ? <StatusBanner $tone={notice.kind}>{notice.message}</StatusBanner> : null}
            {nextEditorialActionLabel ? (
              <Button disabled={workflowState !== "idle"} onClick={handleAdvanceEditorialStage} type="button">
                {workflowState === "saving" ? copy.workflowWorking : nextEditorialActionLabel}
              </Button>
            ) : (
              <SmallText>{copy.noNextEditorialStage}</SmallText>
            )}
            <Field>
              <FieldLabel>{copy.scheduleAtLabel}</FieldLabel>
              <Input
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    scheduledPublishAt: toIsoDateTime(event.target.value),
                  }))
                }
                type="datetime-local"
                value={toLocalDateTimeInputValue(draft.scheduledPublishAt)}
              />
              <SmallText>{copy.scheduleHint}</SmallText>
            </Field>
            <ButtonRow>
              <Button
                disabled={!permissions.canSchedule || !draft.scheduledPublishAt || workflowState !== "idle"}
                onClick={() => handleStatusAction("schedule")}
                type="button"
              >
                {workflowState === "schedule" ? copy.scheduleWorking : copy.scheduleAction}
              </Button>
              <Button
                $tone="secondary"
                disabled={!permissions.canPublish || workflowState !== "idle"}
                onClick={() => handleStatusAction("publish")}
                type="button"
              >
                {workflowState === "publish" ? copy.publishWorking : copy.publishAction}
              </Button>
              {data.post.status === "SCHEDULED" ? (
                <Button
                  $tone="secondary"
                  disabled={workflowState !== "idle"}
                  onClick={() => handleStatusAction("draft")}
                  type="button"
                >
                  {workflowState === "draft" ? copy.returnToDraftWorking : copy.returnToDraftAction}
                </Button>
              ) : null}
              <Button
                $tone="danger"
                disabled={!permissions.canArchive || workflowState !== "idle"}
                onClick={() => handleStatusAction("archive")}
                type="button"
              >
                {workflowState === "archive" ? copy.archiveWorking : copy.archiveAction}
              </Button>
            </ButtonRow>
            {!permissions.canPublish ? <SmallText>{copy.publishPermissionHint}</SmallText> : null}
            {!permissions.canSchedule ? <SmallText>{copy.schedulePermissionHint}</SmallText> : null}
            {!permissions.canArchive ? <SmallText>{copy.archivePermissionHint}</SmallText> : null}
          </Card>
          <Card>
            <CardTitle>{copy.settingsTitle}</CardTitle>
            <SmallText>{copy.settingsDescription}</SmallText>
            <Form onSubmit={handleSaveSettings}>
              <Field>
                <FieldLabel>{copy.slugLabel}</FieldLabel>
                <Input
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      slug: event.target.value,
                    }))
                  }
                  value={draft.slug}
                />
                <SmallText>{copy.slugHint}</SmallText>
              </Field>
              <div>
                <FieldLabel>{copy.categoriesLabel}</FieldLabel>
                <SmallText>{copy.categoriesHint}</SmallText>
              </div>
              {data.categories.length ? (
                <CategoryGrid>
                  {data.categories.map((category) => {
                    const isSelected = draft.categoryIds.includes(category.id);

                    return (
                      <CategoryCard key={category.id} $selected={isSelected}>
                        <ButtonRow>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleCategoryToggle(category.id)}
                            type="checkbox"
                          />
                          <strong>{category.name}</strong>
                        </ButtonRow>
                        <SmallText>{category.slug}</SmallText>
                        <SmallText>
                          {copy.categoryPostCountLabel.replace("{count}", `${category.postCount}`)}
                        </SmallText>
                      </CategoryCard>
                    );
                  })}
                </CategoryGrid>
              ) : (
                <SmallText>{copy.noCategories}</SmallText>
              )}
              <ActionRow>
                <SmallText>
                  {settingsState === "saving" ? copy.settingsSaveWorking : copy.settingsStatus}
                </SmallText>
                <Button disabled={settingsState === "saving"} type="submit">
                  {settingsState === "saving" ? copy.settingsSaveWorking : copy.settingsSaveAction}
                </Button>
              </ActionRow>
            </Form>
          </Card>
        </Stack>
        <Stack>
          <Card id="content">
            <CardTitle>{copy.contentTitle}</CardTitle>
            <SmallText>{copy.contentDescription}</SmallText>
            <Form onSubmit={handleSaveContent}>
              <FieldGrid>
                <Field>
                  <FieldLabel>{copy.fieldTitle}</FieldLabel>
                  <Input
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        title: event.target.value,
                      }))
                    }
                    value={draft.title}
                  />
                </Field>
                <Field>
                  <FieldLabel>{copy.fieldExcerpt}</FieldLabel>
                  <Textarea
                    $rows={4}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        excerpt: event.target.value,
                      }))
                    }
                    value={draft.excerpt}
                  />
                </Field>
              </FieldGrid>
              <Field>
                <FieldLabel>{copy.fieldDisclaimer}</FieldLabel>
                <Textarea
                  $rows={6}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      disclaimer: event.target.value,
                    }))
                  }
                  value={draft.disclaimer}
                />
              </Field>
              <FieldGrid>
                <Field>
                  <FieldLabel>{copy.fieldMarkdown}</FieldLabel>
                  <Textarea
                    $rows={16}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        contentMd: event.target.value,
                      }))
                    }
                    value={draft.contentMd}
                  />
                </Field>
                <Field>
                  <FieldLabel>{copy.fieldHtml}</FieldLabel>
                  <Textarea
                    $rows={16}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        contentHtml: event.target.value,
                      }))
                    }
                    value={draft.contentHtml}
                  />
                </Field>
              </FieldGrid>
              <FieldGrid>
                <Field>
                  <FieldLabel>{copy.fieldStructuredContentJson}</FieldLabel>
                  <Textarea
                    $rows={12}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        structuredContentJsonText: event.target.value,
                      }))
                    }
                    value={draft.structuredContentJsonText}
                  />
                </Field>
                <Field>
                  <FieldLabel>{copy.fieldFaqJson}</FieldLabel>
                  <Textarea
                    $rows={12}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        faqJsonText: event.target.value,
                      }))
                    }
                    value={draft.faqJsonText}
                  />
                </Field>
              </FieldGrid>
              <ActionRow>
                <SmallText>{contentState === "saving" ? copy.contentSaveWorking : copy.contentStatus}</SmallText>
                <ButtonRow>
                  <Button
                    $tone="secondary"
                    disabled={contentState === "saving"}
                    onClick={handleSaveContentAndReview}
                    type="button"
                  >
                    {contentState === "saving" ? copy.contentSaveWorking : copy.saveAndReviewAction}
                  </Button>
                  <Button disabled={contentState === "saving"} type="submit">
                    {contentState === "saving" ? copy.contentSaveWorking : copy.contentSaveAction}
                  </Button>
                </ButtonRow>
              </ActionRow>
            </Form>
          </Card>
          <Card>
            <CardTitle>{copy.previewTitle}</CardTitle>
            <SmallText>{copy.previewDescription}</SmallText>
            <PreviewFrame>
              <PreviewHeader>
                <PillRow>
                  <Pill>{data.post.status}</Pill>
                  <Pill $tone="accent">{data.post.editorialStage}</Pill>
                </PillRow>
                <h3>{draft.title || copy.untitledLabel}</h3>
                <SmallText>{draft.excerpt || copy.noExcerpt}</SmallText>
              </PreviewHeader>
              <PreviewBody>
                <MetaGrid>
                  <MetaCard>
                    <MetaLabel>{copy.seoTitleLabel}</MetaLabel>
                    <SmallText>{data.seo.metaTitle || copy.notAvailable}</SmallText>
                  </MetaCard>
                  <MetaCard>
                    <MetaLabel>{copy.seoDescriptionLabel}</MetaLabel>
                    <SmallText>{data.seo.metaDescription || copy.notAvailable}</SmallText>
                  </MetaCard>
                </MetaGrid>
                <PreviewArticle
                  dangerouslySetInnerHTML={{ __html: sanitizeHtmlFragment(draft.contentHtml) }}
                />
              </PreviewBody>
            </PreviewFrame>
          </Card>
        </Stack>
      </Layout>
    </Page>
  );
}
