"use client";

/**
 * Shared disclosure and validation primitives used by NewsPub admin forms.
 */

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
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
  position: relative;
  background:
    ${({ $open }) =>
      $open
        ? "linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(239, 247, 255, 0.98)), linear-gradient(90deg, rgba(15, 111, 141, 0.04), transparent 22%), radial-gradient(circle at top right, rgba(15, 111, 141, 0.12), transparent 48%)"
        : "linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(244, 248, 252, 0.98)), linear-gradient(90deg, rgba(16, 32, 51, 0.02), transparent 20%), radial-gradient(circle at top right, rgba(15, 111, 141, 0.06), transparent 54%)"};
  border: 1px solid
    ${({ $open }) =>
      $open ? "rgba(15, 111, 141, 0.3)" : "rgba(var(--theme-text-rgb), 0.18)"};
  border-radius: 0;
  box-shadow: ${({ $open }) =>
    $open
      ? "0 20px 36px rgba(15, 96, 121, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.82)"
      : "0 10px 22px rgba(22, 36, 49, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.74)"};
  display: grid;
  overflow: hidden;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;

  &::before {
    background: ${({ $open }) =>
      $open
        ? "linear-gradient(180deg, rgba(15, 111, 141, 0.96), rgba(224, 165, 58, 0.92))"
        : "linear-gradient(180deg, rgba(36, 75, 115, 0.2), rgba(36, 75, 115, 0.04))"};
    content: "";
    inset: 0 auto 0 0;
    opacity: ${({ $open }) => ($open ? 1 : 0.56)};
    position: absolute;
    transition:
      opacity 180ms ease,
      background 180ms ease;
    width: ${({ $open }) => ($open ? "5px" : "3px")};
  }
`;

const DisclosureToggle = styled.button`
  ${focusRingCss}
  align-items: start;
  background:
    ${({ $open }) =>
      $open
        ? "linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(232, 244, 255, 0.96)), linear-gradient(90deg, rgba(15, 111, 141, 0.08), transparent 18%), radial-gradient(circle at top right, rgba(15, 111, 141, 0.12), transparent 56%)"
        : "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 246, 251, 0.92)), linear-gradient(90deg, rgba(16, 32, 51, 0.03), transparent 18%), radial-gradient(circle at top right, rgba(15, 111, 141, 0.05), transparent 60%)"};
  border: 1px solid transparent;
  border-bottom: 1px solid
    ${({ $open }) =>
      $open ? "rgba(15, 111, 141, 0.18)" : "rgba(var(--theme-text-rgb), 0.16)"};
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 0.64rem;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: var(--admin-button-min-height);
  padding: 0.94rem 1rem 0.92rem 1.12rem;
  text-align: left;
  transition:
    background 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    background:
      ${({ $open }) =>
        $open
          ? "linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(228, 242, 255, 0.97)), linear-gradient(90deg, rgba(15, 111, 141, 0.09), transparent 18%), radial-gradient(circle at top right, rgba(15, 111, 141, 0.14), transparent 56%)"
          : "linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(237, 244, 250, 0.95)), linear-gradient(90deg, rgba(16, 32, 51, 0.03), transparent 18%), radial-gradient(circle at top right, rgba(15, 111, 141, 0.08), transparent 60%)"};
    transform: translateY(-1px);
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
  color: ${({ $open }) => ($open ? "#0d5f79" : "#162744")};
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  line-height: 1.15;
  margin: 0;
  text-transform: uppercase;
`;

const DisclosureSummary = styled.p`
  color: ${({ $open }) => ($open ? "rgba(33, 52, 79, 0.96)" : "rgba(72, 85, 108, 0.92)")};
  font-size: 0.79rem;
  line-height: 1.52;
  margin: 0;
  max-width: 78ch;
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
  border-radius: 0;
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
  background: ${({ $open }) =>
    $open
      ? "linear-gradient(180deg, rgba(15, 111, 141, 0.12), rgba(255, 255, 255, 0.9))"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(242, 246, 252, 0.9))"};
  border: 1px solid
    ${({ $open }) =>
      $open ? "rgba(15, 111, 141, 0.26)" : "rgba(var(--theme-text-rgb), 0.18)"};
  border-radius: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: ${({ $open }) => ($open ? "#0d5f79" : "#22344f")};
  display: inline-flex;
  flex: 0 0 auto;
  height: calc(var(--admin-icon-button-size) - 6px);
  justify-content: center;
  width: calc(var(--admin-icon-button-size) - 6px);
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease,
    transform 160ms ease;

  svg {
    height: 0.9rem;
    transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
    transition: transform 160ms ease;
    width: 0.9rem;
  }
`;

const DisclosureBody = styled.div`
  border-top: 1px solid
    ${({ $open }) =>
      $open ? "rgba(15, 111, 141, 0.16)" : "rgba(var(--theme-text-rgb), 0.14)"};
  background:
    ${({ $open }) =>
      $open
        ? "linear-gradient(180deg, rgba(252, 254, 255, 0.995), rgba(242, 248, 255, 0.96)), linear-gradient(90deg, rgba(15, 111, 141, 0.04), transparent 18%)"
        : "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.94))"};
  display: ${({ $open }) => ($open ? "grid" : "none")};
  gap: 1rem;
  padding: 1rem 1rem 1rem 1.12rem;
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
  const registerItem = useCallback((id) => {
    setRegisteredIds((currentIds) => (currentIds.includes(id) ? currentIds : [...currentIds, id]));
  }, []);
  const setItemBlocking = useCallback((id, isBlocking) => {
    setBlockingStates((currentStates) =>
      currentStates[id] === isBlocking
        ? currentStates
        : {
            ...currentStates,
            [id]: isBlocking,
          },
    );
  }, []);
  const toggleItem = useCallback((id) => {
    setOpenId((currentId) => (currentId === id ? null : id));
  }, []);
  const unregisterItem = useCallback((id) => {
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
  }, []);
  const value = useMemo(
    () => ({
      forcedOpenId,
      openId,
      registerItem,
      setItemBlocking,
      toggleItem,
      unregisterItem,
    }),
    [forcedOpenId, openId, registerItem, setItemBlocking, toggleItem, unregisterItem],
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
  const registerDisclosureItem = disclosureGroup?.registerItem;
  const setDisclosureItemBlocking = disclosureGroup?.setItemBlocking;
  const toggleDisclosureItem = disclosureGroup?.toggleItem;
  const unregisterDisclosureItem = disclosureGroup?.unregisterItem;
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
    if (!registerDisclosureItem || !unregisterDisclosureItem) {
      return undefined;
    }

    registerDisclosureItem(resolvedId);

    return () => {
      unregisterDisclosureItem(resolvedId);
    };
  }, [registerDisclosureItem, resolvedId, unregisterDisclosureItem]);

  useEffect(() => {
    setDisclosureItemBlocking?.(resolvedId, shouldForceOpen);
  }, [resolvedId, setDisclosureItemBlocking, shouldForceOpen]);

  const resolvedOpen = disclosureGroup
    ? disclosureGroup.forcedOpenId
      ? disclosureGroup.forcedOpenId === resolvedId
      : disclosureGroup.openId === resolvedId
    : isOpen || shouldForceOpen;

  return (
    <DisclosureCard $open={resolvedOpen} data-admin-disclosure-section={resolvedId}>
      <DisclosureToggle
        aria-expanded={resolvedOpen}
        $open={resolvedOpen}
        onClick={() => {
          if (disclosureGroup) {
            toggleDisclosureItem?.(resolvedId);
            return;
          }

          setIsOpen((currentValue) => !currentValue);
        }}
        {...toggleProps}
        type="button"
      >
        <DisclosureCopy>
          <DisclosureTitleRow>
            <DisclosureTitle $open={resolvedOpen}>{title}</DisclosureTitle>
          </DisclosureTitleRow>
          {summary ? <DisclosureSummary $open={resolvedOpen}>{summary}</DisclosureSummary> : null}
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
