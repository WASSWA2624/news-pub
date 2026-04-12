"use client";

/**
 * Shared disclosure and validation primitives used by NewsPub admin forms.
 */

import { createContext, useContext, useEffect, useId, useMemo, useState } from "react";
import styled from "styled-components";

import { getAutoOpenDisclosureIds, hasBlockingDisclosureState } from "@/components/admin/admin-ui-contract";
import {
  ActionIcon,
  ButtonIcon,
  NoticeBanner,
  NoticeItem,
  NoticeList,
  NoticeTitle,
  SmallText,
} from "@/components/admin/news-admin-ui";
import { createDisclosureAriaProps } from "@/components/admin/admin-form-primitives.helpers";
import { focusRingCss } from "@/components/common/ui-surface";

const DisclosureCard = styled.section`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(242, 247, 255, 0.98)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.08), transparent 52%);
  border: 1px solid rgba(var(--theme-text-rgb), 0.22);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: 0 12px 28px rgba(22, 36, 49, 0.08);
  display: grid;
  overflow: hidden;
`;

const DisclosureToggle = styled.button`
  ${focusRingCss}
  align-items: start;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(240, 246, 255, 0.9)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.07), transparent 60%);
  border: 1px solid transparent;
  border-bottom: 1px solid rgba(var(--theme-text-rgb), 0.18);
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 0.58rem;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: var(--admin-button-min-height);
  padding: 0.82rem 0.92rem;
  text-align: left;
  transition:
    background 160ms ease,
    box-shadow 160ms ease;

  &:hover {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(236, 244, 255, 0.94)),
      radial-gradient(circle at top right, rgba(15, 111, 141, 0.1), transparent 60%);
  }
`;

const DisclosureCopy = styled.div`
  display: grid;
  gap: 0.28rem;
  min-width: 0;
`;

const DisclosureTitleRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.48rem;
  min-width: 0;
`;

const DisclosureTitle = styled.h3`
  color: #162744;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1.15;
  margin: 0;
  text-transform: uppercase;
`;

const DisclosureSummary = styled.p`
  color: rgba(72, 85, 108, 0.94);
  font-size: 0.8rem;
  line-height: 1.5;
  margin: 0;
`;

const DisclosureMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

const DisclosureMetaPill = styled.span`
  align-items: center;
  background: ${({ $tone }) =>
    $tone === "success"
      ? "rgba(27, 138, 73, 0.1)"
      : $tone === "accent"
        ? "rgba(15, 111, 141, 0.1)"
      : $tone === "danger"
        ? "rgba(176, 46, 34, 0.1)"
        : $tone === "warning"
          ? "rgba(168, 113, 12, 0.12)"
          : "rgba(16, 32, 51, 0.06)"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "success"
        ? "rgba(27, 138, 73, 0.16)"
        : $tone === "accent"
          ? "rgba(15, 111, 141, 0.18)"
        : $tone === "danger"
          ? "rgba(176, 46, 34, 0.18)"
          : $tone === "warning"
            ? "rgba(168, 113, 12, 0.2)"
            : "rgba(16, 32, 51, 0.08)"};
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $tone }) =>
    $tone === "success"
      ? "#197341"
      : $tone === "accent"
        ? "#0d5f79"
      : $tone === "danger"
        ? "#a63725"
        : $tone === "warning"
          ? "#8f630c"
          : "#30435f"};
  display: inline-flex;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: var(--admin-compact-pill-min-height);
  padding: 0 0.48rem;
  text-transform: uppercase;
`;

const DisclosureToggleIcon = styled.span`
  align-items: center;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(var(--theme-text-rgb), 0.24);
  border-radius: var(--theme-radius-lg, 2px);
  color: #22344f;
  display: inline-flex;
  flex: 0 0 auto;
  height: calc(var(--admin-icon-button-size) - 8px);
  justify-content: center;
  width: calc(var(--admin-icon-button-size) - 8px);

  svg {
    height: 0.9rem;
    transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
    transition: transform 160ms ease;
    width: 0.9rem;
  }
`;

const DisclosureBody = styled.div`
  border-top: 1px solid rgba(var(--theme-text-rgb), 0.18);
  display: ${({ $open }) => ($open ? "grid" : "none")};
  gap: 0.9rem;
  padding: 0.92rem;
`;

const DisclosureGroupContext = createContext(null);

function formatStateCount(label, count) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function buildDisclosureStateMeta({
  blockingWarningCount = 0,
  completionLabel = "",
  errorCount = 0,
  missingCount = 0,
}) {
  if (errorCount > 0) {
    return {
      label: formatStateCount("issue", errorCount),
      tone: "danger",
    };
  }

  if (missingCount > 0) {
    return {
      label: formatStateCount("missing field", missingCount),
      tone: "warning",
    };
  }

  if (blockingWarningCount > 0) {
    return {
      label: formatStateCount("warning", blockingWarningCount),
      tone: "warning",
    };
  }

  if (completionLabel) {
    return {
      label: completionLabel,
      tone: "success",
    };
  }

  return null;
}

/**
 * Shows a compact validation summary above an admin form when one or more
 * sections need attention.
 *
 * @param {object} props - Summary display props.
 * @returns {JSX.Element|null} A warning banner or null when there are no items.
 */
export function AdminValidationSummary({
  items = [],
  title = "Review the highlighted sections before saving.",
  tone = "danger",
}) {
  if (!items.length) {
    return null;
  }

  return (
    <NoticeBanner $tone={tone}>
      <NoticeTitle>{title}</NoticeTitle>
      <NoticeList>
        {items.map((item) => (
          <NoticeItem key={item}>{item}</NoticeItem>
        ))}
      </NoticeList>
    </NoticeBanner>
  );
}

/**
 * Provides a shared disclosure state so sibling admin sections stay collapsed
 * by default and only one opens at a time at the same hierarchy level.
 *
 * @param {object} props - Group provider props.
 * @returns {JSX.Element} Context provider for grouped disclosures.
 */
export function AdminDisclosureGroup({ children }) {
  const [openId, setOpenId] = useState(null);
  const [registeredIds, setRegisteredIds] = useState([]);
  const [blockingStates, setBlockingStates] = useState({});
  const forcedOpenId = useMemo(
    () => registeredIds.find((id) => blockingStates[id]) || null,
    [blockingStates, registeredIds],
  );
  const value = useMemo(
    () => ({
      forcedOpenId,
      openId,
      registerItem(id) {
        setRegisteredIds((currentIds) => (currentIds.includes(id) ? currentIds : [...currentIds, id]));
      },
      setItemBlocking(id, isBlocking) {
        setBlockingStates((currentStates) =>
          currentStates[id] === isBlocking
            ? currentStates
            : {
                ...currentStates,
                [id]: isBlocking,
              },
        );
      },
      toggleItem(id) {
        setOpenId((currentId) => (currentId === id ? null : id));
      },
      unregisterItem(id) {
        setRegisteredIds((currentIds) => currentIds.filter((currentId) => currentId !== id));
        setBlockingStates((currentStates) => {
          if (!Object.prototype.hasOwnProperty.call(currentStates, id)) {
            return currentStates;
          }

          const nextStates = {
            ...currentStates,
          };

          delete nextStates[id];

          return nextStates;
        });
        setOpenId((currentId) => (currentId === id ? null : currentId));
      },
    }),
    [forcedOpenId, openId],
  );

  return (
    <DisclosureGroupContext.Provider value={value}>
      {children}
    </DisclosureGroupContext.Provider>
  );
}

/**
 * Opens the first invalid or aria-invalid form control and moves focus to it.
 *
 * @param {HTMLFormElement|null} formElement - The form that failed validation.
 * @returns {HTMLElement|null} The first invalid form control when one was found.
 */
export function scrollToFirstBlockingField(formElement) {
  if (!formElement) {
    return null;
  }

  const target = formElement.querySelector("[aria-invalid='true'], :invalid");

  if (!(target instanceof HTMLElement)) {
    return null;
  }

  target.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  window.requestAnimationFrame(() => {
    target.focus({ preventScroll: true });
  });

  return target;
}

/**
 * Renders an accessible disclosure section with summary metadata that can
 * auto-open when the linked form state becomes blocking.
 *
 * @param {object} props - Disclosure title, summary, state, and body props.
 * @returns {JSX.Element} Toggleable form section content.
 */
export function AdminDisclosureSection({
  blockingWarningCount = 0,
  children,
  completionLabel = "",
  defaultOpen = false,
  description = "",
  errorCount = 0,
  id,
  keepMounted = true,
  meta = [],
  missingCount = 0,
  summary = "",
  title,
}) {
  const generatedId = useId();
  const resolvedId = id || generatedId;
  const disclosureGroup = useContext(DisclosureGroupContext);
  const { bodyProps, toggleProps } = createDisclosureAriaProps(resolvedId);
  const shouldForceOpen = hasBlockingDisclosureState({
    blockingWarningCount,
    errorCount,
    missingCount,
  });
  const stateMeta = buildDisclosureStateMeta({
    blockingWarningCount,
    completionLabel,
    errorCount,
    missingCount,
  });
  const resolvedMeta = stateMeta
    ? [...meta, stateMeta]
    : meta;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!disclosureGroup) {
      return undefined;
    }

    disclosureGroup.registerItem(resolvedId);

    return () => {
      disclosureGroup.unregisterItem(resolvedId);
    };
  }, [disclosureGroup, resolvedId]);

  useEffect(() => {
    disclosureGroup?.setItemBlocking(resolvedId, shouldForceOpen);
  }, [disclosureGroup, resolvedId, shouldForceOpen]);

  const resolvedOpen = disclosureGroup
    ? disclosureGroup.forcedOpenId
      ? disclosureGroup.forcedOpenId === resolvedId
      : disclosureGroup.openId === resolvedId
    : isOpen || shouldForceOpen;

  return (
    <DisclosureCard data-admin-disclosure-section={resolvedId}>
      <DisclosureToggle
        aria-expanded={resolvedOpen}
        onClick={() => {
          if (disclosureGroup) {
            disclosureGroup.toggleItem(resolvedId);
            return;
          }

          setIsOpen((currentValue) => !currentValue);
        }}
        {...toggleProps}
        type="button"
      >
        <DisclosureCopy>
          <DisclosureTitleRow>
            <DisclosureTitle>{title}</DisclosureTitle>
          </DisclosureTitleRow>
          {summary ? <DisclosureSummary>{summary}</DisclosureSummary> : null}
          {description ? <SmallText>{description}</SmallText> : null}
          {resolvedMeta.length ? (
            <DisclosureMeta>
              {resolvedMeta.map((item) => (
                <DisclosureMetaPill key={`${item.tone || "muted"}-${item.label}`} $tone={item.tone || "muted"}>
                  {item.label}
                </DisclosureMetaPill>
              ))}
            </DisclosureMeta>
          ) : null}
        </DisclosureCopy>
        <DisclosureToggleIcon $open={resolvedOpen} aria-hidden="true">
          <ButtonIcon>
            <ActionIcon name="chevron-down" />
          </ButtonIcon>
        </DisclosureToggleIcon>
      </DisclosureToggle>
      <DisclosureBody $open={resolvedOpen} {...bodyProps}>
        {keepMounted || resolvedOpen ? children : null}
      </DisclosureBody>
    </DisclosureCard>
  );
}

/**
 * Returns the disclosure section ids that should be forced open for the current
 * validation state.
 *
 * @param {Array<object>} sections - Section state descriptors.
 * @returns {string[]} The section ids that should be opened automatically.
 */
export function getBlockingDisclosureIds(sections = []) {
  return getAutoOpenDisclosureIds(sections);
}
