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
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import AppIcon from "@/components/common/app-icon";
import StreamFormCard from "@/components/admin/stream-form-card";

const TargetingCard = styled.section`
  background:
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.09), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(247, 250, 253, 0.96));
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: 18px;
  box-shadow:
    0 12px 28px rgba(17, 31, 55, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.68);
  display: grid;
  gap: 0.75rem;
  overflow: hidden;
  padding: clamp(0.72rem, 1.8vw, 0.9rem);
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
  border-radius: 16px;
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

const ActionRow = styled.div`
  align-items: center;
  display: grid;
  gap: 0.55rem;

  @media (min-width: 860px) {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto;
  }
`;

const TargetSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
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
  font-size: 0.68rem;
  font-weight: 800;
  gap: 0.35rem;
  min-height: 30px;
  padding: 0 0.62rem;
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
  font-size: 0.76rem;
  font-weight: 800;
  gap: 0.42rem;
  min-height: 36px;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0 0.82rem;
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    box-shadow: ${({ disabled }) =>
      disabled ? "0 12px 24px rgba(15, 96, 121, 0.18)" : "0 16px 30px rgba(15, 96, 121, 0.22)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }

  svg {
    display: block;
    height: 0.9rem;
    width: 0.9rem;
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
  border-radius: clamp(20px, 3vw, 28px);
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
  border-radius: 999px;
  color: #22344f;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  display: inline-flex;
  flex: 0 0 auto;
  height: 2.2rem;
  justify-content: center;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
  width: 2.2rem;

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
    border-radius: 999px;
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
  border-radius: 14px;
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

const ScopeGroupCard = styled.section`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(250, 252, 255, 0.9));
  border: 1px solid rgba(16, 32, 51, 0.06);
  border-radius: 14px;
  display: grid;
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
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  display: inline-flex;
  font-size: 0.66rem;
  font-weight: 800;
  min-height: 28px;
  opacity: ${({ disabled }) => (disabled ? 0.52 : 1)};
  padding: 0 0.62rem;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: ${({ disabled }) =>
      disabled ? "rgba(16, 32, 51, 0.08)" : "rgba(15, 111, 141, 0.18)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

const ScopeCheckbox = styled.label`
  align-items: center;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, #0f6f8d 0%, #0d5f79 100%)"
      : "rgba(255, 255, 255, 0.92)"};
  border: 1px solid ${({ $active }) => ($active ? "transparent" : "rgba(16, 32, 51, 0.09)")};
  border-radius: 14px;
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

const ScopeDestinationBadge = styled.span`
  align-items: center;
  background: ${({ $platform }) =>
    $platform === "FACEBOOK"
      ? "rgba(24, 119, 242, 0.14)"
      : $platform === "INSTAGRAM"
        ? "rgba(225, 48, 108, 0.14)"
        : "rgba(15, 111, 141, 0.12)"};
  border: 1px solid ${({ $platform }) =>
    $platform === "FACEBOOK"
      ? "rgba(24, 119, 242, 0.18)"
      : $platform === "INSTAGRAM"
        ? "rgba(225, 48, 108, 0.18)"
        : "rgba(15, 111, 141, 0.16)"};
  border-radius: 12px;
  color: ${({ $platform }) =>
    $platform === "FACEBOOK"
      ? "#1666d3"
      : $platform === "INSTAGRAM"
        ? "#b42357"
        : "#0d5f79"};
  display: inline-flex;
  flex: 0 0 auto;
  height: 1.7rem;
  justify-content: center;
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

const ScopeCount = styled.span`
  align-items: center;
  background: ${({ $active }) =>
    $active ? "rgba(255, 255, 255, 0.16)" : "rgba(36, 75, 115, 0.08)"};
  border: 1px solid ${({ $active }) =>
    $active ? "rgba(255, 255, 255, 0.16)" : "rgba(36, 75, 115, 0.12)"};
  border-radius: 999px;
  color: inherit;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.62rem;
  font-weight: 800;
  min-height: 20px;
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
  border-radius: 14px;
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

const StreamsGrid = styled(SectionGrid)`
  @media (min-width: 1080px) {
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
  }
`;

const StreamRecord = styled(RecordCard)`
  gap: 0.72rem;
`;

const StreamIdentityHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 0.65rem;
  min-width: 0;
`;

const StreamPlatformBadge = styled.span`
  align-items: center;
  background: ${({ $platform }) =>
    $platform === "FACEBOOK"
      ? "linear-gradient(180deg, rgba(24, 119, 242, 0.16), rgba(24, 119, 242, 0.08))"
      : $platform === "INSTAGRAM"
        ? "linear-gradient(180deg, rgba(225, 48, 108, 0.16), rgba(225, 48, 108, 0.08))"
        : "linear-gradient(180deg, rgba(15, 111, 141, 0.16), rgba(15, 111, 141, 0.08))"};
  border: 1px solid ${({ $platform }) =>
    $platform === "FACEBOOK"
      ? "rgba(24, 119, 242, 0.18)"
      : $platform === "INSTAGRAM"
        ? "rgba(225, 48, 108, 0.18)"
        : "rgba(15, 111, 141, 0.18)"};
  border-radius: 14px;
  color: ${({ $platform }) =>
    $platform === "FACEBOOK"
      ? "#1666d3"
      : $platform === "INSTAGRAM"
        ? "#b42357"
        : "#0d5f79"};
  display: inline-flex;
  flex: 0 0 auto;
  height: 2.35rem;
  justify-content: center;
  width: 2.35rem;

  svg {
    display: block;
    height: 1rem;
    width: 1rem;
  }
`;

const StreamIdentityCopy = styled.div`
  display: grid;
  gap: 0.16rem;
  min-width: 0;
`;

const StreamInlineMeta = styled(SmallText)`
  align-items: center;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.38rem;

  svg {
    flex: 0 0 auto;
    height: 0.82rem;
    width: 0.82rem;
  }
`;

const StreamActions = styled(ButtonRow)`
  justify-content: flex-start;
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

function getDestinationPlatformIcon(platform) {
  if (platform === "FACEBOOK") {
    return "facebook";
  }

  if (platform === "INSTAGRAM") {
    return "instagram";
  }

  return "globe";
}

function getStreamDeleteDescription(stream) {
  return `This will permanently remove ${stream.name} and also delete its fetch checkpoints, fetch history, article matches, publish attempts, and category assignments.`;
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

const preferredDestinationGroupOrder = Object.freeze(["WEBSITE", "FACEBOOK", "INSTAGRAM"]);

function compareDestinationGroupKeys(left, right) {
  const normalizedLeft = `${left || ""}`.trim().toUpperCase();
  const normalizedRight = `${right || ""}`.trim().toUpperCase();
  const leftIndex = preferredDestinationGroupOrder.indexOf(normalizedLeft);
  const rightIndex = preferredDestinationGroupOrder.indexOf(normalizedRight);

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
  }

  return normalizedLeft.localeCompare(normalizedRight);
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

export default function StreamManagementScreen({
  categoryOptions,
  deleteStreamAction,
  destinationOptions,
  modeOptions,
  providerOptions,
  saveStreamAction,
  statusOptions,
  streams,
  templateOptions,
}) {
  const router = useRouter();
  const [selectedDestinationIds, setSelectedDestinationIds] = useState(() =>
    destinationOptions.map((destination) => destination.value).filter(Boolean),
  );
  const [runState, setRunState] = useState(null);
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

      const streamCount = streamCountsByDestination.get(destination.value) || 0;

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
                <RunActionForm>
                  <PrimaryActionButton
                    disabled={!runnableStreams.length || isRunInProgress}
                    onClick={handleRunSelected}
                    type="button"
                  >
                    <AppIcon name="bolt" size={14} />
                    Run selected
                    <ScopeCount $active>{runnableStreams.length}</ScopeCount>
                  </PrimaryActionButton>
                </RunActionForm>
              </ScopeActions>
            </ActionRow>
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
                                  <ScopeDestinationBadge $platform={destination.platform}>
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
          </TargetingCopy>

          <TargetingNotes>
            <NoteCard>
              <NoteLabel>Active scope</NoteLabel>
              <NoteText>{activeScopeText}</NoteText>
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

      <StreamsGrid $wide>
        <Card>
          <CardHeader>
            <CardTitle>
              <TitleWithIcon>
                <AppIcon name="streams" size={16} />
                {streamsSectionTitle}
              </TitleWithIcon>
            </CardTitle>
            <CardDescription>{streamsSectionDescription}</CardDescription>
          </CardHeader>
          <RecordStack>
            {filteredStreams.length ? (
              filteredStreams.map((stream) => (
                <StreamRecord key={stream.id}>
                  <RecordHeader>
                    <RecordTitleBlock>
                      <StreamIdentityHeader>
                        <StreamPlatformBadge $platform={stream.destination?.platform || "WEBSITE"}>
                          <AppIcon
                            name={getDestinationPlatformIcon(stream.destination?.platform || "WEBSITE")}
                            size={16}
                          />
                        </StreamPlatformBadge>
                        <StreamIdentityCopy>
                          <RecordTitle>{stream.name}</RecordTitle>
                          <StreamInlineMeta>
                            <AppIcon
                              name={getDestinationPlatformIcon(stream.destination?.platform || "WEBSITE")}
                              size={12}
                            />
                            {stream.destination?.name || "Unknown destination"}
                            <AppIcon name="server" size={12} />
                            {stream.activeProvider?.label || "Unknown provider"}
                          </StreamInlineMeta>
                        </StreamIdentityCopy>
                      </StreamIdentityHeader>
                    </RecordTitleBlock>
                    <RecordMeta>
                      <MetaPill>
                        <AppIcon
                          name={getDestinationPlatformIcon(stream.destination?.platform || "UNKNOWN")}
                          size={11}
                        />{" "}
                        {formatEnumLabel(stream.destination?.platform || "UNKNOWN")}
                      </MetaPill>
                      <MetaPill>
                        <AppIcon name="server" size={11} /> {stream.activeProvider?.label || "Provider"}
                      </MetaPill>
                      <MetaPill>{formatEnumLabel(stream.mode)}</MetaPill>
                      <StatusBadge $tone={getTone(stream.status)}>{stream.status}</StatusBadge>
                    </RecordMeta>
                  </RecordHeader>
                  <StreamInlineMeta>
                    <AppIcon name="layout" size={12} />
                    Template: {stream.defaultTemplate?.name || "No explicit template"}
                    <AppIcon name="clock" size={12} />
                    Locale {stream.locale} | {stream.timezone}
                  </StreamInlineMeta>
                  <SmallText>
                    Scheduling, targeting rules, provider filters, and template selection now open in a full-workspace modal.
                  </SmallText>
                  <StreamActions>
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
                  </StreamActions>
                </StreamRecord>
              ))
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

        <StickyCard>
          <StickyHeader>
            <CardTitle>
              <TitleWithIcon>
                <AppIcon name="plus" size={16} />
                {addStreamTitle}
              </TitleWithIcon>
            </CardTitle>
            <CardDescription>{addStreamDescription}</CardDescription>
          </StickyHeader>
          <StickyScrollArea>
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
          </StickyScrollArea>
        </StickyCard>
      </StreamsGrid>

      <RunProgressModal onClose={closeRunReport} runState={runState} />
    </>
  );
}
