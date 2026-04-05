"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled, { css } from "styled-components";

import SearchableSelect from "@/components/common/searchable-select";
import { createAdminGenerationFormState, validateAdminGenerationInput } from "@/features/generator/admin-input";
import { generationStageOrder, generationTerminalStageIds } from "@/lib/generation/stages";
import { sanitizeHtmlFragment } from "@/lib/security";
import {
  generationArticleDepthValues,
  generationRequestDefaults,
  generationTargetAudienceValues,
} from "@/lib/validation";
import { resetGeneratorState, setGeneratorState } from "@/store/slices/generator-slice";

const articleDepthLabels = Object.freeze({
  complete: "Complete guide",
  fast: "Fast orientation",
  maintenance: "Maintenance focus",
  repair: "Repair and troubleshooting",
});

function formatAudienceLabel(value) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatStageLabel(copy, stageId) {
  if (stageId === generationStageOrder[0]) {
    return copy.stageDuplicateCheck;
  }

  if (stageId === generationStageOrder[1]) {
    return copy.stageComposingDraft;
  }

  if (stageId === generationStageOrder[2]) {
    return copy.stageSavingDraft;
  }

  return copy.stageDraftSaved;
}

function formatProviderLabel(providerConfig) {
  if (!providerConfig) {
    return "";
  }

  return `${providerConfig.providerLabel || providerConfig.provider} / ${providerConfig.model}`;
}

function formatSelectBadge(copyValue) {
  return `${copyValue || ""}`.replace(/[()]/g, "").trim();
}

function getArticleDepthDescription(value) {
  if (value === "fast") {
    return "Short orientation focused on the essentials and immediate context.";
  }

  if (value === "maintenance") {
    return "Prioritizes servicing, preventive checks, and ongoing upkeep guidance.";
  }

  if (value === "repair") {
    return "Emphasizes diagnostics, likely faults, and repair workflow details.";
  }

  return "Broad coverage with usage, maintenance, troubleshooting, and support context.";
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

function formatLifecycleStatus(status) {
  if (status === "PUBLISHED") {
    return "Live";
  }

  if (status === "SCHEDULED") {
    return "Scheduled";
  }

  if (status === "DRAFT") {
    return "Draft";
  }

  return status || "Draft";
}

function createReviewDraft(preview) {
  if (!preview?.article || !preview?.post?.id) {
    return null;
  }

  return {
    contentHtml: preview.article.contentHtml || "",
    contentMd: preview.article.contentMd || "",
    disclaimer: preview.article.disclaimer || "",
    excerpt: preview.article.excerpt || "",
    faqJson: preview.article.faqJson ?? [],
    locale: preview.locale || generationRequestDefaults.locale,
    postId: preview.post.id,
    structuredContentJson: preview.article.structuredContentJson ?? {},
    title: preview.article.title || "",
  };
}

function getFirstFieldError(fieldErrors, fieldName) {
  return fieldErrors[fieldName]?.[0] || null;
}

function getStageStatus(generator, stageId) {
  const currentStage = generator.currentStage;
  const currentStageIndex = generationStageOrder.indexOf(currentStage);
  const stageIndex = generationStageOrder.indexOf(stageId);

  if (currentStage === generationTerminalStageIds.duplicateCheckBlocked) {
    return stageId === generationStageOrder[0] ? "complete" : "pending";
  }

  if (generator.error) {
    if (stageIndex < currentStageIndex) {
      return "complete";
    }

    if (stageIndex === currentStageIndex) {
      return "error";
    }

    return "pending";
  }

  if (currentStage === generationStageOrder[3]) {
    return "complete";
  }

  if (generator.loading) {
    if (stageIndex < currentStageIndex) {
      return "complete";
    }

    if (stageIndex === currentStageIndex) {
      return "current";
    }

    return "pending";
  }

  return "pending";
}

const Page = styled.main`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  margin: 0 auto;
  max-width: 1340px;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.2), transparent 38%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.14), rgba(16, 32, 51, 0.03));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
  padding: ${({ theme }) => theme.spacing.xl};
  position: relative;
`;

const HeroGlow = styled.div`
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.45), transparent);
  inset: 0;
  pointer-events: none;
  position: absolute;
`;

const Eyebrow = styled.p`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0;
  position: relative;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: clamp(2rem, 5vw, 3.3rem);
  line-height: 1.05;
  margin: 0;
  position: relative;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.7;
  margin: 0;
  max-width: 880px;
  position: relative;
`;

const Layout = styled.section`
  align-items: start;
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: 1060px) {
    grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  }
`;

const Stack = styled.div`
  align-content: start;
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  min-width: 0;
`;

const Card = styled.section`
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 22px 60px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
  overflow: hidden;
  padding: ${({ theme }) => theme.spacing.lg};
  position: relative;

  &::before {
    background: linear-gradient(90deg, rgba(0, 95, 115, 0.16), rgba(201, 123, 42, 0.12));
    content: "";
    height: 3px;
    inset: 0 0 auto;
    position: absolute;
  }
`;

const CardTitle = styled.h2`
  font-size: 1.08rem;
  margin: 0;
`;

const SmallText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.6;
  margin: 0;
`;

const MutedValue = styled.span`
  color: ${({ theme }) => theme.colors.muted};
`;

const SummaryList = styled.dl`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  margin: 0;
`;

const SummaryRow = styled.div`
  background: rgba(247, 249, 252, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
  padding: ${({ theme }) => theme.spacing.md};
`;

const SummaryLabel = styled.dt`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0;
  text-transform: uppercase;
`;

const SummaryValue = styled.dd`
  font-weight: 700;
  line-height: 1.45;
  margin: 0;
  overflow-wrap: anywhere;
`;

const ProgressHeader = styled.div`
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const ProgressValue = styled.strong`
  font-size: clamp(1.8rem, 3vw, 2.3rem);
  line-height: 1;
`;

const ProgressBarTrack = styled.div`
  background: rgba(16, 32, 51, 0.08);
  border-radius: 999px;
  height: 12px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div`
  background: linear-gradient(90deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.accent});
  border-radius: inherit;
  height: 100%;
  transition: width 180ms ease;
  width: ${({ $value }) => `${$value}%`};
`;

const StageList = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StageItem = styled.li`
  align-items: start;
  background: ${({ $state }) =>
    $state === "error"
      ? "rgba(180, 35, 24, 0.08)"
      : $state === "current"
        ? "rgba(0, 95, 115, 0.08)"
        : $state === "complete"
          ? "rgba(21, 115, 71, 0.08)"
          : "rgba(247, 249, 252, 0.92)"};
  border: 1px solid
    ${({ $state, theme }) =>
      $state === "error"
        ? "rgba(180, 35, 24, 0.24)"
        : $state === "current"
          ? "rgba(0, 95, 115, 0.24)"
          : $state === "complete"
            ? "rgba(21, 115, 71, 0.24)"
            : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 0;
  padding: ${({ theme }) => theme.spacing.md};
`;

const StageMarker = styled.span`
  align-items: center;
  background: ${({ $state, theme }) =>
    $state === "error"
      ? theme.colors.danger
      : $state === "current"
        ? theme.colors.primary
        : $state === "complete"
          ? theme.colors.success
          : "rgba(88, 97, 116, 0.2)"};
  border-radius: 999px;
  color: ${({ $state }) => ($state === "pending" ? "#102033" : "white")};
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  height: 1.8rem;
  justify-content: center;
  width: 1.8rem;
`;

const StageText = styled.span`
  color: ${({ $state, theme }) =>
    $state === "error"
      ? theme.colors.danger
      : $state === "current"
        ? theme.colors.primary
        : $state === "complete"
          ? theme.colors.success
          : theme.colors.text};
  font-weight: ${({ $state }) => ($state === "current" ? 700 : 600)};
  line-height: 1.45;
  overflow-wrap: anywhere;
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Pill = styled.span`
  background: ${({ $tone, theme }) =>
    $tone === "primary"
      ? "rgba(0, 95, 115, 0.12)"
      : $tone === "accent"
        ? "rgba(201, 123, 42, 0.18)"
        : $tone === "danger"
          ? "rgba(180, 35, 24, 0.12)"
          : $tone === "success"
            ? "rgba(21, 115, 71, 0.12)"
            : "rgba(88, 97, 116, 0.12)"};
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text};
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.28rem 0.68rem;
`;

const StatusBanner = styled.div`
  background: ${({ $tone, theme }) =>
    $tone === "success"
      ? "rgba(21, 115, 71, 0.12)"
      : $tone === "warning"
        ? "rgba(201, 123, 42, 0.16)"
        : "rgba(180, 35, 24, 0.12)"};
  border: 1px solid
    ${({ $tone, theme }) =>
      $tone === "success"
        ? theme.colors.success
        : $tone === "warning"
          ? theme.colors.accent
          : theme.colors.danger};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
`;

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
`;

const FieldGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};

  @media (min-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;

  ${({ $spanFull }) =>
    $spanFull
      ? css`
          @media (min-width: 900px) {
            grid-column: 1 / -1;
          }
        `
      : ""}
`;

const FieldControlRow = styled.div`
  background:
    linear-gradient(135deg, rgba(0, 95, 115, 0.08), rgba(208, 138, 66, 0.08)),
    rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(0, 95, 115, 0.14);
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
`;

const FieldActionGroup = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const FieldLabel = styled.span`
  font-weight: 600;
`;

const FieldLabelRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const FieldLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  display: inline-flex;
  font-size: 0.9rem;
  font-weight: 700;
`;

const TextInput = styled.input`
  background: white;
  border: 1px solid ${({ $invalid, theme }) => ($invalid ? theme.colors.danger : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  min-height: 3.4rem;
  min-width: 0;
  padding: 0.9rem 1rem;
  width: 100%;
`;

const Textarea = styled.textarea`
  background: white;
  border: 1px solid ${({ $invalid, theme }) => ($invalid ? theme.colors.danger : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  color: ${({ theme }) => theme.colors.text};
  min-height: ${({ $rows }) => `${$rows * 1.65}rem`};
  padding: 0.92rem 1rem;
  resize: vertical;
  width: 100%;
`;

const FieldError = styled.span`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.9rem;
`;

const OptionGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const OptionCard = styled.label`
  background: ${({ $selected }) =>
    $selected ? "rgba(0, 95, 115, 0.08)" : "rgba(247, 249, 252, 0.9)"};
  border: 1px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
`;

const OptionHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Checkbox = styled.input`
  accent-color: ${({ theme }) => theme.colors.primary};
  height: 1.05rem;
  width: 1.05rem;
`;

const Divider = styled.div`
  background: ${({ theme }) => theme.colors.border};
  height: 1px;
  width: 100%;
`;

const FormStatus = styled(SmallText)`
  min-height: 1.6rem;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Button = styled.button`
  background: ${({ $tone, theme }) =>
    $tone === "secondary"
      ? "rgba(255, 255, 255, 0.98)"
      : $tone === "danger"
        ? theme.colors.danger
        : theme.colors.primary};
  border: 1px solid ${({ $tone, theme }) => ($tone === "secondary" ? theme.colors.border : "transparent")};
  border-radius: 999px;
  box-shadow: ${({ $tone }) =>
    $tone === "secondary" ? "0 10px 22px rgba(16, 32, 51, 0.08)" : "0 14px 28px rgba(0, 95, 115, 0.18)"};
  color: ${({ $tone }) => ($tone === "secondary" ? "inherit" : "white")};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font-weight: 700;
  opacity: ${({ disabled }) => (disabled ? 0.65 : 1)};
  padding: 0.82rem 1.24rem;
`;

const InlineSubmitButton = styled(Button)`
  align-items: center;
  display: inline-flex;
  justify-content: center;
  min-height: 56px;
  width: 100%;
`;

const LinkButton = styled(Link)`
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  display: inline-flex;
  font-weight: 700;
  padding: 0.82rem 1.24rem;
`;

const PreviewGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: 1080px) {
    grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  }
`;

const PreviewFrame = styled.article`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 252, 0.94));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow:
    0 24px 48px rgba(16, 32, 51, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
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
  gap: ${({ theme }) => theme.spacing.lg};
  padding: 0 ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.lg};
`;

const PreviewArticle = styled.div`
  background: white;
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: ${({ theme }) => theme.radius.md};
  line-height: 1.7;
  overflow: hidden;
  padding: ${({ theme }) => theme.spacing.lg};

  article {
    display: grid;
    gap: ${({ theme }) => theme.spacing.md};
  }

  figure {
    background: linear-gradient(180deg, rgba(244, 248, 252, 0.98), rgba(255, 255, 255, 0.98));
    border: 1px solid rgba(16, 32, 51, 0.08);
    border-radius: ${({ theme }) => theme.radius.md};
    margin: 0;
    overflow: hidden;
    padding: ${({ theme }) => theme.spacing.sm};
  }

  figcaption {
    color: ${({ theme }) => theme.colors.muted};
    font-size: 0.92rem;
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.xs} 0;
  }

  h1,
  h2,
  h3 {
    line-height: 1.15;
  }

  img {
    aspect-ratio: 16 / 9;
    background: rgba(16, 32, 51, 0.05);
    border-radius: ${({ theme }) => theme.radius.sm};
    display: block;
    height: auto;
    object-fit: cover;
    width: 100%;
  }

  p,
  ul,
  ol {
    margin: 0;
  }
`;

const CodePanel = styled.pre`
  background: rgba(16, 32, 51, 0.98);
  border-radius: ${({ theme }) => theme.radius.md};
  color: rgba(255, 255, 255, 0.92);
  margin: 0;
  overflow: auto;
  padding: ${({ theme }) => theme.spacing.lg};
  white-space: pre-wrap;
`;

const MetaGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};

  @media (min-width: 780px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const MetaCard = styled.div`
  background: rgba(247, 249, 252, 0.86);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
`;

const MetaLabel = styled.strong`
  font-size: 0.9rem;
`;

const WarningList = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  margin: 0;
  padding-left: 1.2rem;
`;

const PermissionNote = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.92rem;
  margin: 0;
`;

const SecondaryActions = styled.div`
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

const ActionPanelLabel = styled.strong`
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export default function GeneratePostScreen({ copy, initialData }) {
  const dispatch = useDispatch();
  const generator = useSelector((state) => state.generator);
  const timersRef = useRef([]);
  const [formData, setFormData] = useState(() => createAdminGenerationFormState(initialData.defaults));
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [reviewDraft, setReviewDraft] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [publishState, setPublishState] = useState("idle");
  const [workflowSnapshot, setWorkflowSnapshot] = useState(null);
  const [generationIntent, setGenerationIntent] = useState("draft");
  const [scheduleIntent, setScheduleIntent] = useState(
    initialData.defaults.schedulePublishAt ? "schedule" : "draft",
  );
  const [scheduleConfirmationOpen, setScheduleConfirmationOpen] = useState(false);

  const activeProviderConfig =
    initialData.providerConfigs.find((providerConfig) => providerConfig.id === formData.providerConfigId) ||
    null;
  const providerBadgeLabel = formatSelectBadge(copy.defaultProviderSuffix) || "Default";
  const providerOptions = useMemo(
    () =>
      initialData.providerConfigs.map((providerConfig) => ({
        badge: providerConfig.isDefault
          ? providerBadgeLabel
          : providerConfig.purpose === "draft_generation_fallback"
            ? "Fallback"
            : "",
        description:
          providerConfig.purpose === "draft_generation_fallback"
            ? `Fallback config. ${providerConfig.credentialLabel || ""}`.trim()
            : providerConfig.credentialLabel || "",
        label: formatProviderLabel(providerConfig),
        value: providerConfig.id,
      })),
    [initialData.providerConfigs, providerBadgeLabel],
  );
  const localeOptions = useMemo(
    () =>
      initialData.localeOptions.map((localeOption) => ({
        badge: localeOption.isDefault ? "Default" : "",
        label: `${localeOption.name} (${localeOption.code})`,
        value: localeOption.code,
      })),
    [initialData.localeOptions],
  );
  const articleDepthOptions = useMemo(
    () =>
      generationArticleDepthValues.map((value) => ({
        description: getArticleDepthDescription(value),
        label: articleDepthLabels[value],
        value,
      })),
    [],
  );

  function clearProgressTimers() {
    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId);
    }

    timersRef.current = [];
  }

  useEffect(() => {
    dispatch(resetGeneratorState());

    return () => {
      clearProgressTimers();
      dispatch(resetGeneratorState());
    };
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      setGeneratorState({
        articleDepth: formData.articleDepth,
        equipmentName: formData.equipmentName,
        includeFaults: formData.includeFaults,
        includeImages: formData.includeImages,
        includeManualLinks: formData.includeManualLinks,
        includeManufacturers: formData.includeManufacturers,
        includeModels: formData.includeModels,
        locale: formData.locale,
        schedulePublishAt: formData.schedulePublishAt,
        selectedProviderConfigId: formData.providerConfigId || null,
        targetAudience: formData.targetAudience,
      }),
    );
  }, [dispatch, formData]);

  function handleFormPatch(patch, options = {}) {
    setFormData((currentFormData) => ({
      ...currentFormData,
      ...patch,
    }));

    if (options.clearDuplicate) {
      dispatch(
        setGeneratorState({
          duplicateDecision: null,
          duplicateMatch: null,
          error: null,
          status: generator.preview ? "ready" : "idle",
        }),
      );
    }
  }

  function handleTargetAudienceToggle(audience) {
    const nextAudiences = formData.targetAudience.includes(audience)
      ? formData.targetAudience.filter((entry) => entry !== audience)
      : [...formData.targetAudience, audience];

    handleFormPatch({
      targetAudience: nextAudiences,
    });
  }

  function startProgressTracking() {
    clearProgressTimers();
    timersRef.current = [
      window.setTimeout(() => {
        dispatch(
          setGeneratorState({
            currentStage: generationStageOrder[1],
            progress: 52,
          }),
        );
      }, 700),
      window.setTimeout(() => {
        dispatch(
          setGeneratorState({
            currentStage: generationStageOrder[2],
            progress: 82,
          }),
        );
      }, 2200),
    ];
  }

  async function publishPostById(postId, publishAt = null, options = {}) {
    const { afterGeneration = false } = options;

    if (!postId) {
      throw new Error(copy.unknownError);
    }

    setPublishState(publishAt ? "scheduling" : "publishing");
    setNotice(null);

    try {
      const response = await fetch("/api/publish-post", {
        body: JSON.stringify({
          postId,
          publishAt,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const responsePayload = await response.json();

      if (responsePayload.status === "scaffold_only") {
        setNotice({
          kind: "warning",
          message: copy.publishScaffolded,
        });
        return false;
      }

      if (!response.ok) {
        throw new Error(responsePayload.message || copy.publishErrorPrefix);
      }

      startTransition(() => {
        setWorkflowSnapshot(responsePayload.data?.snapshot || null);
      });

      setNotice({
        kind: "success",
        message: afterGeneration ? copy.generateAndPublishSuccess : publishAt ? copy.scheduleSuccess : copy.publishSuccess,
      });

      return true;
    } catch (error) {
      setNotice({
        kind: "error",
        message: afterGeneration
          ? `${copy.generateAndPublishErrorPrefix}: ${error.message}`
          : `${publishAt ? copy.scheduleErrorPrefix : copy.publishErrorPrefix}: ${error.message}`,
      });
      return false;
    } finally {
      setPublishState("idle");
    }
  }

  async function submitGenerationRequest(replaceExistingPost = false, options = {}) {
    const { autoPublish = false } = options;
    const payload = {
      ...formData,
      replaceExistingPost,
    };
    const validation = validateAdminGenerationInput(payload, {
      duplicateDetected: replaceExistingPost || Boolean(generator.duplicateMatch),
    });

    if (!validation.success) {
      setFieldErrors(validation.error.flatten().fieldErrors);
      setNotice({
        kind: "error",
        message: copy.fieldErrorPrefix,
      });
      return;
    }

    setFieldErrors({});
    setGenerationIntent(autoPublish ? "publish" : "draft");
    setNotice(null);
    setScheduleConfirmationOpen(false);
    setReviewDraft(null);
    setSaveState("idle");
    setPublishState("idle");
    setWorkflowSnapshot(null);
    dispatch(
      setGeneratorState({
        currentStage: generationStageOrder[0],
        duplicateDecision: null,
        duplicateMatch: null,
        error: null,
        jobId: null,
        loading: true,
        preview: null,
        progress: 14,
        replaceExistingPost,
        resultPostId: null,
        status: "generating",
        warnings: [],
      }),
    );
    startProgressTracking();

    try {
      const response = await fetch("/api/generate-post", {
        body: JSON.stringify(validation.data),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const responsePayload = await response.json();

      clearProgressTimers();

      if (response.ok) {
        const nextReviewDraft = createReviewDraft(responsePayload.preview);
        const postId = responsePayload.postId || nextReviewDraft?.postId || responsePayload.preview?.post?.id || null;

        startTransition(() => {
          setReviewDraft(nextReviewDraft);
          dispatch(
            setGeneratorState({
              currentStage: generationStageOrder[3],
              duplicateDecision: responsePayload.preview?.duplicateCheck?.duplicateDetected
                ? replaceExistingPost
                  ? "replace_existing"
                  : "create_new"
                : "create_new",
              duplicateMatch: responsePayload.preview?.duplicateCheck?.duplicateMatch || null,
              error: null,
              jobId: responsePayload.jobId,
              loading: false,
              preview: responsePayload.preview || null,
              progress: 100,
              resultPostId: postId,
              status: "ready",
              warnings: responsePayload.warnings || [],
            }),
          );
        });

        if (autoPublish) {
          await publishPostById(postId, null, {
            afterGeneration: true,
          });
          return;
        }

        setNotice({
          kind: "success",
          message:
            responsePayload.preview?.duplicateCheck?.duplicateDetected && replaceExistingPost
              ? copy.replaceSuccess
              : copy.generateSuccess,
        });

        return;
      }

      if (responsePayload.status === "duplicate_post_detected") {
        dispatch(
          setGeneratorState({
            currentStage: generationTerminalStageIds.duplicateCheckBlocked,
            duplicateDecision: responsePayload.details?.duplicateDecision || "replace_required",
            duplicateMatch: responsePayload.details?.duplicateCheck?.duplicateMatch || null,
            error: null,
            jobId: responsePayload.details?.jobId || null,
            loading: false,
            progress: 28,
            status: "duplicate_blocked",
            warnings: [],
          }),
        );
        setNotice({
          kind: "warning",
          message: responsePayload.message,
        });

        return;
      }

      dispatch(
        setGeneratorState({
          currentStage: generator.currentStage === "idle" ? generationStageOrder[0] : generator.currentStage,
          error: responsePayload.message || copy.generateErrorPrefix,
          loading: false,
          progress: generator.progress || 18,
          status: "error",
        }),
      );
      setNotice({
        kind: "error",
        message: `${copy.generateErrorPrefix}: ${responsePayload.message || copy.unknownError}`,
      });
    } catch (error) {
      clearProgressTimers();
      dispatch(
        setGeneratorState({
          error: error.message,
          loading: false,
          progress: generator.progress || 18,
          status: "error",
        }),
      );
      setNotice({
        kind: "error",
        message: `${copy.generateErrorPrefix}: ${error.message}`,
      });
    }
  }

  async function handleGenerate(event) {
    event.preventDefault();
    await submitGenerationRequest(false, {
      autoPublish: false,
    });
  }

  async function handleGenerateAndPublish() {
    await submitGenerationRequest(false, {
      autoPublish: true,
    });
  }

  async function handleSaveDraft() {
    if (!reviewDraft) {
      return;
    }

    setSaveState("saving");
    setNotice(null);

    try {
      const response = await fetch("/api/save-draft", {
        body: JSON.stringify({
          contentHtml: reviewDraft.contentHtml,
          contentMd: reviewDraft.contentMd,
          disclaimer: reviewDraft.disclaimer,
          excerpt: reviewDraft.excerpt,
          faqJson: reviewDraft.faqJson,
          locale: reviewDraft.locale,
          postId: reviewDraft.postId,
          structuredContentJson: reviewDraft.structuredContentJson,
          title: reviewDraft.title,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const responsePayload = await response.json();

      if (!response.ok) {
        throw new Error(responsePayload.message || copy.saveDraftErrorPrefix);
      }

      startTransition(() => {
        dispatch(
          setGeneratorState({
            preview: generator.preview
              ? {
                  ...generator.preview,
                  article: {
                    ...generator.preview.article,
                    disclaimer: reviewDraft.disclaimer,
                    excerpt: reviewDraft.excerpt,
                    title: reviewDraft.title,
                  },
                }
              : generator.preview,
          }),
        );
      });

      setSaveState("saved");
      setNotice({
        kind: "success",
        message: copy.saveDraftSuccess,
      });
    } catch (error) {
      setSaveState("error");
      setNotice({
        kind: "error",
        message: `${copy.saveDraftErrorPrefix}: ${error.message}`,
      });
    }
  }

  async function handlePublish(publishAt = null) {
    const postId = reviewDraft?.postId || generator.resultPostId || generator.preview?.post?.id || null;

    if (!postId) {
      return;
    }

    await publishPostById(postId, publishAt);
  }

  const stageProgress = generator.progress || 0;
  const duplicateMatch = generator.duplicateMatch;
  const duplicateDetected = Boolean(duplicateMatch);
  const resolvedPostId = reviewDraft?.postId || generator.resultPostId || generator.preview?.post?.id || null;
  const resolvedWorkflowPost = workflowSnapshot?.post || null;
  const resolvedPublicPath =
    resolvedWorkflowPost?.status === "PUBLISHED" && resolvedWorkflowPost?.publicPath
      ? resolvedWorkflowPost.publicPath
      : null;
  const lifecycleStatus = resolvedWorkflowPost?.status || (generator.preview ? "DRAFT" : null);
  const lifecycleTimestamp =
    resolvedWorkflowPost?.status === "PUBLISHED"
      ? resolvedWorkflowPost?.publishedAt
      : resolvedWorkflowPost?.status === "SCHEDULED"
        ? resolvedWorkflowPost?.scheduledPublishAt
        : null;
  const isSubmitBusy = generator.loading || publishState !== "idle";
  const generateButtonLabel =
    generator.loading && generationIntent === "draft"
      ? copy.generateWorking
      : copy.generateAction;
  const generateAndPublishButtonLabel =
    generator.loading || (publishState === "publishing" && generationIntent === "publish")
      ? copy.generateAndPublishWorking
      : copy.generateAndPublishAction;
  const scheduleLabel =
    scheduleIntent === "schedule" && formData.schedulePublishAt
      ? `${copy.scheduleIntentPrepared}: ${formatDateTime(formData.schedulePublishAt)}`
      : scheduleIntent === "schedule"
        ? copy.scheduleIntentPrepared
        : copy.scheduleIntentNone;

  return (
    <Page>
      <Hero>
        <HeroGlow />
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Title>{copy.title}</Title>
        <Description>{copy.description}</Description>
      </Hero>
      <Layout>
        <Stack>
          <Card>
            <CardTitle>{copy.summaryTitle}</CardTitle>
            <SmallText>{copy.summaryDescription}</SmallText>
            <SummaryList>
              <SummaryRow>
                <SummaryLabel>{copy.summaryLocale}</SummaryLabel>
                <SummaryValue>{formData.locale}</SummaryValue>
              </SummaryRow>
              <SummaryRow>
                <SummaryLabel>{copy.summaryProvider}</SummaryLabel>
                <SummaryValue>
                  {activeProviderConfig ? formatProviderLabel(activeProviderConfig) : <MutedValue>{copy.noProviders}</MutedValue>}
                </SummaryValue>
              </SummaryRow>
              <SummaryRow>
                <SummaryLabel>{copy.summaryAudience}</SummaryLabel>
                <SummaryValue>{formData.targetAudience.length}</SummaryValue>
              </SummaryRow>
              <SummaryRow>
                <SummaryLabel>{copy.summarySchedule}</SummaryLabel>
                <SummaryValue>{scheduleLabel}</SummaryValue>
              </SummaryRow>
            </SummaryList>
            <PillRow>
              <Pill $tone="primary">{articleDepthLabels[formData.articleDepth]}</Pill>
              {scheduleIntent === "schedule" ? <Pill $tone="accent">{copy.scheduleBadge}</Pill> : null}
              {duplicateDetected ? <Pill $tone="danger">{copy.duplicateBadge}</Pill> : null}
              {generator.preview ? <Pill $tone="success">{copy.previewReadyBadge}</Pill> : null}
            </PillRow>
          </Card>
          <Card>
            <ProgressHeader>
              <div>
                <CardTitle>{copy.stageTitle}</CardTitle>
                <SmallText>
                  {generator.loading
                    ? copy.stageActiveHint
                    : generator.preview
                      ? copy.stageSuccessHint
                      : copy.stageIdle}
                </SmallText>
              </div>
              <ProgressValue>{Math.round(stageProgress)}%</ProgressValue>
            </ProgressHeader>
            <ProgressBarTrack aria-hidden="true">
              <ProgressBarFill $value={stageProgress} />
            </ProgressBarTrack>
            <StageList>
              {initialData.stageOrder.map((stageId, index) => {
                const stageState = getStageStatus(generator, stageId);

                return (
                  <StageItem key={stageId} $state={stageState}>
                    <StageMarker $state={stageState}>{index + 1}</StageMarker>
                    <StageText $state={stageState}>{formatStageLabel(copy, stageId)}</StageText>
                  </StageItem>
                );
              })}
            </StageList>
            {generator.jobId ? (
              <SmallText>
                {copy.resultJobIdLabel}: <strong>{generator.jobId}</strong>
              </SmallText>
            ) : null}
          </Card>
          {generator.warnings?.length ? (
            <Card>
              <CardTitle>{copy.warningsTitle}</CardTitle>
              <WarningList>
                {generator.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </WarningList>
            </Card>
          ) : null}
        </Stack>
        <Stack>
          <Card>
            <CardTitle>{copy.formTitle}</CardTitle>
            <SmallText>{copy.formDescription}</SmallText>
            {notice ? <StatusBanner $tone={notice.kind}>{notice.message}</StatusBanner> : null}
            {!initialData.providerConfigs.length ? (
              <StatusBanner $tone="error">{copy.noProviders}</StatusBanner>
            ) : null}
            <Form onSubmit={handleGenerate}>
              <FieldGrid>
                <Field $spanFull as="div">
                  <FieldLabel>{copy.equipmentNameLabel}</FieldLabel>
                  <FieldControlRow>
                    <TextInput
                      $invalid={Boolean(getFirstFieldError(fieldErrors, "equipmentName"))}
                      onChange={(event) =>
                        handleFormPatch(
                          {
                            equipmentName: event.target.value,
                          },
                          {
                            clearDuplicate: true,
                          },
                        )
                      }
                      value={formData.equipmentName}
                    />
                    <FieldActionGroup>
                      <InlineSubmitButton
                        disabled={isSubmitBusy || !initialData.providerConfigs.length}
                        type="submit"
                      >
                        {generateButtonLabel}
                      </InlineSubmitButton>
                      <InlineSubmitButton
                        $tone="secondary"
                        disabled={
                          isSubmitBusy ||
                          !initialData.permissions.canPublish ||
                          !initialData.providerConfigs.length
                        }
                        onClick={handleGenerateAndPublish}
                        type="button"
                      >
                        {generateAndPublishButtonLabel}
                      </InlineSubmitButton>
                    </FieldActionGroup>
                  </FieldControlRow>
                  {getFirstFieldError(fieldErrors, "equipmentName") ? (
                    <FieldError>{getFirstFieldError(fieldErrors, "equipmentName")}</FieldError>
                  ) : null}
                  {!initialData.permissions.canPublish ? (
                    <SmallText>{copy.publishUnavailable}</SmallText>
                  ) : null}
                </Field>
                <Field $spanFull as="div">
                  <FieldLabelRow>
                    <FieldLabel>{copy.providerLabel}</FieldLabel>
                    {initialData.permissions.canManageProviders ? (
                      <FieldLink href="/admin/providers">{copy.manageProvidersAction}</FieldLink>
                    ) : null}
                  </FieldLabelRow>
                  <SearchableSelect
                    ariaLabel={copy.providerLabel}
                    invalid={Boolean(getFirstFieldError(fieldErrors, "providerConfigId"))}
                    onChange={(nextValue) =>
                      handleFormPatch({
                        providerConfigId: nextValue,
                      })
                    }
                    options={providerOptions}
                    placeholder={copy.providerLabel}
                    searchPlaceholder="Search provider configurations"
                    value={formData.providerConfigId}
                  />
                  {getFirstFieldError(fieldErrors, "providerConfigId") ? (
                    <FieldError>{getFirstFieldError(fieldErrors, "providerConfigId")}</FieldError>
                  ) : null}
                  {activeProviderConfig?.credentialLabel ? (
                    <SmallText>{activeProviderConfig.credentialLabel}</SmallText>
                  ) : null}
                  {initialData.permissions.canManageProviders ? (
                    <SmallText>{copy.manageProvidersHint}</SmallText>
                  ) : null}
                </Field>
              </FieldGrid>
              <FieldGrid>
                <Field as="div">
                  <FieldLabel>{copy.localeLabel}</FieldLabel>
                  <SearchableSelect
                    ariaLabel={copy.localeLabel}
                    disabled
                    options={localeOptions}
                    placeholder={copy.localeLabel}
                    searchPlaceholder="Search locales"
                    value={formData.locale}
                  />
                  <SmallText>{copy.localeHint}</SmallText>
                </Field>
                <Field as="div">
                  <FieldLabel>{copy.articleDepthLabel}</FieldLabel>
                  <SearchableSelect
                    ariaLabel={copy.articleDepthLabel}
                    onChange={(nextValue) =>
                      handleFormPatch({
                        articleDepth: nextValue,
                      })
                    }
                    options={articleDepthOptions}
                    placeholder={copy.articleDepthLabel}
                    searchPlaceholder="Search article depths"
                    value={formData.articleDepth}
                  />
                </Field>
              </FieldGrid>
              <Divider />
              <div>
                <FieldLabel>{copy.targetAudienceLabel}</FieldLabel>
                <SmallText>{copy.targetAudienceHint}</SmallText>
              </div>
              <OptionGrid>
                {generationTargetAudienceValues.map((audience) => {
                  const isSelected = formData.targetAudience.includes(audience);

                  return (
                    <OptionCard key={audience} $selected={isSelected}>
                      <OptionHeader>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleTargetAudienceToggle(audience)}
                          type="checkbox"
                        />
                        <strong>{formatAudienceLabel(audience)}</strong>
                      </OptionHeader>
                      <SmallText>{copy.targetAudienceCardHint}</SmallText>
                    </OptionCard>
                  );
                })}
              </OptionGrid>
              {getFirstFieldError(fieldErrors, "targetAudience") ? (
                <FieldError>{getFirstFieldError(fieldErrors, "targetAudience")}</FieldError>
              ) : null}
              <Divider />
              <div>
                <FieldLabel>{copy.coverageTitle}</FieldLabel>
                <SmallText>{copy.coverageDescription}</SmallText>
              </div>
              <OptionGrid>
                {[
                  ["includeFaults", copy.includeFaultsLabel],
                  ["includeImages", copy.includeImagesLabel],
                  ["includeManualLinks", copy.includeManualLinksLabel],
                  ["includeManufacturers", copy.includeManufacturersLabel],
                  ["includeModels", copy.includeModelsLabel],
                ].map(([fieldName, label]) => (
                  <OptionCard key={fieldName} $selected={Boolean(formData[fieldName])}>
                    <OptionHeader>
                      <Checkbox
                        checked={Boolean(formData[fieldName])}
                        onChange={(event) =>
                          handleFormPatch({
                            [fieldName]: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                      <strong>{label}</strong>
                    </OptionHeader>
                  </OptionCard>
                ))}
              </OptionGrid>
              <Divider />
              <div>
                <FieldLabel>{copy.scheduleTitle}</FieldLabel>
                <SmallText>{copy.scheduleHint}</SmallText>
              </div>
              <OptionGrid>
                <OptionCard $selected={scheduleIntent === "draft"}>
                  <OptionHeader>
                    <Checkbox
                      checked={scheduleIntent === "draft"}
                      name="scheduleIntent"
                      onChange={() => {
                        setScheduleIntent("draft");
                        setScheduleConfirmationOpen(false);
                        handleFormPatch({
                          schedulePublishAt: null,
                        });
                      }}
                      type="radio"
                    />
                    <strong>{copy.scheduleDraftIntent}</strong>
                  </OptionHeader>
                </OptionCard>
                <OptionCard $selected={scheduleIntent === "schedule"}>
                  <OptionHeader>
                    <Checkbox
                      checked={scheduleIntent === "schedule"}
                      name="scheduleIntent"
                      onChange={() => setScheduleIntent("schedule")}
                      type="radio"
                    />
                    <strong>{copy.schedulePrepareIntent}</strong>
                  </OptionHeader>
                </OptionCard>
              </OptionGrid>
              {scheduleIntent === "schedule" ? (
                <Field>
                  <FieldLabel>{copy.scheduleAtLabel}</FieldLabel>
                  <TextInput
                    $invalid={Boolean(getFirstFieldError(fieldErrors, "schedulePublishAt"))}
                    onChange={(event) =>
                      handleFormPatch({
                        schedulePublishAt: toIsoDateTime(event.target.value),
                      })
                    }
                    type="datetime-local"
                    value={toLocalDateTimeInputValue(formData.schedulePublishAt)}
                  />
                  <SmallText>{copy.scheduleConfirmationDescription}</SmallText>
                  {getFirstFieldError(fieldErrors, "schedulePublishAt") ? (
                    <FieldError>{getFirstFieldError(fieldErrors, "schedulePublishAt")}</FieldError>
                  ) : null}
                </Field>
              ) : null}
              <FormStatus>
                {generator.loading
                  ? copy.generateWorking
                  : generator.preview
                    ? copy.previewReadyBadge
                    : copy.stageIdle}
              </FormStatus>
            </Form>
          </Card>
          {duplicateDetected ? (
            <Card>
              <CardTitle>{copy.duplicateTitle}</CardTitle>
              <SmallText>{copy.duplicateDescription}</SmallText>
              <MetaGrid>
                <MetaCard>
                  <MetaLabel>{copy.duplicateSlugLabel}</MetaLabel>
                  <SmallText>{duplicateMatch.slug}</SmallText>
                </MetaCard>
                <MetaCard>
                  <MetaLabel>{copy.resultMetaLabel}</MetaLabel>
                  <SmallText>
                    {duplicateMatch.status} | {duplicateMatch.editorialStage}
                  </SmallText>
                </MetaCard>
                <MetaCard>
                  <MetaLabel>{copy.updatedAtLabel}</MetaLabel>
                  <SmallText>{formatDateTime(duplicateMatch.updatedAt)}</SmallText>
                </MetaCard>
                <MetaCard>
                  <MetaLabel>{copy.localeLabel}</MetaLabel>
                  <SmallText>{duplicateMatch.locale}</SmallText>
                </MetaCard>
              </MetaGrid>
              <SmallText>{copy.replaceHint}</SmallText>
              <ButtonRow>
                <Button
                  $tone="danger"
                  disabled={generator.loading}
                  onClick={() =>
                    submitGenerationRequest(true, {
                      autoPublish: generationIntent === "publish",
                    })
                  }
                  type="button"
                >
                  {generationIntent === "publish" ? copy.replaceAndPublishAction : copy.replaceAction}
                </Button>
                <Button
                  $tone="secondary"
                  onClick={() =>
                    dispatch(
                      setGeneratorState({
                        duplicateDecision: "cancelled",
                        duplicateMatch: null,
                        error: null,
                        status: generator.preview ? "ready" : "idle",
                      }),
                    )
                  }
                  type="button"
                >
                  {copy.cancelDuplicateAction}
                </Button>
              </ButtonRow>
            </Card>
          ) : null}
          <Card>
            <CardTitle>{copy.previewTitle}</CardTitle>
            <SmallText>{copy.previewDescription}</SmallText>
            {!reviewDraft || !generator.preview ? (
              <SmallText>{copy.previewEmpty}</SmallText>
            ) : (
              <PreviewGrid>
                <Stack>
                  <Field>
                    <FieldLabel>{copy.reviewTitleLabel}</FieldLabel>
                    <TextInput
                      onChange={(event) =>
                        setReviewDraft((currentReviewDraft) => ({
                          ...currentReviewDraft,
                          title: event.target.value,
                        }))
                      }
                      value={reviewDraft.title}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{copy.reviewExcerptLabel}</FieldLabel>
                    <Textarea
                      $rows={4}
                      onChange={(event) =>
                        setReviewDraft((currentReviewDraft) => ({
                          ...currentReviewDraft,
                          excerpt: event.target.value,
                        }))
                      }
                      value={reviewDraft.excerpt}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{copy.reviewDisclaimerLabel}</FieldLabel>
                    <Textarea
                      $rows={6}
                      onChange={(event) =>
                        setReviewDraft((currentReviewDraft) => ({
                          ...currentReviewDraft,
                          disclaimer: event.target.value,
                        }))
                      }
                      value={reviewDraft.disclaimer}
                    />
                  </Field>
                  <ButtonRow>
                    <Button disabled={saveState === "saving"} onClick={handleSaveDraft} type="button">
                      {saveState === "saving" ? copy.saveDraftWorking : copy.saveDraftAction}
                    </Button>
                    <Button
                      $tone="secondary"
                      disabled={!initialData.permissions.canPublish || publishState !== "idle"}
                      onClick={() => handlePublish(null)}
                      type="button"
                    >
                      {publishState === "publishing" ? copy.publishWorking : copy.publishAction}
                    </Button>
                    {scheduleIntent === "schedule" ? (
                      <Button
                        $tone="secondary"
                        disabled={!formData.schedulePublishAt}
                        onClick={() => setScheduleConfirmationOpen((currentState) => !currentState)}
                        type="button"
                      >
                        {copy.scheduleReviewAction}
                      </Button>
                    ) : null}
                  </ButtonRow>
                  {!initialData.permissions.canPublish ? (
                    <PermissionNote>{copy.publishUnavailable}</PermissionNote>
                  ) : null}
                  {scheduleIntent === "schedule" && !initialData.permissions.canSchedule ? (
                    <PermissionNote>{copy.scheduleUnavailable}</PermissionNote>
                  ) : null}
                  {scheduleIntent === "schedule" && scheduleConfirmationOpen ? (
                    <StatusBanner $tone="warning">
                      <strong>{copy.scheduleConfirmationTitle}</strong>
                      <SmallText>
                        {copy.scheduleConfirmationDescription}
                        {formData.schedulePublishAt ? ` ${formatDateTime(formData.schedulePublishAt)}.` : ""}
                      </SmallText>
                      <ButtonRow>
                        <Button
                          disabled={
                            !formData.schedulePublishAt ||
                            !initialData.permissions.canSchedule ||
                            publishState !== "idle"
                          }
                          onClick={() => handlePublish(formData.schedulePublishAt)}
                          type="button"
                        >
                          {publishState === "scheduling"
                            ? copy.scheduleWorking
                            : copy.scheduleConfirmAction}
                        </Button>
                      </ButtonRow>
                    </StatusBanner>
                  ) : null}
                  {resolvedPostId ? (
                    <ActionPanel>
                      <ActionPanelLabel>{copy.quickActionsLabel}</ActionPanelLabel>
                      <SecondaryActions>
                        <LinkButton href={`/admin/posts/${resolvedPostId}#content`}>
                          {copy.editDraftAction}
                        </LinkButton>
                        <LinkButton href={`/admin/posts/${resolvedPostId}#workflow`}>
                          {copy.openPostAction}
                        </LinkButton>
                        <LinkButton href={`/admin/posts/${resolvedPostId}`}>
                          {copy.editAndReviewAction}
                        </LinkButton>
                        {resolvedPublicPath ? (
                          <LinkButton href={resolvedPublicPath}>{copy.openLiveAction}</LinkButton>
                        ) : null}
                        <LinkButton
                          href={`/admin/localization?postId=${resolvedPostId}&locale=${reviewDraft.locale}`}
                        >
                          {copy.openLocalizationAction}
                        </LinkButton>
                      </SecondaryActions>
                    </ActionPanel>
                  ) : null}
                </Stack>
                <PreviewFrame>
                  <PreviewHeader>
                    <PillRow>
                      <Pill $tone="accent">{generator.preview.editorialStage}</Pill>
                      <Pill $tone="primary">{formatProviderLabel(generator.preview.providerConfig)}</Pill>
                      {lifecycleStatus ? <Pill $tone="success">{formatLifecycleStatus(lifecycleStatus)}</Pill> : null}
                      {generator.duplicateDecision === "replace_existing" ? (
                        <Pill $tone="danger">{copy.replacedBadge}</Pill>
                      ) : null}
                    </PillRow>
                    <h3>{reviewDraft.title}</h3>
                    <SmallText>{reviewDraft.excerpt}</SmallText>
                  </PreviewHeader>
                  <PreviewBody>
                    <MetaGrid>
                      <MetaCard>
                        <MetaLabel>{copy.resultPostIdLabel}</MetaLabel>
                        <SmallText>{generator.resultPostId}</SmallText>
                      </MetaCard>
                      <MetaCard>
                        <MetaLabel>{copy.resultJobIdLabel}</MetaLabel>
                        <SmallText>{generator.jobId}</SmallText>
                      </MetaCard>
                      <MetaCard>
                        <MetaLabel>{copy.summarySchedule}</MetaLabel>
                        <SmallText>{scheduleLabel}</SmallText>
                      </MetaCard>
                      <MetaCard>
                        <MetaLabel>{copy.lifecycleLabel}</MetaLabel>
                        <SmallText>{lifecycleStatus ? formatLifecycleStatus(lifecycleStatus) : "Draft"}</SmallText>
                      </MetaCard>
                      <MetaCard>
                        <MetaLabel>{copy.lifecycleAtLabel}</MetaLabel>
                        <SmallText>{lifecycleTimestamp ? formatDateTime(lifecycleTimestamp) : "Not live yet"}</SmallText>
                      </MetaCard>
                      <MetaCard>
                        <MetaLabel>{copy.seoTitle}</MetaLabel>
                        <SmallText>{generator.preview.seoPayload.metaTitle}</SmallText>
                      </MetaCard>
                    </MetaGrid>
                    <PreviewArticle
                      aria-label={copy.contentPreviewTitle}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtmlFragment(reviewDraft.contentHtml) }}
                    />
                    <MetaCard>
                      <MetaLabel>{copy.reviewDisclaimerLabel}</MetaLabel>
                      <SmallText>{reviewDraft.disclaimer}</SmallText>
                    </MetaCard>
                    <MetaCard>
                      <MetaLabel>{copy.markdownTitle}</MetaLabel>
                      <CodePanel>{reviewDraft.contentMd}</CodePanel>
                    </MetaCard>
                  </PreviewBody>
                </PreviewFrame>
              </PreviewGrid>
            )}
          </Card>
        </Stack>
      </Layout>
    </Page>
  );
}
