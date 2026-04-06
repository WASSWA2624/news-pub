"use client";

import { useEffect, useId, useRef } from "react";
import styled, { css } from "styled-components";

import { PrimaryButton, SecondaryButton } from "@/components/admin/news-admin-ui";

const modalSizeStyles = {
  compact: css`
    width: min(92vw, 42rem);
  `,
  wide: css`
    width: min(94vw, 68rem);
  `,
  full: css`
    height: min(94dvh, 72rem);
    width: min(96vw, 96rem);
  `,
};

const Dialog = styled.dialog`
  background: transparent;
  border: none;
  margin: auto;
  max-height: calc(100dvh - 1rem);
  max-width: calc(100vw - 1rem);
  overflow: visible;
  padding: 0;
  ${({ $size }) => modalSizeStyles[$size] || modalSizeStyles.wide}

  &::backdrop {
    backdrop-filter: blur(8px);
    background:
      linear-gradient(180deg, rgba(11, 17, 28, 0.54), rgba(11, 17, 28, 0.64)),
      radial-gradient(circle at top, rgba(15, 111, 141, 0.12), transparent 42%);
  }
`;

const Surface = styled.section`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.996), rgba(246, 250, 255, 0.99)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.1), transparent 34%);
  border: 1px solid rgba(16, 32, 51, 0.09);
  border-radius: clamp(18px, 3vw, 26px);
  box-shadow:
    0 32px 72px rgba(11, 18, 30, 0.24),
    0 12px 28px rgba(16, 32, 51, 0.1);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-height: calc(100dvh - 1rem);
  min-height: ${({ $size }) => ($size === "full" ? "min(94dvh, 72rem)" : "auto")};
  overflow: hidden;

  @media (max-width: 639px) {
    border-radius: 20px;
    min-height: ${({ $size }) => ($size === "full" ? "calc(100dvh - 1rem)" : "auto")};
  }
`;

const Header = styled.div`
  align-items: start;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.92)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.08), transparent 48%);
  border-bottom: 1px solid rgba(16, 32, 51, 0.08);
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: clamp(0.95rem, 2vw, 1.2rem);
`;

const HeaderCopy = styled.div`
  display: grid;
  gap: 0.28rem;
  min-width: 0;
`;

const Title = styled.h2`
  color: #162744;
  font-size: clamp(1rem, 2vw, 1.28rem);
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0;
`;

const Description = styled.p`
  color: rgba(72, 85, 108, 0.92);
  font-size: 0.84rem;
  line-height: 1.5;
  margin: 0;
  max-width: 70ch;
`;

const CloseButton = styled.button`
  align-items: center;
  background: rgba(16, 32, 51, 0.05);
  border: 1px solid rgba(16, 32, 51, 0.09);
  border-radius: 999px;
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 1.1rem;
  height: 2.5rem;
  justify-content: center;
  line-height: 1;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
  width: 2.5rem;

  &:hover {
    border-color: rgba(15, 111, 141, 0.18);
    transform: translateY(-1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(15, 111, 141, 0.12);
    outline: none;
  }
`;

const Body = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: clamp(0.95rem, 2vw, 1.2rem);
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

const Footer = styled.div`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 251, 255, 0.98)),
    radial-gradient(circle at top left, rgba(15, 111, 141, 0.06), transparent 42%);
  border-top: 1px solid rgba(16, 32, 51, 0.08);
  display: flex;
  justify-content: flex-end;
  padding: clamp(0.85rem, 2vw, 1rem) clamp(0.95rem, 2vw, 1.2rem);

  @media (max-width: 520px) {
    > button {
      width: 100%;
    }
  }
`;

const TriggerPrimary = styled(PrimaryButton)`
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "fit-content")};
`;

const TriggerSecondary = styled(SecondaryButton)`
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "fit-content")};
`;

export default function AdminFormModal({
  autoOpen = false,
  cancelLabel = "Cancel",
  children,
  description,
  size = "wide",
  title,
  triggerFullWidth = false,
  triggerLabel = "Open form",
  triggerTone = "secondary",
}) {
  const dialogRef = useRef(null);
  const didAutoOpenRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const TriggerButton = triggerTone === "primary" ? TriggerPrimary : TriggerSecondary;

  function closeDialog() {
    dialogRef.current?.close();
  }

  function openDialog() {
    const dialog = dialogRef.current;

    if (typeof dialog?.showModal === "function") {
      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return undefined;
    }

    function handleCancel(event) {
      event.preventDefault();
      closeDialog();
    }

    dialog.addEventListener("cancel", handleCancel);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, []);

  useEffect(() => {
    if (!autoOpen || didAutoOpenRef.current) {
      return;
    }

    didAutoOpenRef.current = true;
    openDialog();
  }, [autoOpen]);

  return (
    <>
      <TriggerButton
        $fullWidth={triggerFullWidth}
        onClick={openDialog}
        type="button"
      >
        {triggerLabel}
      </TriggerButton>
      <Dialog
        $size={size}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        data-floating-root
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            closeDialog();
          }
        }}
        ref={dialogRef}
      >
        <Surface $size={size}>
          <Header>
            <HeaderCopy>
              <Title id={titleId}>{title}</Title>
              {description ? <Description id={descriptionId}>{description}</Description> : null}
            </HeaderCopy>
            <CloseButton aria-label="Close modal" onClick={closeDialog} type="button">
              ×
            </CloseButton>
          </Header>
          <Body>{children}</Body>
          <Footer>
            <SecondaryButton onClick={closeDialog} type="button">
              {cancelLabel}
            </SecondaryButton>
          </Footer>
        </Surface>
      </Dialog>
    </>
  );
}
