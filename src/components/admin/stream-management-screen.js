"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";

import {
  ButtonRow,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  MetaPill,
  PrimaryButton,
  RecordCard,
  RecordHeader,
  RecordMeta,
  RecordStack,
  RecordTitle,
  RecordTitleBlock,
  SectionGrid,
  SmallText,
  StatusBadge,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import AdminFormModal from "@/components/admin/admin-form-modal";
import StreamFormCard from "@/components/admin/stream-form-card";

const TargetingCard = styled.section`
  background:
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.14), transparent 32%),
    radial-gradient(circle at 12% 18%, rgba(224, 165, 58, 0.08), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(244, 249, 253, 0.975));
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 22px;
  box-shadow:
    0 20px 44px rgba(17, 31, 55, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  display: grid;
  gap: 0.85rem;
  overflow: hidden;
  padding: clamp(0.85rem, 2vw, 1.05rem);
`;

const TargetingLayout = styled.div`
  display: grid;
  gap: 1rem;

  @media (min-width: 980px) {
    align-items: start;
    grid-template-columns: minmax(0, 1.2fr) minmax(330px, 0.82fr);
  }
`;

const TargetingCopy = styled.div`
  display: grid;
  align-content: start;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.42)),
    radial-gradient(circle at top left, rgba(15, 111, 141, 0.06), transparent 38%);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 20px;
  gap: 0.45rem;
  padding: clamp(0.85rem, 2vw, 1rem);
`;

const TargetingEyebrow = styled.span`
  color: #0f5f79;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const TargetingTitle = styled.h2`
  color: #162744;
  font-size: clamp(1rem, 2.2vw, 1.4rem);
  letter-spacing: -0.045em;
  line-height: 1.1;
  margin: 0;
`;

const ActionRow = styled.div`
  align-items: center;
  display: grid;
  gap: 0.65rem;

  @media (min-width: 860px) {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto;
  }
`;

const TargetSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const SummaryPill = styled.span`
  align-items: center;
  background:
    ${({ $tone }) =>
      $tone === "accent"
        ? "linear-gradient(180deg, rgba(15, 111, 141, 0.12), rgba(13, 95, 121, 0.08))"
        : "rgba(255, 255, 255, 0.84)"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "accent"
        ? "rgba(15, 111, 141, 0.16)"
        : "rgba(16, 32, 51, 0.08)"};
  border-radius: 999px;
  color: ${({ $tone }) => ($tone === "accent" ? "#0d5f79" : "#30435f")};
  display: inline-flex;
  font-size: 0.7rem;
  font-weight: 800;
  gap: 0.42rem;
  min-height: 34px;
  padding: 0 0.72rem;
`;

const PrimaryActionButton = styled.button`
  align-items: center;
  background:
    radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.16), transparent 34%),
    linear-gradient(135deg, #0f6f8d 0%, #0d5f79 100%);
  border: 1px solid transparent;
  border-radius: 999px;
  box-shadow:
    0 16px 30px rgba(15, 96, 121, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  color: white;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  display: inline-flex;
  font-size: 0.8rem;
  font-weight: 800;
  gap: 0.5rem;
  min-height: 42px;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0 1rem;
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    box-shadow: ${({ disabled }) =>
      disabled ? "0 12px 24px rgba(15, 96, 121, 0.18)" : "0 16px 30px rgba(15, 96, 121, 0.22)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

const RunActionForm = styled.div`
  display: inline-flex;
`;

const pulseBar = keyframes`
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 200% 50%;
  }
`;

const ProgressOverlay = styled.div`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(11, 17, 28, 0.56), rgba(11, 17, 28, 0.7)),
    radial-gradient(circle at top, rgba(15, 111, 141, 0.16), transparent 42%);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 1rem;
  position: fixed;
  z-index: 1400;
`;

const ProgressSurface = styled.section`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.996), rgba(246, 250, 255, 0.99)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.1), transparent 34%);
  border: 1px solid rgba(16, 32, 51, 0.09);
  border-radius: clamp(20px, 3vw, 28px);
  box-shadow:
    0 32px 72px rgba(11, 18, 30, 0.24),
    0 12px 28px rgba(16, 32, 51, 0.1);
  display: grid;
  gap: 1rem;
  max-height: min(88dvh, 52rem);
  overflow: hidden;
  padding: clamp(1rem, 2vw, 1.25rem);
  width: min(94vw, 44rem);
`;

const ProgressHeader = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const ProgressEyebrow = styled.span`
  color: #0f5f79;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const ProgressTitle = styled.h3`
  color: #162744;
  font-size: clamp(1.1rem, 2.4vw, 1.45rem);
  letter-spacing: -0.04em;
  line-height: 1.08;
  margin: 0;
`;

const ProgressDescription = styled.p`
  color: rgba(72, 85, 108, 0.94);
  font-size: 0.84rem;
  line-height: 1.5;
  margin: 0;
`;

const ProgressTrackFrame = styled.div`
  display: grid;
  gap: 0.45rem;
`;

const ProgressMetaRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: space-between;
`;

const ProgressMetaText = styled.span`
  color: #22344f;
  font-size: 0.76rem;
  font-weight: 800;
`;

const ProgressTrack = styled.div`
  background: rgba(36, 75, 115, 0.1);
  border-radius: 999px;
  height: 0.78rem;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  animation: ${({ $animated }) => ($animated ? pulseBar : "none")} 1.4s linear infinite;
  background:
    linear-gradient(90deg, rgba(15, 111, 141, 0.96), rgba(224, 165, 58, 0.88), rgba(15, 111, 141, 0.96));
  background-size: 200% 100%;
  border-radius: inherit;
  height: 100%;
  transition: width 220ms ease;
  width: ${({ $progress }) => `${$progress}%`};
`;

const ProgressSummaryGrid = styled.div`
  display: grid;
  gap: 0.6rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const ProgressSummaryCard = styled.div`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.92)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.05), transparent 52%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 16px;
  display: grid;
  gap: 0.18rem;
  padding: 0.75rem 0.8rem;
`;

const ProgressSummaryValue = styled.strong`
  color: #132949;
  font-size: 1.08rem;
  letter-spacing: -0.03em;
`;

const ProgressSummaryLabel = styled.span`
  color: rgba(73, 87, 112, 0.82);
  font-size: 0.74rem;
  line-height: 1.4;
`;

const ProgressList = styled.div`
  display: grid;
  gap: 0.55rem;
  max-height: min(34dvh, 18rem);
  overflow-y: auto;
  padding-right: 0.2rem;
  scrollbar-color: rgba(36, 75, 115, 0.26) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(36, 75, 115, 0.26);
    border: 3px solid transparent;
    border-radius: 999px;
    background-clip: padding-box;
  }
`;

const ProgressItem = styled.article`
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(255, 255, 255, 0.95)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.05), transparent 44%);
  border: 1px solid
    ${({ $tone }) =>
      $tone === "running"
        ? "rgba(15, 111, 141, 0.2)"
        : $tone === "failed"
          ? "rgba(179, 46, 46, 0.18)"
          : "rgba(16, 32, 51, 0.08)"};
  border-radius: 16px;
  box-shadow: ${({ $tone }) =>
    $tone === "running" ? "0 14px 28px rgba(15, 96, 121, 0.08)" : "0 10px 20px rgba(18, 34, 58, 0.04)"};
  display: grid;
  gap: 0.35rem;
  padding: 0.8rem 0.9rem;
`;

const ProgressItemHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 0.45rem;
  justify-content: space-between;
`;

const ProgressItemTitleBlock = styled.div`
  display: grid;
  gap: 0.16rem;
  min-width: 0;
`;

const ProgressItemTitle = styled.strong`
  color: #172844;
  font-size: 0.88rem;
  letter-spacing: -0.02em;
`;

const ProgressItemMeta = styled.span`
  color: rgba(73, 87, 112, 0.82);
  font-size: 0.72rem;
  line-height: 1.4;
`;

const ProgressItemStatus = styled.span`
  align-items: center;
  background: ${({ $tone }) =>
    $tone === "running"
      ? "rgba(15, 111, 141, 0.12)"
      : $tone === "success"
        ? "rgba(39, 111, 74, 0.12)"
        : $tone === "failed"
          ? "rgba(179, 46, 46, 0.12)"
          : "rgba(36, 75, 115, 0.08)"};
  border: 1px solid ${({ $tone }) =>
    $tone === "running"
      ? "rgba(15, 111, 141, 0.16)"
      : $tone === "success"
        ? "rgba(39, 111, 74, 0.16)"
        : $tone === "failed"
          ? "rgba(179, 46, 46, 0.16)"
          : "rgba(36, 75, 115, 0.12)"};
  border-radius: 999px;
  color: ${({ $tone }) =>
    $tone === "running" ? "#0d5f79" : $tone === "success" ? "#276f4a" : $tone === "failed" ? "#9f2626" : "#244b73"};
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.68rem;
  font-weight: 800;
  min-height: 24px;
  padding: 0 0.55rem;
  text-transform: uppercase;
`;

const ProgressItemText = styled.p`
  color: rgba(72, 85, 108, 0.94);
  font-size: 0.78rem;
  line-height: 1.5;
  margin: 0;
`;

const ProgressFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const ScopeHeader = styled.div`
  align-items: start;
  display: grid;
  background:
    linear-gradient(180deg, rgba(245, 249, 253, 0.85), rgba(255, 255, 255, 0.72)),
    radial-gradient(circle at top left, rgba(15, 111, 141, 0.05), transparent 44%);
  border: 1px solid rgba(16, 32, 51, 0.06);
  border-radius: 18px;
  gap: 0.7rem;
  padding: 0.72rem;
`;

const ScopeRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const ScopeActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const ScopeActionsBar = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: space-between;
`;

const ScopeActionButton = styled.button`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.92)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.05), transparent 52%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 999px;
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 800;
  min-height: 34px;
  padding: 0 0.76rem;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: rgba(15, 111, 141, 0.18);
    transform: translateY(-1px);
  }
`;

const ScopeCheckbox = styled.label`
  align-items: center;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, #0f6f8d 0%, #0d5f79 100%)"
      : "rgba(255, 255, 255, 0.92)"};
  border: 1px solid ${({ $active }) => ($active ? "transparent" : "rgba(16, 32, 51, 0.09)")};
  border-radius: 999px;
  box-shadow: ${({ $active }) =>
    $active ? "0 12px 24px rgba(15, 96, 121, 0.16)" : "0 8px 18px rgba(18, 34, 58, 0.04)"};
  color: ${({ $active }) => ($active ? "white" : "#22344f")};
  cursor: pointer;
  display: inline-flex;
  font-size: 0.8rem;
  font-weight: 800;
  gap: 0.55rem;
  min-height: 44px;
  padding: 0 0.95rem;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  @media (max-width: 639px) {
    width: 100%;
  }

  &:hover {
    transform: translateY(-1px);
  }

  input {
    accent-color: white;
    margin: 0;
    transform: scale(1.08);
  }
`;

const ScopeCount = styled.span`
  align-items: center;
  background: ${({ $active }) =>
    $active ? "rgba(255, 255, 255, 0.16)" : "rgba(36, 75, 115, 0.08)"};
  border: 1px solid ${({ $active }) =>
    $active ? "rgba(255, 255, 255, 0.16)" : "rgba(36, 75, 115, 0.12)"};
  border-radius: 999px;
  color: inherit;
  display: inline-flex;
  font-size: 0.68rem;
  font-weight: 800;
  min-height: 24px;
  padding: 0 0.5rem;
`;

const TargetingNotes = styled.div`
  display: grid;
  align-content: start;
  gap: 0.55rem;
`;

const NoteCard = styled.div`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.92)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.06), transparent 56%);
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: 16px;
  box-shadow: 0 10px 20px rgba(18, 34, 58, 0.04);
  display: grid;
  gap: 0.3rem;
  padding: 0.8rem 0.9rem;
`;

const NoteLabel = styled.strong`
  color: #162744;
  font-size: 0.84rem;
`;

const NoteText = styled.p`
  color: rgba(72, 85, 108, 0.92);
  font-size: 0.78rem;
  line-height: 1.45;
  margin: 0;
`;

const StreamsGrid = styled(SectionGrid)`
  @media (min-width: 1080px) {
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
  }
`;

const StickyCard = styled(Card)`
  align-self: start;
  overflow: hidden;

  @media (min-width: 1080px) {
    grid-template-rows: auto minmax(0, 1fr);
    max-height: calc(100vh - 6.7rem);
    position: sticky;
    top: 5.7rem;
  }
`;

const StickyHeader = styled(CardHeader)`
  @media (min-width: 1080px) {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 252, 255, 0.94)),
      radial-gradient(circle at top right, rgba(15, 111, 141, 0.06), transparent 52%);
    border-bottom: 1px solid rgba(16, 32, 51, 0.08);
    margin: calc(clamp(0.75rem, 2vw, 0.95rem) * -1) calc(clamp(0.75rem, 2vw, 0.95rem) * -1) 0;
    padding: clamp(0.75rem, 2vw, 0.95rem);
  }
`;

const StickyScrollArea = styled.div`
  min-height: 0;

  @media (min-width: 1080px) {
    margin-right: -0.2rem;
    overflow-y: auto;
    padding-right: 0.4rem;
    scrollbar-color: rgba(36, 75, 115, 0.26) transparent;
    scrollbar-width: thin;
  }

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(36, 75, 115, 0.26);
    border: 3px solid transparent;
    border-radius: 999px;
    background-clip: padding-box;
  }
`;

function getTone(status) {
  return status === "ACTIVE" ? "success" : "warning";
}

function getRunProgress(streamCount, completedCount, isRunning) {
  if (!streamCount) {
    return 0;
  }

  if (!isRunning) {
    return 100;
  }

  return Math.min(((completedCount + 0.45) / streamCount) * 100, 96);
}

function summarizeRunCounts(results) {
  return results.reduce(
    (summary, result) => {
      if (!result.run) {
        summary.failedRuns += 1;
        return summary;
      }

      summary.completedRuns += 1;
      summary.fetchedCount += Number(result.run.fetchedCount || 0);
      summary.publishedCount += Number(result.run.publishedCount || 0);
      summary.heldCount += Number(result.run.heldCount || 0);
      summary.skippedCount += Number(result.run.skippedCount || 0);
      summary.duplicateCount += Number(result.run.duplicateCount || 0);
      summary.failedPublishCount += Number(result.run.failedCount || 0);

      return summary;
    },
    {
      completedRuns: 0,
      duplicateCount: 0,
      failedPublishCount: 0,
      failedRuns: 0,
      fetchedCount: 0,
      heldCount: 0,
      publishedCount: 0,
      skippedCount: 0,
    },
  );
}

function describeCompletedRun(run) {
  const fragments = [];

  if (Number(run.fetchedCount || 0) > 0) {
    fragments.push(`${run.fetchedCount} fetched`);
  }

  if (Number(run.publishedCount || 0) > 0) {
    fragments.push(`${run.publishedCount} published`);
  }

  if (Number(run.heldCount || 0) > 0) {
    fragments.push(`${run.heldCount} held for review`);
  }

  if (Number(run.skippedCount || 0) > 0) {
    fragments.push(`${run.skippedCount} skipped`);
  }

  if (Number(run.duplicateCount || 0) > 0) {
    fragments.push(`${run.duplicateCount} duplicates`);
  }

  if (Number(run.failedCount || 0) > 0) {
    fragments.push(`${run.failedCount} publish failures`);
  }

  if (!fragments.length) {
    return "No new articles were processed during this run.";
  }

  return fragments.join(", ");
}

function getResultTone(result, activeStreamId) {
  if (result.error) {
    return "failed";
  }

  if (result.stream.id === activeStreamId) {
    return "running";
  }

  if (result.run) {
    return "success";
  }

  return "idle";
}

function getResultLabel(result, activeStreamId) {
  if (result.error) {
    return "Failed";
  }

  if (result.stream.id === activeStreamId) {
    return "Running";
  }

  if (result.run) {
    return "Done";
  }

  return "Queued";
}

function RunProgressModal({ runState, onClose }) {
  useEffect(() => {
    if (!runState || typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [runState]);

  if (!runState || typeof document === "undefined") {
    return null;
  }

  const isRunning = runState.phase === "running";
  const progress = getRunProgress(runState.totalCount, runState.completedCount, isRunning);
  const resultSummary = summarizeRunCounts(runState.results);
  const modalTitle = isRunning
    ? runState.totalCount === 1
      ? `Running ${runState.streams[0]?.name || "stream"}`
      : "Running selected streams"
    : resultSummary.failedRuns
      ? resultSummary.completedRuns
        ? "Stream run completed with issues"
        : "Stream run failed"
      : "Stream run completed";
  const modalDescription = isRunning
    ? runState.totalCount === 1
      ? "Please keep this window open while NewsPub fetches, filters, and publishes eligible stories."
      : "NewsPub is running each selected stream in sequence. This report will unlock when every run finishes."
    : resultSummary.failedRuns
      ? "Some streams could not finish. Review the brief report below before closing."
      : "Every requested stream finished. Review the brief report below, then close the modal when you are ready.";

  return createPortal(
    <ProgressOverlay>
      <ProgressSurface aria-busy={isRunning} aria-modal="true" role="dialog">
        <ProgressHeader>
          <ProgressEyebrow>{isRunning ? "Stream progress" : "Run report"}</ProgressEyebrow>
          <ProgressTitle>{modalTitle}</ProgressTitle>
          <ProgressDescription>{modalDescription}</ProgressDescription>
        </ProgressHeader>

        <ProgressTrackFrame>
          <ProgressMetaRow>
            <ProgressMetaText>
              {isRunning
                ? `Completed ${runState.completedCount} of ${runState.totalCount} stream${runState.totalCount === 1 ? "" : "s"}`
                : `${runState.results.length} stream${runState.results.length === 1 ? "" : "s"} processed`}
            </ProgressMetaText>
            <ProgressMetaText>{Math.round(progress)}%</ProgressMetaText>
          </ProgressMetaRow>
          <ProgressTrack aria-hidden="true">
            <ProgressFill $animated={isRunning} $progress={progress} />
          </ProgressTrack>
          {isRunning && runState.activeStreamName ? (
            <ProgressDescription>
              Working on <strong>{runState.activeStreamName}</strong>.
            </ProgressDescription>
          ) : null}
        </ProgressTrackFrame>

        {!isRunning ? (
          <ProgressSummaryGrid>
            <ProgressSummaryCard>
              <ProgressSummaryValue>{resultSummary.completedRuns}</ProgressSummaryValue>
              <ProgressSummaryLabel>Completed runs</ProgressSummaryLabel>
            </ProgressSummaryCard>
            <ProgressSummaryCard>
              <ProgressSummaryValue>{resultSummary.failedRuns}</ProgressSummaryValue>
              <ProgressSummaryLabel>Failed runs</ProgressSummaryLabel>
            </ProgressSummaryCard>
            <ProgressSummaryCard>
              <ProgressSummaryValue>{resultSummary.publishedCount}</ProgressSummaryValue>
              <ProgressSummaryLabel>Published stories</ProgressSummaryLabel>
            </ProgressSummaryCard>
            <ProgressSummaryCard>
              <ProgressSummaryValue>{resultSummary.heldCount}</ProgressSummaryValue>
              <ProgressSummaryLabel>Held for review</ProgressSummaryLabel>
            </ProgressSummaryCard>
            <ProgressSummaryCard>
              <ProgressSummaryValue>{resultSummary.skippedCount + resultSummary.duplicateCount}</ProgressSummaryValue>
              <ProgressSummaryLabel>Skipped or duplicate</ProgressSummaryLabel>
            </ProgressSummaryCard>
            <ProgressSummaryCard>
              <ProgressSummaryValue>{resultSummary.failedPublishCount}</ProgressSummaryValue>
              <ProgressSummaryLabel>Publish failures</ProgressSummaryLabel>
            </ProgressSummaryCard>
          </ProgressSummaryGrid>
        ) : null}

        <ProgressList>
          {runState.streams.map((stream) => {
            const result = runState.results.find((entry) => entry.stream.id === stream.id) || {
              stream,
            };
            const tone = getResultTone(result, runState.activeStreamId);

            return (
              <ProgressItem $tone={tone} key={stream.id}>
                <ProgressItemHeader>
                  <ProgressItemTitleBlock>
                    <ProgressItemTitle>{stream.name}</ProgressItemTitle>
                    <ProgressItemMeta>
                      {stream.destinationName || "Unknown destination"} via {stream.providerLabel || "Unknown provider"}
                    </ProgressItemMeta>
                  </ProgressItemTitleBlock>
                  <ProgressItemStatus $tone={tone === "idle" ? "idle" : tone}>
                    {getResultLabel(result, runState.activeStreamId)}
                  </ProgressItemStatus>
                </ProgressItemHeader>
                <ProgressItemText>
                  {result.error
                    ? result.error
                    : result.run
                      ? describeCompletedRun(result.run)
                      : "Waiting for this stream to start."}
                </ProgressItemText>
              </ProgressItem>
            );
          })}
        </ProgressList>

        <ProgressFooter>
          <PrimaryButton disabled={isRunning} onClick={onClose} type="button">
            Close report
          </PrimaryButton>
        </ProgressFooter>
      </ProgressSurface>
    </ProgressOverlay>,
    document.body,
  );
}

export default function StreamManagementScreen({
  categoryOptions,
  destinationOptions,
  modeOptions,
  providerOptions,
  saveStreamAction,
  statusOptions,
  streams,
  templateOptions,
}) {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState(() =>
    [...new Set(destinationOptions.map((destination) => destination.platform).filter(Boolean))].sort(),
  );
  const [runState, setRunState] = useState(null);
  const platformSummaries = useMemo(() => {
    const platformMap = new Map();

    for (const destination of destinationOptions) {
      if (!platformMap.has(destination.platform)) {
        platformMap.set(destination.platform, {
          destinationCount: 0,
          platform: destination.platform,
          streamCount: 0,
        });
      }

      platformMap.get(destination.platform).destinationCount += 1;
    }

    for (const stream of streams) {
      const platform = stream.destination?.platform;

      if (!platform) {
        continue;
      }

      if (!platformMap.has(platform)) {
        platformMap.set(platform, {
          destinationCount: 0,
          platform,
          streamCount: 0,
        });
      }

      platformMap.get(platform).streamCount += 1;
    }

    return [...platformMap.values()].sort((left, right) => left.platform.localeCompare(right.platform));
  }, [destinationOptions, streams]);

  const allPlatforms = useMemo(
    () => platformSummaries.map((platform) => platform.platform),
    [platformSummaries],
  );

  const selectedPlatformSet = useMemo(() => new Set(selectedPlatforms), [selectedPlatforms]);

  function togglePlatform(platform) {
    setSelectedPlatforms((currentPlatforms) =>
      currentPlatforms.includes(platform)
        ? currentPlatforms.filter((value) => value !== platform)
        : [...currentPlatforms, platform].sort(),
    );
  }

  const filteredDestinationOptions = useMemo(() => {
    return destinationOptions.filter((destination) => selectedPlatformSet.has(destination.platform));
  }, [destinationOptions, selectedPlatformSet]);

  const filteredStreams = useMemo(() => {
    return streams.filter((stream) => selectedPlatformSet.has(stream.destination?.platform));
  }, [selectedPlatformSet, streams]);

  const runnableStreams = useMemo(() => {
    return filteredStreams.filter((stream) => stream.status === "ACTIVE");
  }, [filteredStreams]);

  const visibleTemplateOptions = useMemo(() => {
    return templateOptions.filter(
      (template) => !template.value || selectedPlatformSet.has(template.platform),
    );
  }, [selectedPlatformSet, templateOptions]);

  const selectedLabel =
    selectedPlatforms.length === allPlatforms.length
      ? "all configured platforms"
      : selectedPlatforms.length
        ? selectedPlatforms.map((platform) => formatEnumLabel(platform)).join(", ")
        : "no platforms";
  const scopeDescription = selectedPlatforms.length
    ? `Create or review streams for ${selectedLabel}. Each destination keeps using its own saved platform settings.`
    : "Select at least one target platform to create or review streams.";
  const isRunInProgress = runState?.phase === "running";

  function closeRunReport() {
    if (isRunInProgress) {
      return;
    }

    setRunState(null);
    router.refresh();
  }

  async function executeStreamRun(stream) {
    const response = await fetch("/api/streams/run", {
      body: JSON.stringify({
        streamId: stream.id,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.message || `Could not run ${stream.name}.`);
    }

    return payload?.data?.run || null;
  }

  async function handleRunStreams(streamBatch) {
    if (!streamBatch.length || isRunInProgress) {
      return;
    }

    setRunState({
      activeStreamId: streamBatch[0].id,
      activeStreamName: streamBatch[0].name,
      completedCount: 0,
      phase: "running",
      results: [],
      streams: streamBatch.map((stream) => ({
        destinationName: stream.destination?.name || "Unknown destination",
        id: stream.id,
        name: stream.name,
        providerLabel: stream.activeProvider?.label || "Unknown provider",
      })),
      totalCount: streamBatch.length,
    });

    const results = [];

    for (const stream of streamBatch) {
      setRunState((currentState) => ({
        ...currentState,
        activeStreamId: stream.id,
        activeStreamName: stream.name,
      }));

      try {
        const run = await executeStreamRun(stream);
        results.push({
          run,
          stream,
        });
      } catch (error) {
        results.push({
          error: error instanceof Error ? error.message : "Stream execution failed.",
          stream,
        });
      }

      setRunState((currentState) => ({
        ...currentState,
        completedCount: results.length,
        results: [...results],
      }));
    }

    setRunState((currentState) => ({
      ...currentState,
      activeStreamId: null,
      activeStreamName: null,
      completedCount: results.length,
      phase: "complete",
      results,
    }));
  }

  function handleRunSelected() {
    void handleRunStreams(runnableStreams);
  }

  function handleRunNow(stream) {
    if (!stream) {
      return;
    }

    void handleRunStreams([stream]);
  }

  return (
    <>
      <TargetingCard>
        <TargetingLayout>
          <TargetingCopy>
            <TargetingEyebrow>Target platforms</TargetingEyebrow>
            <TargetingTitle>Choose the platforms you want this stream workflow to target.</TargetingTitle>
            <SmallText>{scopeDescription}</SmallText>
            <ActionRow>
              <TargetSummary>
                <SummaryPill $tone="accent">
                  {selectedPlatforms.length} selected
                </SummaryPill>
                <SummaryPill>
                  {filteredDestinationOptions.length} destinations in scope
                </SummaryPill>
                <SummaryPill>
                  {runnableStreams.length} runnable streams
                </SummaryPill>
              </TargetSummary>
              <ScopeActions>
                <RunActionForm>
                  <PrimaryActionButton
                    disabled={!runnableStreams.length || isRunInProgress}
                    onClick={handleRunSelected}
                    type="button"
                  >
                    Run selected
                    <ScopeCount $active>{runnableStreams.length}</ScopeCount>
                  </PrimaryActionButton>
                </RunActionForm>
              </ScopeActions>
            </ActionRow>
            <ScopeHeader>
              <ScopeActionsBar>
                <ScopeActions>
                  <ScopeActionButton onClick={() => setSelectedPlatforms(allPlatforms)} type="button">
                    Select all
                  </ScopeActionButton>
                  <ScopeActionButton onClick={() => setSelectedPlatforms([])} type="button">
                    Deselect all
                  </ScopeActionButton>
                </ScopeActions>
                <SmallText>
                  {selectedPlatforms.length} of {allPlatforms.length} platforms selected
                </SmallText>
              </ScopeActionsBar>
              <ScopeRail>
                {platformSummaries.map((platform) => {
                  const isActive = selectedPlatformSet.has(platform.platform);

                  return (
                    <ScopeCheckbox $active={isActive} key={platform.platform}>
                      <input
                        checked={isActive}
                        onChange={() => togglePlatform(platform.platform)}
                        type="checkbox"
                      />
                      {formatEnumLabel(platform.platform)}
                      <ScopeCount $active={isActive}>{platform.streamCount}</ScopeCount>
                    </ScopeCheckbox>
                  );
                })}
              </ScopeRail>
            </ScopeHeader>
          </TargetingCopy>

          <TargetingNotes>
            <NoteCard>
              <NoteLabel>Active scope</NoteLabel>
              <NoteText>
                {selectedPlatforms.length
                  ? `${filteredDestinationOptions.length} destinations are available across ${selectedPlatforms.length} selected platform${selectedPlatforms.length === 1 ? "" : "s"}.`
                  : "No platforms are selected yet."}
              </NoteText>
            </NoteCard>
            <NoteCard>
              <NoteLabel>How settings apply</NoteLabel>
              <NoteText>
                Destination, template, and publishing behavior continue to use the platform-specific settings already saved for each target.
              </NoteText>
            </NoteCard>
          </TargetingNotes>
        </TargetingLayout>
      </TargetingCard>

      <StreamsGrid $wide>
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedPlatforms.length === allPlatforms.length
                ? "Configured streams"
                : selectedPlatforms.length === 1
                  ? `${formatEnumLabel(selectedPlatforms[0])} streams`
                  : "Selected platform streams"}
            </CardTitle>
            <CardDescription>
              {selectedPlatforms.length
                ? "Keep each stream small, readable, and tunable from a phone without losing control."
                : "Pick one or more platforms above to load matching streams."}
            </CardDescription>
          </CardHeader>
          <RecordStack>
            {filteredStreams.length ? (
              filteredStreams.map((stream) => (
                <RecordCard key={stream.id}>
                <RecordHeader>
                  <RecordTitleBlock>
                      <RecordTitle>{stream.name}</RecordTitle>
                      <SmallText>
                        {stream.destination?.name || "Unknown destination"} via {stream.activeProvider?.label || "Unknown provider"}
                      </SmallText>
                    </RecordTitleBlock>
                    <RecordMeta>
                      <MetaPill>{formatEnumLabel(stream.destination?.platform || "UNKNOWN")}</MetaPill>
                      <MetaPill>{formatEnumLabel(stream.mode)}</MetaPill>
                      <StatusBadge $tone={getTone(stream.status)}>{stream.status}</StatusBadge>
                    </RecordMeta>
                  </RecordHeader>
                  <SmallText>
                    Scheduling, targeting rules, provider filters, and template selection now open in a full-workspace modal.
                  </SmallText>
                  <ButtonRow>
                    <AdminFormModal
                      description="Edit stream cadence, destination targeting, provider filters, and publish mode in a scrollable full-size workspace."
                      size="full"
                      title={`Edit ${stream.name}`}
                      triggerIcon="edit"
                      triggerLabel="Edit stream"
                    >
                      <StreamFormCard
                        action={saveStreamAction}
                        categoryOptions={categoryOptions}
                        destinationOptions={filteredDestinationOptions}
                        modeOptions={modeOptions}
                        onRunNow={handleRunNow}
                        providerOptions={providerOptions}
                        runInProgress={isRunInProgress}
                        statusOptions={statusOptions}
                        stream={stream}
                        submitLabel="Save stream"
                        templateOptions={visibleTemplateOptions}
                      />
                    </AdminFormModal>
                  </ButtonRow>
                </RecordCard>
              ))
            ) : selectedPlatforms.length ? (
              <SmallText>
                No streams are configured for the selected platforms yet. Tick another platform or create one from the panel on the right.
              </SmallText>
            ) : (
              <SmallText>
                No platforms are selected. Use the checkboxes above, or choose Select all to work across every configured target.
              </SmallText>
            )}
          </RecordStack>
        </Card>

        <StickyCard>
          <StickyHeader>
            <CardTitle>
              {selectedPlatforms.length === allPlatforms.length
                ? "Add stream"
                : selectedPlatforms.length === 1
                  ? `Add ${formatEnumLabel(selectedPlatforms[0])} stream`
                  : "Add stream to selected platforms"}
            </CardTitle>
            <CardDescription>
              {selectedPlatforms.length === allPlatforms.length
                ? "Streams define the destination-specific fetch window, filtering rules, mode, and cadence."
                : selectedPlatforms.length
                  ? "This form is narrowed to the checked platforms so one stream setup stays focused on the targets you selected."
                  : "Select one or more platforms above before creating a stream."}
            </CardDescription>
          </StickyHeader>
          <StickyScrollArea>
            {filteredDestinationOptions.length ? (
              <>
                <SmallText>
                  Launch a full-size stream composer scoped to the currently selected platforms and compatible templates.
                </SmallText>
                <ButtonRow>
                  <AdminFormModal
                    description="Create a new stream using the currently selected platform scope, compatible destinations, providers, and templates."
                    size="full"
                    title="Create stream"
                    triggerFullWidth
                    triggerIcon="plus"
                    triggerLabel="New stream"
                    triggerTone="primary"
                  >
                    <StreamFormCard
                      action={saveStreamAction}
                      categoryOptions={categoryOptions}
                      destinationOptions={filteredDestinationOptions}
                      modeOptions={modeOptions}
                      providerOptions={providerOptions}
                      submitLabel="Create stream"
                      templateOptions={visibleTemplateOptions}
                    />
                  </AdminFormModal>
                </ButtonRow>
              </>
            ) : (
              <SmallText>
                {selectedPlatforms.length
                  ? `No destinations are configured for the selected platform${selectedPlatforms.length === 1 ? "" : "s"} yet. Add a destination first, then come back to create streams for it.`
                  : "No platforms are selected yet. Choose at least one platform above before creating a stream."}
              </SmallText>
            )}
          </StickyScrollArea>
        </StickyCard>
      </StreamsGrid>

      <RunProgressModal onClose={closeRunReport} runState={runState} />
    </>
  );
}
