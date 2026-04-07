"use client";

import { useEffect, useId, useRef } from "react";
import styled from "styled-components";

import {
  ActionIcon,
  ButtonIcon,
  DangerButton as BaseDangerButton,
  SecondaryButton as BaseSecondaryButton,
} from "@/components/admin/news-admin-ui";

const TriggerButton = styled.button`
  align-items: center;
  background: ${({ $tone }) =>
    $tone === "danger" ? "rgba(180, 35, 24, 0.08)" : "rgba(16, 32, 51, 0.05)"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "danger" ? "rgba(180, 35, 24, 0.14)" : "rgba(16, 32, 51, 0.1)"};
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $tone }) => ($tone === "danger" ? "#a63725" : "#22344f")};
  cursor: pointer;
  display: inline-flex;
  font-size: 0.88rem;
  font-weight: 800;
  gap: 0.42rem;
  justify-content: center;
  min-height: var(--admin-button-min-height);
  padding: var(--admin-control-padding-block) var(--admin-control-padding-inline);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(180, 35, 24, 0.08);
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.62;
    transform: none;
  }
`;

const HiddenSubmitButton = styled.button`
  display: none;
`;

const Dialog = styled.dialog`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(247, 250, 255, 0.98)),
    radial-gradient(circle at top right, rgba(180, 35, 24, 0.08), transparent 48%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    0 28px 54px rgba(16, 32, 51, 0.18),
    0 6px 16px rgba(16, 32, 51, 0.08);
  color: var(--theme-text, #152844);
  max-width: min(92vw, 30rem);
  padding: 0;
  width: min(92vw, 30rem);

  &::backdrop {
    backdrop-filter: blur(4px);
    background: rgba(12, 18, 28, 0.42);
  }
`;

const DialogContent = styled.div`
  display: grid;
  gap: 0.8rem;
  padding: 1rem;
`;

const DialogTitle = styled.h2`
  color: #162744;
  font-size: 1.08rem;
  letter-spacing: -0.03em;
  margin: 0;
`;

const DialogDescription = styled.p`
  color: rgba(72, 85, 108, 0.92);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
`;

const DialogButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  justify-content: flex-end;

  @media (max-width: 520px) {
    > button {
      width: 100%;
    }
  }
`;

const SecondaryButton = styled(BaseSecondaryButton)`
  min-height: var(--admin-button-min-height);
  padding: var(--admin-control-padding-block) var(--admin-control-padding-inline);
`;

const ConfirmButton = styled(BaseDangerButton)`
  min-height: var(--admin-button-min-height);
  padding: var(--admin-control-padding-block) var(--admin-control-padding-inline);
`;

/**
 * Confirms a destructive or high-impact form submission before forwarding it to
 * the linked form element.
 *
 * @param {object} props - Trigger, dialog, and submit wiring props.
 * @returns {JSX.Element} A confirmation trigger plus hidden submit control.
 */
export default function ConfirmSubmitButton({
  cancelLabel = "Cancel",
  children,
  className,
  confirmLabel = "Confirm",
  description,
  disabled = false,
  formId,
  formNoValidate = false,
  icon,
  submitName,
  submitValue,
  title = "Are you sure?",
  tone = "danger",
}) {
  const dialogRef = useRef(null);
  const submitButtonRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const resolvedIcon = icon || (tone === "danger" ? "delete" : "save");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return undefined;
    }

    function handleCancel(event) {
      event.preventDefault();
      dialog.close();
    }

    dialog.addEventListener("cancel", handleCancel);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, []);

  function submitForm() {
    const submitButton = submitButtonRef.current;
    const form = submitButton?.form;

    if (!submitButton || !form) {
      return;
    }

    if (typeof form.requestSubmit === "function") {
      form.requestSubmit(submitButton);
      return;
    }

    submitButton.click();
  }

  function openDialog() {
    if (disabled) {
      return;
    }

    const dialog = dialogRef.current;

    if (typeof dialog?.showModal === "function") {
      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    }

    const didConfirm = window.confirm([title, description].filter(Boolean).join("\n\n"));

    if (didConfirm) {
      submitForm();
    }
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleConfirm() {
    closeDialog();
    submitForm();
  }

  return (
    <>
      <TriggerButton
        $tone={tone}
        className={className}
        disabled={disabled}
        onClick={openDialog}
        type="button"
      >
        <ButtonIcon>
          <ActionIcon name={resolvedIcon} />
        </ButtonIcon>
        {children}
      </TriggerButton>
      <HiddenSubmitButton
        form={formId}
        formNoValidate={formNoValidate}
        name={submitName}
        ref={submitButtonRef}
        type="submit"
        value={submitValue}
      />
      <Dialog
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            closeDialog();
          }
        }}
        ref={dialogRef}
      >
        <DialogContent>
          <DialogTitle id={titleId}>{title}</DialogTitle>
          {description ? <DialogDescription id={descriptionId}>{description}</DialogDescription> : null}
          <DialogButtonRow>
            <SecondaryButton onClick={closeDialog} type="button">
              <ButtonIcon>
                <ActionIcon name="close" />
              </ButtonIcon>
              {cancelLabel}
            </SecondaryButton>
            <ConfirmButton onClick={handleConfirm} type="button">
              <ButtonIcon>
                <ActionIcon name={resolvedIcon} />
              </ButtonIcon>
              {confirmLabel}
            </ConfirmButton>
          </DialogButtonRow>
        </DialogContent>
      </Dialog>
    </>
  );
}
