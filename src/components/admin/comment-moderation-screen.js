"use client";

import { startTransition, useEffect, useState } from "react";
import styled from "styled-components";

import SearchableSelect from "@/components/common/searchable-select";

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

function formatShortDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatusLabel(value) {
  return `${value || ""}`
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildSnapshotUrl({ commentId, page, query, status }) {
  const params = new URLSearchParams();

  if (commentId) {
    params.set("commentId", commentId);
  }

  if (page && Number(page) > 1) {
    params.set("page", `${page}`);
  }

  if (query) {
    params.set("query", query);
  }

  if (status) {
    params.set("status", status);
  }

  const suffix = params.toString();

  return suffix ? `/api/comments?${suffix}` : "/api/comments";
}

function statusTone(status) {
  if (status === "APPROVED") {
    return "success";
  }

  if (status === "SPAM" || status === "REJECTED") {
    return "danger";
  }

  return "neutral";
}

function getModerationStatusForAction(actionKind) {
  if (actionKind === "approve") {
    return "APPROVED";
  }

  if (actionKind === "reject") {
    return "REJECTED";
  }

  if (actionKind === "spam") {
    return "SPAM";
  }

  return "PENDING";
}

const Page = styled.main`
  display: grid;
  gap: clamp(0.9rem, 1.8vw, 1.15rem);
  margin: 0 auto;
  max-width: 1440px;
  padding: clamp(0.85rem, 1.6vw, 1.25rem);
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.2), transparent 40%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.12), rgba(16, 32, 51, 0.03));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: clamp(0.9rem, 1.8vw, 1.2rem);
`;

const Eyebrow = styled.p`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: clamp(1.5rem, 3vw, 1.95rem);
  line-height: 1.08;
  margin: 0;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.95rem;
  line-height: 1.55;
  margin: 0;
  max-width: 760px;
`;

const SummaryGrid = styled.section`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
`;

const SummaryCard = styled.section`
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 14px 32px rgba(16, 32, 51, 0.07);
  display: grid;
  gap: 0.18rem;
  min-height: 0;
  padding: 0.88rem 1rem;
`;

const SummaryValue = styled.strong`
  font-size: clamp(1.55rem, 2.4vw, 1.9rem);
  line-height: 1;
`;

const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
`;

const SmallText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.94rem;
  line-height: 1.5;
  margin: 0;
  overflow-wrap: anywhere;
`;

const Layout = styled.section`
  align-items: start;
  display: grid;
  gap: 1rem;

  @media (min-width: 1160px) {
    grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
  }
`;

const Stack = styled.div`
  align-content: start;
  display: grid;
  gap: 1rem;
  min-width: 0;
`;

const Card = styled.section`
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 16px 42px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: 0.85rem;
  min-width: 0;
  overflow: hidden;
  padding: 1rem;
  position: relative;

  &::before {
    background: linear-gradient(90deg, rgba(0, 95, 115, 0.16), rgba(201, 123, 42, 0.12));
    content: "";
    height: 2px;
    inset: 0 0 auto;
    position: absolute;
  }
`;

const CardTitle = styled.h2`
  font-size: clamp(1rem, 1vw, 1.08rem);
  line-height: 1.18;
  margin: 0;
`;

const List = styled.div`
  display: grid;
  gap: 0.55rem;
  min-width: 0;
`;

const QueueHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  justify-content: space-between;
`;

const CountBadge = styled.span`
  align-items: center;
  background: rgba(0, 95, 115, 0.08);
  border: 1px solid rgba(0, 95, 115, 0.12);
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.primary};
  display: inline-flex;
  font-size: 0.76rem;
  font-weight: 800;
  min-height: 1.9rem;
  padding: 0 0.7rem;
  white-space: nowrap;
`;

const QueueList = styled.div`
  display: grid;
  gap: 0.55rem;
  max-height: min(62vh, 720px);
  overflow-y: auto;
  padding-right: 0.15rem;
`;

const ListButton = styled.button`
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(180deg, rgba(0, 95, 115, 0.12), rgba(0, 95, 115, 0.08))"
      : "rgba(255, 255, 255, 0.98)"};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: 16px;
  cursor: pointer;
  display: grid;
  gap: 0.45rem;
  min-width: 0;
  padding: 0.8rem 0.85rem;
  text-align: left;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 18px 34px rgba(16, 32, 51, 0.08);
    transform: translateY(-1px);
  }
`;

const ListHeader = styled.div`
  align-items: start;
  display: flex;
  gap: 0.7rem;
  justify-content: space-between;
`;

const ListTitle = styled.strong`
  font-size: 0.95rem;
  overflow-wrap: anywhere;
`;

const ListDate = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
`;

const ListExcerpt = styled.p`
  color: ${({ theme }) => theme.colors.text};
  display: -webkit-box;
  font-size: 0.9rem;
  line-height: 1.45;
  margin: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`;

const ListMeta = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.8rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Pill = styled.span`
  background: ${({ $tone, theme }) =>
    $tone === "success"
      ? "rgba(21, 115, 71, 0.14)"
      : $tone === "danger"
        ? "rgba(180, 35, 24, 0.12)"
        : "rgba(0, 95, 115, 0.12)"};
  border-radius: 999px;
  color: ${({ $tone, theme }) =>
    $tone === "success"
      ? theme.colors.success
      : $tone === "danger"
        ? theme.colors.danger
        : theme.colors.primary};
  display: inline-flex;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 0.26rem 0.58rem;
  text-transform: uppercase;
`;

const StatusBanner = styled.div`
  background: ${({ $tone }) =>
    $tone === "success" ? "rgba(21, 115, 71, 0.12)" : "rgba(180, 35, 24, 0.12)"};
  border: 1px solid
    ${({ $tone, theme }) => ($tone === "success" ? theme.colors.success : theme.colors.danger)};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 0.82rem 0.95rem;
  position: relative;

  &::before {
    background: ${({ $tone, theme }) => ($tone === "success" ? theme.colors.success : theme.colors.danger)};
    border-radius: 999px;
    content: "";
    inset: 0 auto 0 0;
    position: absolute;
    width: 4px;
  }
`;

const Form = styled.form`
  display: grid;
  gap: 0.75rem;
  min-width: 0;
`;

const FilterGrid = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
`;

const Field = styled.label`
  display: grid;
  gap: 0.35rem;
  min-width: 0;
`;

const FieldLabel = styled.span`
  font-size: 0.84rem;
  font-weight: 700;
`;

const Input = styled.input`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-width: 0;
  padding: 0.7rem 0.82rem;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
  width: 100%;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(0, 95, 115, 0.12);
    outline: none;
  }
`;

const Textarea = styled.textarea`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: 6.4rem;
  min-width: 0;
  padding: 0.76rem 0.82rem;
  resize: vertical;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
  width: 100%;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(0, 95, 115, 0.12);
    outline: none;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

const Pager = styled.nav`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: space-between;
`;

const PagerSummary = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.84rem;
  line-height: 1.45;
  margin: 0;
`;

const PagerActions = styled.div`
  display: flex;
  gap: 0.6rem;
`;

const PrimaryButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 999px;
  color: white;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font: inherit;
  font-weight: 700;
  min-height: 38px;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.62rem 1rem;
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    box-shadow: ${({ disabled }) =>
      disabled ? "none" : "0 16px 28px rgba(0, 95, 115, 0.22)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

const SecondaryButton = styled.button`
  background: rgba(247, 249, 252, 0.96);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  min-height: 38px;
  padding: 0.62rem 0.95rem;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 14px 28px rgba(16, 32, 51, 0.08);
    transform: translateY(-1px);
  }
`;

const DangerButton = styled(PrimaryButton)`
  background: ${({ theme }) => theme.colors.danger};
`;

const MetaGrid = styled.dl`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11.5rem), 1fr));
`;

const MetaItem = styled.div`
  display: grid;
  gap: 0.28rem;
`;

const MetaTerm = styled.dt`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin: 0;
  text-transform: uppercase;
`;

const MetaValue = styled.dd`
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const DetailHeader = styled.div`
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
`;

const DetailIdentity = styled.div`
  display: grid;
  gap: 0.18rem;
`;

const DetailName = styled.strong`
  font-size: 1rem;
  line-height: 1.2;
`;

const ContentGrid = styled.div`
  display: grid;
  gap: 0.75rem;

  @media (min-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const ContentCard = styled.div`
  background: rgba(247, 249, 252, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  display: grid;
  gap: 0.4rem;
  padding: 0.85rem 0.9rem;
`;

const ContentLabel = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const ContentText = styled.p`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.92rem;
  line-height: 1.5;
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const ReplyList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const ReplyChip = styled.span`
  align-items: center;
  background: rgba(0, 95, 115, 0.06);
  border: 1px solid rgba(0, 95, 115, 0.1);
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text};
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 600;
  min-height: 2rem;
  padding: 0 0.7rem;
`;

const EventList = styled.div`
  display: grid;
  gap: 0.6rem;
`;

const EventCard = styled.div`
  background: rgba(247, 249, 252, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: 0.25rem;
  padding: 0.82rem 0.92rem;
`;

const EventTitle = styled.strong`
  font-size: 0.9rem;
`;

const StatusActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
`;

const ModerationButton = styled.button`
  background: ${({ $tone, theme }) =>
    $tone === "success"
      ? theme.colors.success
      : $tone === "danger"
        ? theme.colors.danger
        : $tone === "warning"
          ? "#a16207"
          : theme.colors.primary};
  border: none;
  border-radius: 999px;
  color: white;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font: inherit;
  font-weight: 700;
  min-height: 38px;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.6rem 0.92rem;
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    box-shadow: ${({ disabled }) =>
      disabled ? "none" : "0 16px 28px rgba(16, 32, 51, 0.14)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

const StickyCard = styled(Card)`
  @media (min-width: 1160px) {
    position: sticky;
    top: 0.8rem;
  }
`;

export default function CommentModerationScreen({ copy, initialData }) {
  const resolvedCopy = {
    actionErrorPrefix: "Unable to update comment moderation",
    actionWorking: "Saving moderation update...",
    allStatusLabel: "All statuses",
    approveAction: "Approve",
    approveSuccess: "Comment approved.",
    approvedCountLabel: "Approved",
    description:
      "Review guest comments, filter the moderation queue, and keep action history visible for every decision.",
    detailDescription:
      "The selected comment shows its current status, related post, reply context, and moderation history.",
    detailTitle: "Comment details",
    emailLabel: "Email",
    emptyState: "No comments match the current filter.",
    eyebrow: "Comments moderation",
    filteredCountLabel: "In view",
    historyEmpty: "No moderation events are recorded for this comment yet.",
    historyTitle: "Moderation history",
    listDescription:
      "Filter the queue by status or search by commenter, body text, email, or post title.",
    listTitle: "Moderation queue",
    loadErrorPrefix: "Unable to load comments moderation data",
    moderationNotesHint:
      "Notes stay attached to the moderation event so future reviewers can see why a decision was made.",
    moderationNotesLabel: "Moderation notes",
    noSelection:
      "Select a comment from the moderation queue to inspect its history and take action.",
    pendingCountLabel: "Pending",
    postLabel: "Post",
    queryLabel: "Search comments",
    queryPlaceholder: "Search by commenter, body, email, or post",
    rejectAction: "Reject",
    rejectSuccess: "Comment rejected.",
    rejectedCountLabel: "Rejected",
    removeAction: "Remove",
    removeConfirmation:
      "Remove this comment from public display and record the moderation action?",
    removeSuccess: "Comment removed from public display.",
    replyContextLabel: "Reply context",
    replyTypeLabel: "Reply",
    resetFiltersAction: "Reset filters",
    searchAction: "Apply filters",
    spamAction: "Mark as spam",
    spamCountLabel: "Spam",
    spamSuccess: "Comment marked as spam.",
    statusFilterLabel: "Status filter",
    submittedAtLabel: "Submitted",
    title: "Moderate comments",
    topLevelTypeLabel: "Top-level",
    totalCountLabel: "Total comments",
    typeLabel: "Comment type",
    updatedAtLabel: "Updated",
    userAgentLabel: "User agent",
    ...copy,
  };
  const [data, setData] = useState(initialData);
  const [queryDraft, setQueryDraft] = useState(initialData.filters.query || "");
  const [statusDraft, setStatusDraft] = useState(initialData.filters.status || "PENDING");
  const [notesDraft, setNotesDraft] = useState("");
  const [notice, setNotice] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const statusOptions = [
    { label: resolvedCopy.allStatusLabel, value: "ALL" },
    { label: resolvedCopy.pendingCountLabel, value: "PENDING" },
    { label: resolvedCopy.approvedCountLabel, value: "APPROVED" },
    { label: resolvedCopy.rejectedCountLabel, value: "REJECTED" },
    { label: resolvedCopy.spamCountLabel, value: "SPAM" },
  ];

  useEffect(() => {
    setNotesDraft("");
  }, [data.selection.commentId]);

  async function loadSnapshot({
    commentId = data.selection.commentId,
    page = data.pagination?.currentPage || 1,
    query = queryDraft,
    status = statusDraft,
  } = {}) {
    setIsBusy(true);
    setNotice(null);

    try {
      const response = await fetch(
        buildSnapshotUrl({
          commentId,
          page,
          query,
          status,
        }),
        {
          cache: "no-store",
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || resolvedCopy.loadErrorPrefix);
      }

      startTransition(() => {
        setData(payload.data);
        setQueryDraft(payload.data.filters.query || "");
        setStatusDraft(payload.data.filters.status || "PENDING");
      });
      return true;
    } catch (error) {
      setNotice({
        message: `${resolvedCopy.loadErrorPrefix}: ${error.message}`,
        tone: "error",
      });
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSubmitFilters(event) {
    event.preventDefault();
    await loadSnapshot({
      commentId: data.selection.commentId,
      page: 1,
      query: queryDraft,
      status: statusDraft,
    });
  }

  async function handleResetFilters() {
    setQueryDraft("");
    setStatusDraft("PENDING");
    await loadSnapshot({
      commentId: null,
      page: 1,
      query: "",
      status: "PENDING",
    });
  }

  async function handleSelectComment(commentId) {
    await loadSnapshot({
      commentId,
      page: data.pagination?.currentPage || 1,
      query: queryDraft,
      status: statusDraft,
    });
  }

  async function handleAction(actionKind) {
    const selectedComment = data.editor.comment;

    if (!selectedComment) {
      return;
    }

    if (
      actionKind === "remove" &&
      !window.confirm(resolvedCopy.removeConfirmation)
    ) {
      return;
    }

    const requestInit =
      actionKind === "remove"
        ? {
            body: JSON.stringify({
              notes: notesDraft,
            }),
            headers: {
              "content-type": "application/json",
            },
            method: "DELETE",
          }
        : {
            body: JSON.stringify({
              moderationStatus: getModerationStatusForAction(actionKind),
              notes: notesDraft,
            }),
            headers: {
              "content-type": "application/json",
            },
            method: "PATCH",
          };

    setIsBusy(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/comments/${selectedComment.id}`, requestInit);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || resolvedCopy.actionErrorPrefix);
      }

      const didReload = await loadSnapshot({
        commentId: selectedComment.id,
        page: data.pagination?.currentPage || 1,
        query: queryDraft,
        status: statusDraft,
      });

      if (!didReload) {
        return;
      }

      setNotice({
        message:
          actionKind === "approve"
            ? resolvedCopy.approveSuccess
            : actionKind === "reject"
              ? resolvedCopy.rejectSuccess
              : actionKind === "spam"
                ? resolvedCopy.spamSuccess
                : resolvedCopy.removeSuccess,
        tone: "success",
      });
    } catch (error) {
      setNotice({
        message: `${resolvedCopy.actionErrorPrefix}: ${error.message}`,
        tone: "error",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Page>
      <Hero>
        <Eyebrow>{resolvedCopy.eyebrow}</Eyebrow>
        <Title>{resolvedCopy.title}</Title>
        <Description>{resolvedCopy.description}</Description>
      </Hero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{data.summary.totalCount}</SummaryValue>
          <SummaryLabel>{resolvedCopy.totalCountLabel}</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{data.summary.pendingCount}</SummaryValue>
          <SummaryLabel>{resolvedCopy.pendingCountLabel}</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{data.summary.approvedCount}</SummaryValue>
          <SummaryLabel>{resolvedCopy.approvedCountLabel}</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{data.summary.rejectedCount}</SummaryValue>
          <SummaryLabel>{resolvedCopy.rejectedCountLabel}</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{data.summary.spamCount}</SummaryValue>
          <SummaryLabel>{resolvedCopy.spamCountLabel}</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <Layout>
        <Stack>
          <StickyCard>
            <QueueHeader>
              <CardTitle>{resolvedCopy.listTitle}</CardTitle>
              <CountBadge>
                {resolvedCopy.filteredCountLabel}: {data.summary.filteredCount}
              </CountBadge>
            </QueueHeader>
            <SmallText>{resolvedCopy.listDescription}</SmallText>
            {notice ? <StatusBanner $tone={notice.tone}>{notice.message}</StatusBanner> : null}
            <Form onSubmit={handleSubmitFilters}>
              <FilterGrid>
                <Field>
                  <FieldLabel>{resolvedCopy.queryLabel}</FieldLabel>
                  <Input
                    onChange={(event) => setQueryDraft(event.target.value)}
                    placeholder={resolvedCopy.queryPlaceholder}
                    value={queryDraft}
                  />
                </Field>
                <Field as="div">
                  <FieldLabel>{resolvedCopy.statusFilterLabel}</FieldLabel>
                  <SearchableSelect
                    ariaLabel={resolvedCopy.statusFilterLabel}
                    onChange={(nextValue) => setStatusDraft(nextValue)}
                    options={statusOptions}
                    placeholder={resolvedCopy.statusFilterLabel}
                    searchPlaceholder="Search moderation statuses"
                    value={statusDraft}
                  />
                </Field>
              </FilterGrid>
              <ButtonRow>
                <PrimaryButton disabled={isBusy} type="submit">
                  {isBusy ? resolvedCopy.actionWorking : resolvedCopy.searchAction}
                </PrimaryButton>
                <SecondaryButton onClick={handleResetFilters} type="button">
                  {resolvedCopy.resetFiltersAction}
                </SecondaryButton>
              </ButtonRow>
            </Form>

            {data.comments.length ? (
              <>
                <QueueList>
                  {data.comments.map((comment) => (
                    <ListButton
                      key={comment.id}
                      onClick={() => handleSelectComment(comment.id)}
                      type="button"
                      $active={data.selection.commentId === comment.id}
                    >
                      <ListHeader>
                        <ListTitle>{comment.name}</ListTitle>
                        <ListDate>{formatShortDate(comment.createdAt)}</ListDate>
                      </ListHeader>
                      <BadgeRow>
                        <Pill $tone={statusTone(comment.status)}>
                          {formatStatusLabel(comment.status)}
                        </Pill>
                        <Pill>{comment.isReply ? resolvedCopy.replyTypeLabel : resolvedCopy.topLevelTypeLabel}</Pill>
                        {comment.repliesCount ? <Pill>{comment.repliesCount} replies</Pill> : null}
                        {comment.parentName ? <Pill>{comment.parentName}</Pill> : null}
                      </BadgeRow>
                      <ListExcerpt>{comment.bodyPreview}</ListExcerpt>
                      <ListMeta>{comment.post.title}</ListMeta>
                      {comment.latestEvent ? (
                        <ListMeta>
                          Last action: {comment.latestEvent.actionLabel} by {comment.latestEvent.actorName}
                        </ListMeta>
                      ) : null}
                    </ListButton>
                  ))}
                </QueueList>
                {data.pagination && data.pagination.totalItems > data.pagination.pageSize ? (
                  <Pager aria-label={resolvedCopy.paginationLabel || "Moderation queue pagination"}>
                    <PagerSummary>
                      {(resolvedCopy.paginationSummaryLabel || "{start}-{end} of {total} comments")
                        .replace("{start}", `${data.pagination.startItem}`)
                        .replace("{end}", `${data.pagination.endItem}`)
                        .replace("{total}", `${data.pagination.totalItems}`)}
                    </PagerSummary>
                    <PagerActions>
                      {data.pagination.hasPreviousPage ? (
                        <SecondaryButton
                          disabled={isBusy}
                          onClick={() =>
                            loadSnapshot({
                              commentId: null,
                              page: data.pagination.currentPage - 1,
                              query: queryDraft,
                              status: statusDraft,
                            })
                          }
                          type="button"
                        >
                          {resolvedCopy.previousPageAction || "Previous"}
                        </SecondaryButton>
                      ) : null}
                      {data.pagination.hasNextPage ? (
                        <SecondaryButton
                          disabled={isBusy}
                          onClick={() =>
                            loadSnapshot({
                              commentId: null,
                              page: data.pagination.currentPage + 1,
                              query: queryDraft,
                              status: statusDraft,
                            })
                          }
                          type="button"
                        >
                          {resolvedCopy.nextPageAction || "Next"}
                        </SecondaryButton>
                      ) : null}
                    </PagerActions>
                  </Pager>
                ) : null}
              </>
            ) : (
              <SmallText>{resolvedCopy.emptyState}</SmallText>
            )}
          </StickyCard>
        </Stack>

        <Stack>
          <Card>
            <DetailHeader>
              <CardTitle>{resolvedCopy.detailTitle}</CardTitle>
              {data.editor.comment ? (
                <Pill $tone={statusTone(data.editor.comment.status)}>
                  {formatStatusLabel(data.editor.comment.status)}
                </Pill>
              ) : null}
            </DetailHeader>
            <SmallText>{resolvedCopy.detailDescription}</SmallText>

            {data.editor.comment ? (
              <>
                <DetailHeader>
                  <DetailIdentity>
                    <DetailName>{data.editor.comment.name}</DetailName>
                    <SmallText>{data.editor.comment.email || "No email provided"}</SmallText>
                  </DetailIdentity>
                  <BadgeRow>
                    <Pill>
                      {data.editor.comment.parent
                        ? resolvedCopy.replyTypeLabel
                        : resolvedCopy.topLevelTypeLabel}
                    </Pill>
                    {data.editor.comment.replies.length ? (
                      <Pill>{data.editor.comment.replies.length} replies</Pill>
                    ) : null}
                  </BadgeRow>
                </DetailHeader>

                <MetaGrid>
                  <MetaItem>
                    <MetaTerm>{resolvedCopy.postLabel}</MetaTerm>
                    <MetaValue>{data.editor.comment.post.title}</MetaValue>
                  </MetaItem>
                  <MetaItem>
                    <MetaTerm>{resolvedCopy.typeLabel}</MetaTerm>
                    <MetaValue>
                      {data.editor.comment.parent
                        ? resolvedCopy.replyTypeLabel
                        : resolvedCopy.topLevelTypeLabel}
                    </MetaValue>
                  </MetaItem>
                  <MetaItem>
                    <MetaTerm>{resolvedCopy.emailLabel}</MetaTerm>
                    <MetaValue>{data.editor.comment.email || "N/A"}</MetaValue>
                  </MetaItem>
                  <MetaItem>
                    <MetaTerm>{resolvedCopy.submittedAtLabel}</MetaTerm>
                    <MetaValue>{formatDate(data.editor.comment.createdAt)}</MetaValue>
                  </MetaItem>
                  <MetaItem>
                    <MetaTerm>{resolvedCopy.updatedAtLabel}</MetaTerm>
                    <MetaValue>{formatDate(data.editor.comment.updatedAt)}</MetaValue>
                  </MetaItem>
                  <MetaItem>
                    <MetaTerm>{resolvedCopy.userAgentLabel}</MetaTerm>
                    <MetaValue>{data.editor.comment.userAgent || "N/A"}</MetaValue>
                  </MetaItem>
                </MetaGrid>

                <ContentGrid>
                  <ContentCard>
                    <ContentLabel>{resolvedCopy.commentBodyLabel || "Comment"}</ContentLabel>
                    <ContentText>{data.editor.comment.body}</ContentText>
                  </ContentCard>
                  {data.editor.comment.parent ? (
                    <ContentCard>
                      <ContentLabel>{resolvedCopy.replyContextLabel}</ContentLabel>
                      <ContentText>{data.editor.comment.parent.body}</ContentText>
                    </ContentCard>
                  ) : null}
                </ContentGrid>

                {data.editor.comment.replies.length ? (
                  <ContentCard>
                    <ContentLabel>Replies on this comment</ContentLabel>
                    <ReplyList>
                      {data.editor.comment.replies.map((reply) => (
                        <ReplyChip key={reply.id}>
                          {reply.name} · {formatStatusLabel(reply.status)}
                        </ReplyChip>
                      ))}
                    </ReplyList>
                  </ContentCard>
                ) : null}

                <Field>
                  <FieldLabel>{resolvedCopy.moderationNotesLabel}</FieldLabel>
                  <Textarea
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder={resolvedCopy.moderationNotesHint}
                    value={notesDraft}
                  />
                </Field>

                <StatusActions>
                  <ModerationButton
                    disabled={isBusy}
                    onClick={() => handleAction("approve")}
                    type="button"
                    $tone="success"
                  >
                    {resolvedCopy.approveAction}
                  </ModerationButton>
                  <ModerationButton
                    disabled={isBusy}
                    onClick={() => handleAction("reject")}
                    type="button"
                    $tone="danger"
                  >
                    {resolvedCopy.rejectAction}
                  </ModerationButton>
                  <ModerationButton
                    disabled={isBusy}
                    onClick={() => handleAction("spam")}
                    type="button"
                    $tone="warning"
                  >
                    {resolvedCopy.spamAction}
                  </ModerationButton>
                  <DangerButton
                    disabled={isBusy}
                    onClick={() => handleAction("remove")}
                    type="button"
                  >
                    {resolvedCopy.removeAction}
                  </DangerButton>
                </StatusActions>
              </>
            ) : (
              <SmallText>{resolvedCopy.noSelection}</SmallText>
            )}
          </Card>

          <Card>
            <CardTitle>{resolvedCopy.historyTitle}</CardTitle>
            <SmallText>
              Every moderation action keeps its actor, timestamp, and reviewer notes attached to the
              comment.
            </SmallText>
            {data.editor.comment?.moderationEvents.length ? (
              <EventList>
                {data.editor.comment.moderationEvents.map((event) => (
                  <EventCard key={event.id}>
                    <DetailHeader>
                      <EventTitle>{event.actionLabel}</EventTitle>
                      <ListDate>{formatDate(event.createdAt)}</ListDate>
                    </DetailHeader>
                    <SmallText>{event.actorName}</SmallText>
                    {event.notes ? <SmallText>{event.notes}</SmallText> : null}
                  </EventCard>
                ))}
              </EventList>
            ) : (
              <SmallText>{resolvedCopy.historyEmpty}</SmallText>
            )}
          </Card>
        </Stack>
      </Layout>
    </Page>
  );
}
