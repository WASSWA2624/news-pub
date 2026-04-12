"use client";

/**
 * Admin stream management workspace for destination scoping, stream editing,
 * and manual stream execution with explicit normalized fetch windows.
 */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";

import {
  AdminIconBadge,
  AdminSectionTitle,
  ButtonRow,
  Card,
  CardToolbar,
  CardDescription,
  CardHeader,
  FieldErrorText,
  InlineMetaText,
  MetaPill,
  PillRow,
  PrimaryButton,
  RecordStack,
  SectionGrid,
  SecondaryButton,
  SmallText,
  StickySideCard,
  StickySideCardHeader,
  StickySideCardScrollArea,
  StatusBadge,
  formatDateTime,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import {
  AdminDisclosureGroup,
  AdminDisclosureSection,
} from "@/components/admin/admin-form-primitives";
import AdminFormModal from "@/components/admin/admin-form-modal";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import FetchWindowControls from "@/components/admin/fetch-window-controls";
import {
  buildFetchWindowCapabilityDetails,
  createDefaultRunWindowState,
  createRunFetchWindowRequest,
  streamManagementUtils,
} from "@/components/admin/stream-management-screen.helpers";
import AppIcon from "@/components/common/app-icon";
import StreamFormCard from "@/components/admin/stream-form-card";

const TargetingCard = styled(Card)`
  background:
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.09), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(247, 250, 253, 0.96));
  border: 1px solid rgba(16, 32, 51, 0.07);
  box-shadow:
    0 12px 28px rgba(17, 31, 55, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.68);
  gap: 0.75rem;
  overflow: hidden;
`;

const TargetingLayout = styled.div`
  display: grid;
  gap: 0.75rem;

  @media (min-width: 980px) {
    align-items: start;
    grid-template-columns: minmax(0, 1.45fr) minmax(240px, 0.7fr);
  }
`;

const TargetingCopy = styled.div`
  display: grid;
  align-content: start;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(251, 253, 255, 0.82)),
    radial-gradient(circle at top left, rgba(15, 111, 141, 0.04), transparent 34%);
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: var(--theme-radius-lg, 2px);
  gap: 0.35rem;
  padding: clamp(0.72rem, 1.8vw, 0.9rem);
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
  font-size: clamp(0.98rem, 1.8vw, 1.22rem);
  letter-spacing: -0.045em;
  line-height: 1.08;
  margin: 0;
`;

const TitleWithIcon = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.46rem;

  svg {
    display: block;
    height: 1rem;
    width: 1rem;
  }
`;

const ActionRow = styled(CardToolbar)`
  align-items: center;
`;

const TargetSummary = styled(PillRow)``;

const SummaryPill = styled(MetaPill)`
  gap: 0.35rem;
  min-height: calc(var(--admin-control-min-height) - 8px);
  padding: 0 0.62rem;
`;

const PrimaryActionButton = styled(PrimaryButton)`
  box-shadow:
    0 16px 30px rgba(15, 96, 121, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);

  &:hover {
    box-shadow: ${({ disabled }) =>
      disabled ? "0 12px 24px rgba(15, 96, 121, 0.18)" : "0 16px 30px rgba(15, 96, 121, 0.22)"};
  }
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
  overflow-y: auto;
  padding: 1rem;
  position: fixed;
  z-index: 1400;
`;

const ProgressSurface = styled.section`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.996), rgba(246, 250, 255, 0.99)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.1), transparent 34%);
  border: 1px solid rgba(16, 32, 51, 0.09);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    0 32px 72px rgba(11, 18, 30, 0.24),
    0 12px 28px rgba(16, 32, 51, 0.1);
  display: grid;
  gap: 0.9rem;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-height: min(calc(100dvh - 2rem), 52rem);
  overflow: hidden;
  padding: clamp(1rem, 2vw, 1.25rem);
  width: min(94vw, 44rem);
`;

const ProgressHeader = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const ProgressHeaderRow = styled.div`
  align-items: start;
  display: flex;
  gap: 0.8rem;
  justify-content: space-between;
`;

const ProgressHeaderCopy = styled.div`
  display: grid;
  gap: 0.35rem;
  min-width: 0;
`;

const ProgressCloseButton = styled.button`
  align-items: center;
  background: rgba(16, 32, 51, 0.05);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  color: #22344f;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  display: inline-flex;
  flex: 0 0 auto;
  height: var(--admin-icon-button-size);
  justify-content: center;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
  width: var(--admin-icon-button-size);

  &:hover {
    background: ${({ disabled }) =>
      disabled ? "rgba(16, 32, 51, 0.05)" : "rgba(16, 32, 51, 0.08)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(15, 111, 141, 0.1);
    outline: none;
  }

  svg {
    display: block;
    height: 0.92rem;
    width: 0.92rem;
  }
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

const ProgressBody = styled.div`
  display: grid;
  gap: 1rem;
  min-height: 0;
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
    border-radius: var(--theme-radius-lg, 2px);
    background-clip: padding-box;
  }
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
  border-radius: var(--theme-radius-lg, 2px);
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
  border-radius: var(--theme-radius-lg, 2px);
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
  border-radius: var(--theme-radius-lg, 2px);
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
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $tone }) =>
    $tone === "running" ? "#0d5f79" : $tone === "success" ? "#276f4a" : $tone === "failed" ? "#9f2626" : "#244b73"};
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.68rem;
  font-weight: 800;
  min-height: var(--admin-compact-pill-min-height);
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
  align-items: center;
  border-top: 1px solid rgba(16, 32, 51, 0.08);
  display: flex;
  justify-content: flex-end;
  padding-top: 0.9rem;
`;

const ScopeHeader = styled.div`
  align-items: start;
  display: grid;
  background:
    linear-gradient(180deg, rgba(248, 251, 254, 0.92), rgba(255, 255, 255, 0.84));
  border: 1px solid rgba(16, 32, 51, 0.06);
  border-radius: var(--theme-radius-lg, 2px);
  gap: 0.6rem;
  padding: 0.65rem;
`;

const ScopeGroupGrid = styled.div`
  display: grid;
  gap: 0.55rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
`;

const ScopeGroupCard = styled(Card)`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(250, 252, 255, 0.9));
  border: 1px solid rgba(16, 32, 51, 0.06);
  gap: 0.5rem;
  padding: 0.62rem;
`;

const ScopeGroupHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  justify-content: space-between;
`;

const ScopeGroupTitleBlock = styled.div`
  display: grid;
  gap: 0.16rem;
`;

const ScopeGroupTitle = styled.strong`
  color: #162744;
  font-size: 0.78rem;
`;

const ScopeGroupMeta = styled.span`
  color: rgba(72, 85, 108, 0.88);
  font-size: 0.66rem;
  line-height: 1.35;
`;

const ScopeRail = styled.div`
  display: grid;
  gap: 0.38rem;

  @media (min-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ScopeActions = styled(ButtonRow)``;

const ScopeActionsBar = styled(CardToolbar)`
  align-items: center;
`;

const ScopeActionButton = styled(SecondaryButton)`
  font-size: 0.66rem;
  font-weight: 800;
  min-height: calc(var(--admin-control-min-height) - 8px);
  padding: 0 0.62rem;
`;

const ScopeCheckbox = styled.label`
  align-items: center;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, #0f6f8d 0%, #0d5f79 100%)"
      : "rgba(255, 255, 255, 0.92)"};
  border: 1px solid ${({ $active }) => ($active ? "transparent" : "rgba(16, 32, 51, 0.09)")};
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: ${({ $active }) =>
    $active ? "0 8px 18px rgba(15, 96, 121, 0.14)" : "0 6px 14px rgba(18, 34, 58, 0.035)"};
  color: ${({ $active }) => ($active ? "white" : "#22344f")};
  cursor: pointer;
  display: flex;
  font-size: 0.76rem;
  font-weight: 800;
  gap: 0.48rem;
  min-height: 0;
  justify-content: space-between;
  min-width: 0;
  padding: 0.62rem 0.72rem;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
  width: 100%;

  &:hover {
    transform: translateY(-1px);
  }

  input {
    accent-color: ${({ $active }) => ($active ? "white" : "#0d5f79")};
    flex: 0 0 auto;
    margin: 0;
    transform: scale(1);
  }
`;

const ScopeCheckboxLeading = styled.span`
  align-items: center;
  display: flex;
  gap: 0.5rem;
  min-width: 0;
`;

const ScopeDestinationBadge = styled(AdminIconBadge)`
  height: 1.7rem;
  width: 1.7rem;

  svg {
    display: block;
    height: 0.78rem;
    width: 0.78rem;
  }
`;

const ScopeCheckboxBody = styled.span`
  display: grid;
  gap: 0.08rem;
  min-width: 0;
`;

const ScopeCheckboxLabel = styled.span`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ScopeCheckboxMeta = styled.span`
  color: ${({ $active }) => ($active ? "rgba(255, 255, 255, 0.82)" : "rgba(72, 85, 108, 0.88)")};
  display: block;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.25;
`;

const ScopeCount = styled(MetaPill)`
  background: ${({ $active }) => ($active ? "rgba(255, 255, 255, 0.16)" : "rgba(36, 75, 115, 0.08)")};
  border-color: ${({ $active }) => ($active ? "rgba(255, 255, 255, 0.16)" : "rgba(36, 75, 115, 0.12)")};
  color: inherit;
  font-size: 0.62rem;
  padding: 0 0.42rem;
`;

const TargetingNotes = styled.div`
  display: grid;
  align-content: start;
  gap: 0.45rem;

  @media (max-width: 979px) {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
`;

const NoteCard = styled.div`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.92));
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: 0 8px 18px rgba(18, 34, 58, 0.035);
  display: grid;
  gap: 0.18rem;
  padding: 0.7rem 0.78rem;
`;

const NoteLabel = styled.strong`
  color: #162744;
  font-size: 0.76rem;
`;

const NoteText = styled.p`
  color: rgba(72, 85, 108, 0.92);
  font-size: 0.72rem;
  line-height: 1.35;
  margin: 0;
`;

const StreamPlatformBadge = styled(AdminIconBadge)`
  height: 2.35rem;
  width: 2.35rem;

  svg {
    display: block;
    height: 1rem;
    width: 1rem;
  }
`;

const StreamAccordionTitle = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.65rem;
  min-width: 0;
`;

const StreamAccordionTitleText = styled.span`
  color: inherit;
  display: block;
  font-size: 0.98rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.08;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: none;
  white-space: nowrap;
`;

const StreamBodyStack = styled.div`
  display: grid;
  gap: 0.9rem;
`;

const StreamInlineMeta = styled(InlineMetaText)``;

const StreamDetailGrid = styled.div`
  display: grid;
  gap: 0.55rem;

  @media (min-width: 920px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StreamDetailCard = styled.div`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.94));
  border: 1px solid rgba(16, 32, 51, 0.08);
  display: grid;
  gap: 0.38rem;
  padding: 0.68rem 0.74rem;
`;

const StreamDetailTitle = styled.strong`
  color: #162744;
  font-size: 0.76rem;
  letter-spacing: -0.01em;
`;

const StreamDetailPills = styled(PillRow)``;

const RunHistoryList = styled.div`
  display: grid;
  gap: 0.45rem;
`;

const RunHistoryItem = styled.div`
  border: 1px solid rgba(16, 32, 51, 0.07);
  display: grid;
  gap: 0.28rem;
  padding: 0.58rem 0.62rem;
`;

const RunHistoryHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: space-between;
`;

const {
  compareDestinationGroupKeys,
  describeCompletedRun,
  getDestinationPlatformIcon,
  getResultLabel,
  getResultTone,
  getRunProgress,
  getStreamDeleteDescription,
  getTone,
  summarizeRunCounts,
} = streamManagementUtils;

function getDestinationPlatformTone(platform) {
  if (platform === "FACEBOOK") {
    return "facebook";
  }

  if (platform === "INSTAGRAM") {
    return "instagram";
  }

  return "website";
}

function formatCompactKey(value) {
  return `${value || ""}`
    .replace(/Json$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatValueList(values = [], fallbackValue = "Any") {
  const items = [...new Set((Array.isArray(values) ? values : [values]).map((value) => `${value || ""}`.trim()).filter(Boolean))];

  return items.length ? items.join(", ") : fallbackValue;
}

function formatRequestValue(value) {
  if (Array.isArray(value)) {
    return formatValueList(value, "Any");
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return `${value ?? ""}`.trim() || "Any";
}

function getRequestEntries(requestValues = {}) {
  return Object.entries(requestValues || {})
    .filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return `${value ?? ""}`.trim() !== "";
    })
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => ({
      key,
      label: formatCompactKey(key),
      value: formatRequestValue(value),
    }));
}

function formatIntervalLabel(minutes) {
  const normalizedMinutes = Number(minutes || 0);

  if (!normalizedMinutes) {
    return "Manual only";
  }

  if (normalizedMinutes % 60 === 0) {
    const hours = normalizedMinutes / 60;

    return `${hours}h cadence`;
  }

  return `${normalizedMinutes}m cadence`;
}

function getRunStatusTone(status) {
  if (status === "SUCCEEDED") {
    return "success";
  }

  if (status === "FAILED") {
    return "danger";
  }

  if (status === "RUNNING" || status === "PENDING") {
    return "warning";
  }

  return undefined;
}

function describeScheduleStatus(stream, scheduler) {
  const schedule = stream.schedule || {};

  if (!schedule.isActive) {
    return "This stream is paused. Its cadence and filters are saved, but automatic runs stay off until you reactivate it.";
  }

  if (!schedule.isEnabled) {
    return "Automatic runs are disabled for this stream. It only runs manually.";
  }

  if (schedule.isRunning) {
    return schedule.lastRunStartedAt
      ? `This stream is running now. Current execution started ${formatDateTime(schedule.lastRunStartedAt)}.`
      : "This stream is running now.";
  }

  if (schedule.isDue) {
    if (scheduler?.usesExternalCron) {
      return schedule.nextRunAt
        ? `This stream became due at ${formatDateTime(schedule.nextRunAt)} and is waiting for the scheduler endpoint to be triggered.`
        : "This stream is due and is waiting for the scheduler endpoint to be triggered.";
    }

    return schedule.nextRunAt
      ? `This stream became due at ${formatDateTime(schedule.nextRunAt)} and will run on the next internal scheduler poll.`
      : "This stream is due and will run on the next internal scheduler poll.";
  }

  if (schedule.nextRunAt) {
    return `Next automatic run is scheduled for ${formatDateTime(schedule.nextRunAt)}.`;
  }

  if (!schedule.lastRunCompletedAt && !schedule.lastFailureAt) {
    return "This stream has not completed an automatic run yet and is ready for its first scheduled pass.";
  }

  return "This stream is waiting for its next calculated interval.";
}

function describeLatestRun(stream) {
  const run = stream.latestRun;

  if (!run) {
    return "No fetch runs have been recorded for this stream yet.";
  }

  const runWindow = run.executionDetails?.streamFetchWindow;
  const fragments = [
    `${formatEnumLabel(run.triggerType || "manual")} run`,
    run.startedAt ? `started ${formatDateTime(run.startedAt)}` : "",
    run.finishedAt ? `finished ${formatDateTime(run.finishedAt)}` : "",
  ].filter(Boolean);

  if (runWindow?.start && runWindow?.end) {
    fragments.push(
      `${runWindow.source || "window"} ${formatDateTime(runWindow.start)} to ${formatDateTime(runWindow.end)}`,
    );
  }

  return fragments.join(" | ");
}

function getRecentRunLabel(run) {
  const triggerLabel = formatEnumLabel(run.triggerType || "manual");

  if (run.startedAt && run.finishedAt) {
    return `${triggerLabel} | ${formatDateTime(run.startedAt)} to ${formatDateTime(run.finishedAt)}`;
  }

  if (run.startedAt) {
    return `${triggerLabel} | started ${formatDateTime(run.startedAt)}`;
  }

  return triggerLabel;
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
      : "NewsPub is planning shared fetch groups, widening the safe provider envelope once per compatible group, and then processing each stream locally."
    : resultSummary.failedRuns
      ? "Some streams could not finish. Review the brief report below before closing."
      : "Every requested stream finished. Review the brief report below, then close the modal when you are ready.";

  return createPortal(
    <ProgressOverlay
      onClick={(event) => {
        if (!isRunning && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <ProgressSurface aria-busy={isRunning} aria-modal="true" role="dialog">
        <ProgressHeader>
          <ProgressHeaderRow>
            <ProgressHeaderCopy>
              <ProgressEyebrow>{isRunning ? "Stream progress" : "Run report"}</ProgressEyebrow>
              <ProgressTitle>{modalTitle}</ProgressTitle>
              <ProgressDescription>{modalDescription}</ProgressDescription>
            </ProgressHeaderCopy>
            <ProgressCloseButton
              aria-label={isRunning ? "Close disabled while run is active" : "Close run report"}
              disabled={isRunning}
              onClick={onClose}
              type="button"
            >
              <AppIcon name="close" size={14} />
            </ProgressCloseButton>
          </ProgressHeaderRow>
        </ProgressHeader>

        <ProgressBody>
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
        </ProgressBody>

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

function getRunConfigurationErrorMessage(error) {
  if (error instanceof Error && error.message === "run_window_boundaries_required") {
    return "Enter both the manual run start and end boundaries before starting the selected streams.";
  }

  if (error instanceof Error && error.message === "run_window_start_after_end") {
    return "Fetch window start must be earlier than or equal to the end boundary.";
  }

  return "NewsPub could not build the requested manual run window.";
}

/**
 * Modal used for multi-stream manual runs so operators can confirm one
 * explicit NewsPub fetch window before compatible streams share provider work.
 *
 * @param {object} props - Modal copy, stream scope, and fetch-window state.
 * @returns {JSX.Element} Manual run configuration dialog.
 */
function RunConfigurationModal({
  errorMessage = "",
  onClose,
  onConfirm,
  open = false,
  runInProgress = false,
  scopeLabel = "",
  streams = [],
  windowState,
  onWindowStateChange,
}) {
  const capabilityDetails = useMemo(
    () => buildFetchWindowCapabilityDetails(streams),
    [streams],
  );

  return (
    <AdminFormModal
      description={`Run ${scopeLabel || "the selected streams"} with one explicit NewsPub fetch window. Compatible providers still share widened upstream requests safely, then filter locally per stream.`}
      mountOnOpen
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose?.();
        }
      }}
      open={open}
      showTrigger={false}
      size="wide"
      title="Run streams with explicit bounds"
    >
      <SmallText>
        Manual runs default to the previous 24 hours through the next 30 minutes from now. The extra forward buffer helps protect the latest stories from provider indexing, API, and processing delays. Scheduled runs still use checkpoints automatically, while this dialog keeps the manual boundary explicit and auditable.
      </SmallText>
      <FetchWindowControls
        capabilityDetails={capabilityDetails}
        disabled={runInProgress}
        endValue={windowState?.endInputValue || ""}
        onEndChange={(value) =>
          onWindowStateChange?.((currentState) => ({
            ...currentState,
            endInputValue: value,
          }))
        }
        onReset={() => onWindowStateChange?.(() => createDefaultRunWindowState())}
        onStartChange={(value) =>
          onWindowStateChange?.((currentState) => ({
            ...currentState,
            startInputValue: value,
          }))
        }
        onWriteCheckpointChange={(value) =>
          onWindowStateChange?.((currentState) => ({
            ...currentState,
            writeCheckpointOnSuccess: value,
          }))
        }
        startValue={windowState?.startInputValue || ""}
        writeCheckpointOnSuccess={Boolean(windowState?.writeCheckpointOnSuccess)}
      />
      {errorMessage ? <FieldErrorText>{errorMessage}</FieldErrorText> : null}
      <ButtonRow>
        <PrimaryButton disabled={runInProgress} onClick={onConfirm} type="button">
          <AppIcon name="bolt" size={14} />
          Run {streams.length === 1 ? "stream" : `${streams.length} streams`}
        </PrimaryButton>
      </ButtonRow>
    </AdminFormModal>
  );
}

/**
 * Main admin screen for stream targeting, CRUD, and run-now workflows.
 *
 * @param {object} props - Stream-management data and server actions.
 * @returns {JSX.Element} Stream management workspace.
 */
export default function StreamManagementScreen({
  categoryOptions,
  deleteStreamAction,
  destinationOptions,
  modeOptions,
  providerOptions,
  saveStreamAction,
  scheduler,
  statusOptions,
  streams,
  templateOptions,
  uiNowIso = "",
}) {
  const router = useRouter();
  const defaultRunWindowState = useMemo(
    () => createDefaultRunWindowState(uiNowIso || new Date()),
    [uiNowIso],
  );
  const [selectedDestinationIds, setSelectedDestinationIds] = useState(() =>
    destinationOptions.map((destination) => destination.value).filter(Boolean),
  );
  const [runState, setRunState] = useState(null);
  const [runConfiguration, setRunConfiguration] = useState(null);
  const streamCountsByDestination = useMemo(() => {
    const counts = new Map();

    for (const stream of streams) {
      const destinationId = stream.destination?.id;

      if (!destinationId) {
        continue;
      }

      counts.set(destinationId, (counts.get(destinationId) || 0) + 1);
    }

    return counts;
  }, [streams]);

  const destinationGroups = useMemo(() => {
    const groupMap = new Map();
    const sortedDestinations = [...destinationOptions]
      .filter((destination) => destination.value)
      .sort((left, right) => {
        const platformComparison = compareDestinationGroupKeys(left.platform, right.platform);

        if (platformComparison !== 0) {
          return platformComparison;
        }

        return (left.label || "").localeCompare(right.label || "");
      });

    for (const destination of sortedDestinations) {
      const platform = destination.platform || "OTHER";

      if (!groupMap.has(platform)) {
        groupMap.set(platform, {
          destinations: [],
          platform,
          totalStreamCount: 0,
        });
      }

      const streamCount = destination.streamCount ?? streamCountsByDestination.get(destination.value) ?? 0;

      groupMap.get(platform).destinations.push({
        ...destination,
        streamCount,
      });
      groupMap.get(platform).totalStreamCount += streamCount;
    }

    return [...groupMap.values()].sort((left, right) =>
      compareDestinationGroupKeys(left.platform, right.platform),
    );
  }, [destinationOptions, streamCountsByDestination]);

  const allDestinationIds = useMemo(
    () => destinationGroups.flatMap((group) => group.destinations.map((destination) => destination.value)),
    [destinationGroups],
  );

  const destinationOrder = useMemo(
    () => new Map(allDestinationIds.map((destinationId, index) => [destinationId, index])),
    [allDestinationIds],
  );

  const normalizedSelectedDestinationIds = useMemo(
    () => selectedDestinationIds.filter((destinationId) => destinationOrder.has(destinationId)),
    [destinationOrder, selectedDestinationIds],
  );

  function sortDestinationIds(destinationIds) {
    return [...destinationIds]
      .filter((destinationId) => destinationOrder.has(destinationId))
      .sort(
      (left, right) =>
        (destinationOrder.get(left) ?? Number.MAX_SAFE_INTEGER)
        - (destinationOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
      );
  }

  const selectedDestinationSet = useMemo(
    () => new Set(normalizedSelectedDestinationIds),
    [normalizedSelectedDestinationIds],
  );

  function toggleDestination(destinationId) {
    setSelectedDestinationIds((currentIds) => {
      const validIds = currentIds.filter((value) => destinationOrder.has(value));

      return validIds.includes(destinationId)
        ? validIds.filter((value) => value !== destinationId)
        : sortDestinationIds([...validIds, destinationId]);
    });
  }

  function selectAllDestinations() {
    setSelectedDestinationIds(allDestinationIds);
  }

  function deselectAllDestinations() {
    setSelectedDestinationIds([]);
  }

  function selectDestinationGroup(destinationIds) {
    setSelectedDestinationIds((currentIds) => {
      const validIds = currentIds.filter((destinationId) => destinationOrder.has(destinationId));

      return sortDestinationIds([...new Set([...validIds, ...destinationIds])]);
    });
  }

  function deselectDestinationGroup(destinationIds) {
    const destinationIdSet = new Set(destinationIds);

    setSelectedDestinationIds((currentIds) => {
      const validIds = currentIds.filter((destinationId) => destinationOrder.has(destinationId));

      return validIds.filter((destinationId) => !destinationIdSet.has(destinationId));
    });
  }

  const filteredDestinationOptions = useMemo(() => {
    return destinationOptions.filter((destination) => selectedDestinationSet.has(destination.value));
  }, [destinationOptions, selectedDestinationSet]);

  const selectedPlatformSet = useMemo(
    () => new Set(filteredDestinationOptions.map((destination) => destination.platform).filter(Boolean)),
    [filteredDestinationOptions],
  );

  const filteredStreams = useMemo(() => {
    return streams.filter((stream) => selectedDestinationSet.has(stream.destination?.id));
  }, [selectedDestinationSet, streams]);

  const runnableStreams = useMemo(() => {
    return filteredStreams.filter((stream) => stream.status === "ACTIVE");
  }, [filteredStreams]);

  const visibleTemplateOptions = useMemo(() => {
    return templateOptions.filter(
      (template) => !template.value || selectedPlatformSet.has(template.platform),
    );
  }, [selectedPlatformSet, templateOptions]);

  const selectedDestinationCount = filteredDestinationOptions.length;
  const selectedDestinationGroupCount = destinationGroups.filter((group) =>
    group.destinations.some((destination) => selectedDestinationSet.has(destination.value)),
  ).length;
  const selectedDestination = selectedDestinationCount === 1 ? filteredDestinationOptions[0] : null;
  const hasConfiguredDestinations = allDestinationIds.length > 0;
  const allDestinationsSelected =
    hasConfiguredDestinations && selectedDestinationCount === allDestinationIds.length;
  const scopeDescription = !hasConfiguredDestinations
    ? "Add a destination first to create or review streams."
    : !selectedDestinationCount
      ? "Select at least one target destination to create or review streams."
      : allDestinationsSelected
        ? "Create or review streams for all configured destinations. Each destination keeps using its own saved publishing settings."
        : selectedDestination
          ? `Create or review streams for ${selectedDestination.label}. Each destination keeps using its own saved publishing settings.`
          : `Create or review streams for ${selectedDestinationCount} selected destinations across ${selectedDestinationGroupCount} group${selectedDestinationGroupCount === 1 ? "" : "s"}. Each destination keeps using its own saved publishing settings.`;
  const isRunInProgress = runState?.phase === "running";
  const schedulerStatusText = scheduler?.internalEnabled
    ? scheduler.latestScheduledRunAt
      ? `Internal scheduler is polling every ${scheduler.internalIntervalSeconds} seconds. Latest scheduled activity: ${formatDateTime(
          scheduler.latestScheduledRunAt,
        )}.`
      : `Internal scheduler is polling every ${scheduler.internalIntervalSeconds} seconds. No scheduled fetch runs have completed yet.`
    : scheduler?.latestScheduledRunAt
      ? `External cron is expected to trigger ${scheduler.endpointPath}. Latest scheduled activity: ${formatDateTime(
          scheduler.latestScheduledRunAt,
        )}.`
      : `External cron is expected to trigger ${scheduler?.endpointPath || "/api/jobs/scheduled-publishing"}. No scheduled fetch runs have completed yet.`;

  function closeRunReport() {
    if (isRunInProgress) {
      return;
    }

    setRunState(null);
    router.refresh();
  }

  function closeRunConfiguration() {
    if (isRunInProgress) {
      return;
    }

    setRunConfiguration(null);
  }

  function openRunConfiguration(streamBatch) {
    if (!streamBatch.length || isRunInProgress) {
      return;
    }

    setRunConfiguration({
      errorMessage: "",
      scopeLabel:
        streamBatch.length === 1
          ? streamBatch[0].name
          : `${streamBatch.length} selected streams`,
      streams: streamBatch,
      windowState: {
        ...defaultRunWindowState,
      },
    });
  }

  async function executeStreamBatch(streamBatch, fetchWindow = null) {
    const response = await fetch("/api/streams/run", {
      body: JSON.stringify({
        ...(fetchWindow
          ? {
              fetchWindow,
            }
          : {}),
        streamIds: streamBatch.map((stream) => stream.id),
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
      throw new Error(payload?.message || "Could not run the selected streams.");
    }

    if (payload?.data?.batch?.results) {
      return payload.data.batch.results;
    }

    if (payload?.data?.run) {
      return [
        {
          run: payload.data.run,
          stream: streamBatch[0],
        },
      ];
    }

    return [];
  }

  async function handleRunStreams(streamBatch, { fetchWindow = null } = {}) {
    if (!streamBatch.length || isRunInProgress) {
      return;
    }

    setRunState({
      activeStreamId: null,
      activeStreamName:
        streamBatch.length === 1
          ? streamBatch[0].name
          : `${streamBatch.length} selected streams`,
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

    let results = [];

    try {
      const responseResults = await executeStreamBatch(streamBatch, fetchWindow);
      const responseResultByStreamId = new Map(
        responseResults.map((result) => [result.stream?.id || result.run?.streamId, result]),
      );

      results = streamBatch.map((stream) => {
        const matchingResult = responseResultByStreamId.get(stream.id);

        return matchingResult
          ? {
              ...matchingResult,
              stream,
            }
          : {
              error: "NewsPub did not return a run result for this stream.",
              stream,
            };
      });
    } catch (error) {
      results = streamBatch.map((stream) => ({
        error: error instanceof Error ? error.message : "Stream execution failed.",
        stream,
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
    openRunConfiguration(runnableStreams);
  }

  function handleRunNow(runContext) {
    if (!runContext?.stream) {
      return;
    }

    void handleRunStreams([runContext.stream], {
      fetchWindow: runContext.fetchWindow || null,
    });
  }

  function handleRunConfigurationConfirm() {
    if (!runConfiguration?.streams?.length) {
      return;
    }

    try {
      const fetchWindow = createRunFetchWindowRequest(runConfiguration.windowState);

      setRunConfiguration(null);
      void handleRunStreams(runConfiguration.streams, {
        fetchWindow,
      });
    } catch (error) {
      setRunConfiguration((currentState) =>
        currentState
          ? {
              ...currentState,
              errorMessage: getRunConfigurationErrorMessage(error),
            }
          : currentState,
      );
    }
  }

  const streamsSectionTitle = allDestinationsSelected
    ? "Configured streams"
    : selectedDestination
      ? `${selectedDestination.label} streams`
      : "Selected destination streams";
  const streamsSectionDescription = selectedDestinationCount
    ? "Keep each stream small, readable, and tunable from a phone without losing control."
    : hasConfiguredDestinations
      ? "Pick one or more destinations above to load matching streams."
      : "Add a destination first to load matching streams.";
  const addStreamTitle = allDestinationsSelected
    ? "Add stream"
    : selectedDestination
      ? `Add ${selectedDestination.label} stream`
      : "Add stream to selected destinations";
  const addStreamDescription = allDestinationsSelected
    ? "Streams define the destination-specific fetch window, filtering rules, mode, and cadence."
    : selectedDestinationCount
      ? "This form is narrowed to the checked destinations so one stream setup stays focused on the targets you selected."
      : hasConfiguredDestinations
        ? "Select one or more destinations above before creating a stream."
        : "Add a destination first before creating a stream.";
  const activeScopeText = selectedDestinationCount
    ? `${filteredDestinationOptions.length} destination${filteredDestinationOptions.length === 1 ? " is" : "s are"} available across ${selectedDestinationGroupCount} selected group${selectedDestinationGroupCount === 1 ? "" : "s"}.`
    : hasConfiguredDestinations
      ? "No destinations are selected yet."
      : "No destinations are configured yet.";

  return (
    <>
      <TargetingCard>
        <TargetingLayout>
          <TargetingCopy>
            <TargetingEyebrow>Target destinations</TargetingEyebrow>
            <TargetingTitle>
              <TitleWithIcon>
                <AppIcon name="streams" size={16} />
                Choose the destinations this workflow should target.
              </TitleWithIcon>
            </TargetingTitle>
            <SmallText>{scopeDescription}</SmallText>
            <ActionRow>
              <TargetSummary>
                <SummaryPill $tone="accent">
                  <AppIcon name="tag" size={14} />
                  {selectedDestinationCount} selected
                </SummaryPill>
                <SummaryPill>
                  <AppIcon name="destinations" size={14} />
                  {filteredDestinationOptions.length} destinations in scope
                </SummaryPill>
                <SummaryPill>
                  <AppIcon name="play" size={14} />
                  {runnableStreams.length} runnable streams
                </SummaryPill>
              </TargetSummary>
              <ScopeActions>
                <PrimaryActionButton
                  disabled={!runnableStreams.length || isRunInProgress}
                  onClick={handleRunSelected}
                  type="button"
                >
                  <AppIcon name="bolt" size={14} />
                  Run selected
                  <ScopeCount $active>{runnableStreams.length}</ScopeCount>
                </PrimaryActionButton>
              </ScopeActions>
            </ActionRow>
            <AdminDisclosureGroup>
              <AdminDisclosureSection
                description="Choose which destinations the workspace should show and which streams the Run selected action should include."
                meta={[
                  {
                    label: `${selectedDestinationCount} selected`,
                    tone: selectedDestinationCount ? "accent" : "warning",
                  },
                  {
                    label: `${destinationGroups.length} group${destinationGroups.length === 1 ? "" : "s"}`,
                  },
                  {
                    label: `${runnableStreams.length} runnable`,
                    tone: runnableStreams.length ? "success" : "warning",
                  },
                ]}
                summary={activeScopeText}
                title="Destination scope controls"
              >
                <ScopeHeader>
                  <ScopeActionsBar>
                    <ScopeActions>
                      <ScopeActionButton
                        disabled={!hasConfiguredDestinations || allDestinationsSelected}
                        onClick={selectAllDestinations}
                        type="button"
                      >
                        Select all
                      </ScopeActionButton>
                      <ScopeActionButton
                        disabled={!selectedDestinationCount}
                        onClick={deselectAllDestinations}
                        type="button"
                      >
                        Deselect all
                      </ScopeActionButton>
                    </ScopeActions>
                    <SmallText>
                      {selectedDestinationCount} of {allDestinationIds.length} destinations selected
                    </SmallText>
                  </ScopeActionsBar>
                  {destinationGroups.length ? (
                    <ScopeGroupGrid>
                      {destinationGroups.map((group) => {
                        const groupDestinationIds = group.destinations.map((destination) => destination.value);
                        const selectedGroupCount = groupDestinationIds.filter((destinationId) =>
                          selectedDestinationSet.has(destinationId),
                        ).length;

                        return (
                          <ScopeGroupCard key={group.platform}>
                            <ScopeGroupHeader>
                              <ScopeGroupTitleBlock>
                                <ScopeGroupTitle>
                                  <TitleWithIcon>
                                    <AppIcon name={getDestinationPlatformIcon(group.platform)} size={14} />
                                    {formatEnumLabel(group.platform)} destinations
                                  </TitleWithIcon>
                                </ScopeGroupTitle>
                                <ScopeGroupMeta>
                                  {selectedGroupCount} of {group.destinations.length} selected
                                  {" | "}
                                  {group.totalStreamCount} stream{group.totalStreamCount === 1 ? "" : "s"}
                                </ScopeGroupMeta>
                              </ScopeGroupTitleBlock>
                              <ScopeActions>
                                <ScopeActionButton
                                  disabled={selectedGroupCount === group.destinations.length}
                                  onClick={() => selectDestinationGroup(groupDestinationIds)}
                                  type="button"
                                >
                                  Select all
                                </ScopeActionButton>
                                <ScopeActionButton
                                  disabled={!selectedGroupCount}
                                  onClick={() => deselectDestinationGroup(groupDestinationIds)}
                                  type="button"
                                >
                                  Deselect all
                                </ScopeActionButton>
                              </ScopeActions>
                            </ScopeGroupHeader>
                            <ScopeRail>
                              {group.destinations.map((destination) => {
                                const isActive = selectedDestinationSet.has(destination.value);

                                return (
                                  <ScopeCheckbox $active={isActive} key={destination.value}>
                                    <ScopeCheckboxLeading>
                                      <input
                                        checked={isActive}
                                        onChange={() => toggleDestination(destination.value)}
                                        type="checkbox"
                                      />
                                      <ScopeDestinationBadge $tone={getDestinationPlatformTone(destination.platform)}>
                                        <AppIcon
                                          name={getDestinationPlatformIcon(destination.platform)}
                                          size={14}
                                        />
                                      </ScopeDestinationBadge>
                                      <ScopeCheckboxBody>
                                        <ScopeCheckboxLabel>{destination.label}</ScopeCheckboxLabel>
                                        <ScopeCheckboxMeta $active={isActive}>
                                          {formatEnumLabel(destination.kind)}
                                          {destination.slug ? ` | ${destination.slug}` : ""}
                                        </ScopeCheckboxMeta>
                                      </ScopeCheckboxBody>
                                    </ScopeCheckboxLeading>
                                    <ScopeCount $active={isActive}>{destination.streamCount}</ScopeCount>
                                  </ScopeCheckbox>
                                );
                              })}
                            </ScopeRail>
                          </ScopeGroupCard>
                        );
                      })}
                    </ScopeGroupGrid>
                  ) : (
                    <SmallText>
                      No destinations are configured yet. Add a website or social destination to start grouping streams here.
                    </SmallText>
                  )}
                </ScopeHeader>
              </AdminDisclosureSection>
            </AdminDisclosureGroup>
          </TargetingCopy>

          <TargetingNotes>
            <NoteCard>
              <NoteLabel>Active scope</NoteLabel>
              <NoteText>{activeScopeText}</NoteText>
            </NoteCard>
            <NoteCard>
              <NoteLabel>Scheduler</NoteLabel>
              <NoteText>{schedulerStatusText}</NoteText>
            </NoteCard>
            <NoteCard>
              <NoteLabel>How settings apply</NoteLabel>
              <NoteText>
                Saved destination, template, and publishing settings stay attached to each selected target.
              </NoteText>
            </NoteCard>
          </TargetingNotes>
        </TargetingLayout>
      </TargetingCard>

      <SectionGrid $wide>
        <Card>
          <CardHeader>
            <AdminSectionTitle icon="streams">{streamsSectionTitle}</AdminSectionTitle>
            <CardDescription>{streamsSectionDescription}</CardDescription>
          </CardHeader>
          <RecordStack>
            {filteredStreams.length ? (
              <AdminDisclosureGroup>
                {filteredStreams.map((stream) => {
                  const currentRequestEntries = getRequestEntries(stream.effectiveFilters?.providerRequestValues);
                  const latestRunRequestEntries = getRequestEntries(
                    stream.latestRun?.executionDetails?.sharedRequest?.requestValues,
                  );
                  const recentRuns = stream.recentRuns || [];

                  return (
                    <AdminDisclosureSection
                      id={`stream-${stream.id}`}
                      key={stream.id}
                      description={`Template ${stream.defaultTemplate?.name || "No explicit template"} | Locale ${stream.locale} | ${stream.timezone}`}
                      meta={[
                        {
                          label: formatEnumLabel(stream.destination?.platform || "UNKNOWN"),
                        },
                        {
                          label: stream.activeProvider?.label || "Provider",
                        },
                        {
                          label: formatEnumLabel(stream.mode),
                        },
                        {
                          label: stream.status,
                          tone: getTone(stream.status),
                        },
                        stream.schedule?.isRunning
                          ? {
                              label: "Running now",
                              tone: "accent",
                            }
                          : null,
                        stream.schedule?.isDue && !stream.schedule?.isRunning
                          ? {
                              label: stream.schedule?.isOverdue
                                ? `Overdue ${stream.schedule.overdueMinutes}m`
                                : "Due now",
                              tone: "warning",
                            }
                          : null,
                      ].filter(Boolean)}
                      summary={`${stream.destination?.name || "Unknown destination"} via ${stream.activeProvider?.label || "Unknown provider"}. ${describeScheduleStatus(stream, scheduler)}`}
                      title={
                        <StreamAccordionTitle>
                          <StreamPlatformBadge $tone={getDestinationPlatformTone(stream.destination?.platform || "WEBSITE")}>
                            <AppIcon
                              name={getDestinationPlatformIcon(stream.destination?.platform || "WEBSITE")}
                              size={16}
                            />
                          </StreamPlatformBadge>
                          <StreamAccordionTitleText>{stream.name}</StreamAccordionTitleText>
                        </StreamAccordionTitle>
                      }
                    >
                      <StreamBodyStack>
                        <StreamDetailGrid>
                          <StreamDetailCard>
                            <StreamDetailTitle>Automation status</StreamDetailTitle>
                            <SmallText>{describeScheduleStatus(stream, scheduler)}</SmallText>
                            <StreamDetailPills>
                              <MetaPill $tone={stream.schedule?.isEnabled ? "accent" : undefined}>
                                <AppIcon name="clock" size={11} />
                                {formatIntervalLabel(stream.schedule?.intervalMinutes)}
                              </MetaPill>
                              {stream.schedule?.nextRunAt ? (
                                <MetaPill>Next {formatDateTime(stream.schedule.nextRunAt)}</MetaPill>
                              ) : null}
                              {stream.schedule?.latestTriggerType ? (
                                <MetaPill>{formatEnumLabel(stream.schedule.latestTriggerType)}</MetaPill>
                              ) : null}
                              {stream.checkpoint?.lastSuccessfulFetchAt ? (
                                <MetaPill>Checkpoint {formatDateTime(stream.checkpoint.lastSuccessfulFetchAt)}</MetaPill>
                              ) : null}
                            </StreamDetailPills>
                            <SmallText>{describeLatestRun(stream)}</SmallText>
                          </StreamDetailCard>

                          <StreamDetailCard>
                            <StreamDetailTitle>Filters in effect</StreamDetailTitle>
                            <SmallText>
                              {stream.effectiveFilters?.timeBoundarySupport?.summary
                                || "Provider defaults and this stream's overrides are merged before each run."}
                            </SmallText>
                            <StreamDetailPills>
                              {stream.effectiveFilters?.categories?.length ? (
                                stream.effectiveFilters.categories.map((category) => (
                                  <MetaPill key={`category-${stream.id}-${category.id}`}>
                                    Category: {category.name}
                                  </MetaPill>
                                ))
                              ) : (
                                <MetaPill>Categories: Any</MetaPill>
                              )}
                              <MetaPill>Languages: {formatValueList(stream.languageAllowlistJson)}</MetaPill>
                              <MetaPill>Countries: {formatValueList(stream.countryAllowlistJson)}</MetaPill>
                              <MetaPill>Regions: {formatValueList(stream.regionAllowlistJson)}</MetaPill>
                              {(stream.includeKeywordsJson || []).length ? (
                                stream.includeKeywordsJson.map((keyword) => (
                                  <MetaPill key={`include-${stream.id}-${keyword}`}>Include: {keyword}</MetaPill>
                                ))
                              ) : (
                                <MetaPill>Include keywords: Any</MetaPill>
                              )}
                              {(stream.excludeKeywordsJson || []).length ? (
                                stream.excludeKeywordsJson.map((keyword) => (
                                  <MetaPill key={`exclude-${stream.id}-${keyword}`} $tone="warning">
                                    Exclude: {keyword}
                                  </MetaPill>
                                ))
                              ) : (
                                <MetaPill>Exclude keywords: None</MetaPill>
                              )}
                              <MetaPill>Endpoint: {formatCompactKey(stream.effectiveFilters?.providerEndpoint || "default")}</MetaPill>
                            </StreamDetailPills>
                          </StreamDetailCard>
                        </StreamDetailGrid>

                        <StreamDetailGrid>
                          <StreamDetailCard>
                            <StreamDetailTitle>Merged request values</StreamDetailTitle>
                            <SmallText>
                              These are the provider-facing filters NewsPub will use if this stream runs now.
                            </SmallText>
                            <StreamDetailPills>
                              {currentRequestEntries.length ? (
                                currentRequestEntries.map((entry) => (
                                  <MetaPill key={`request-${stream.id}-${entry.key}`}>
                                    {entry.label}: {entry.value}
                                  </MetaPill>
                                ))
                              ) : (
                                <MetaPill>No provider overrides</MetaPill>
                              )}
                            </StreamDetailPills>
                          </StreamDetailCard>

                          <StreamDetailCard>
                            <StreamDetailTitle>Last executed request</StreamDetailTitle>
                            <SmallText>
                              Shared-batch runs can widen safe provider filters upstream and then apply stream-level rules locally.
                            </SmallText>
                            <StreamDetailPills>
                              {latestRunRequestEntries.length ? (
                                latestRunRequestEntries.map((entry) => (
                                  <MetaPill key={`last-request-${stream.id}-${entry.key}`}>
                                    {entry.label}: {entry.value}
                                  </MetaPill>
                                ))
                              ) : (
                                <MetaPill>Not recorded yet</MetaPill>
                              )}
                            </StreamDetailPills>
                          </StreamDetailCard>
                        </StreamDetailGrid>

                        {recentRuns.length ? (
                          <StreamDetailCard as="section">
                            <StreamDetailTitle>Recent runs</StreamDetailTitle>
                            <RunHistoryList>
                              {recentRuns.map((run) => (
                                <RunHistoryItem key={run.id}>
                                  <RunHistoryHeader>
                                    <SmallText>{getRecentRunLabel(run)}</SmallText>
                                    <StatusBadge $tone={getRunStatusTone(run.status)}>{run.status}</StatusBadge>
                                  </RunHistoryHeader>
                                  <SmallText>{describeCompletedRun(run)}</SmallText>
                                  {run.executionDetails?.streamFetchWindow?.start && run.executionDetails?.streamFetchWindow?.end ? (
                                    <SmallText>
                                      Window: {formatDateTime(run.executionDetails.streamFetchWindow.start)}
                                      {" | "}
                                      {formatDateTime(run.executionDetails.streamFetchWindow.end)}
                                    </SmallText>
                                  ) : null}
                                  {run.errorMessage ? <SmallText>{run.errorMessage}</SmallText> : null}
                                </RunHistoryItem>
                              ))}
                            </RunHistoryList>
                          </StreamDetailCard>
                        ) : null}

                        <StreamInlineMeta>
                          Scheduling, targeting rules, provider filters, and template selection are still editable in the full-workspace modal.
                        </StreamInlineMeta>
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
                              uiNowIso={uiNowIso}
                            />
                          </AdminFormModal>
                          <form action={deleteStreamAction}>
                            <input name="id" type="hidden" value={stream.id} />
                            <ConfirmSubmitButton
                              confirmLabel="Delete stream"
                              description={getStreamDeleteDescription(stream)}
                              title="Delete this stream?"
                            >
                              Delete
                            </ConfirmSubmitButton>
                          </form>
                        </ButtonRow>
                      </StreamBodyStack>
                    </AdminDisclosureSection>
                  );
                })}
              </AdminDisclosureGroup>
            ) : selectedDestinationCount ? (
              <SmallText>
                No streams are configured for the selected destinations yet. Tick another destination or create one from the panel on the right.
              </SmallText>
            ) : (
              <SmallText>
                {hasConfiguredDestinations
                  ? "No destinations are selected. Use the grouped checkboxes above, or choose Select all to work across every configured target."
                  : "No destinations are configured yet. Add one from the Destinations area first."}
              </SmallText>
            )}
          </RecordStack>
        </Card>

        <StickySideCard>
          <StickySideCardHeader>
            <AdminSectionTitle icon="plus">{addStreamTitle}</AdminSectionTitle>
            <CardDescription>{addStreamDescription}</CardDescription>
          </StickySideCardHeader>
          <StickySideCardScrollArea>
            {filteredDestinationOptions.length ? (
              <>
                <SmallText>
                  Launch a full-size stream composer scoped to the currently selected destinations and compatible templates.
                </SmallText>
                <ButtonRow>
                  <AdminFormModal
                    description="Create a new stream using the currently selected destination scope, compatible destinations, providers, and templates."
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
                      uiNowIso={uiNowIso}
                    />
                  </AdminFormModal>
                </ButtonRow>
              </>
            ) : (
              <SmallText>
                {hasConfiguredDestinations
                  ? "No destinations are selected yet. Choose at least one destination above before creating a stream."
                  : "No destinations are configured yet. Add a destination first, then come back to create streams for it."}
              </SmallText>
            )}
          </StickySideCardScrollArea>
        </StickySideCard>
      </SectionGrid>

      <RunConfigurationModal
        errorMessage={runConfiguration?.errorMessage || ""}
        onClose={closeRunConfiguration}
        onConfirm={handleRunConfigurationConfirm}
        open={Boolean(runConfiguration)}
        runInProgress={isRunInProgress}
        scopeLabel={runConfiguration?.scopeLabel || ""}
        streams={runConfiguration?.streams || []}
        windowState={runConfiguration?.windowState || defaultRunWindowState}
        onWindowStateChange={(updater) => {
          setRunConfiguration((currentState) => {
            if (!currentState) {
              return currentState;
            }

            const nextWindowState =
              typeof updater === "function" ? updater(currentState.windowState) : updater;

            return {
              ...currentState,
              errorMessage: "",
              windowState: nextWindowState,
            };
          });
        }}
      />
      <RunProgressModal onClose={closeRunReport} runState={runState} />
    </>
  );
}
