"use client";

import { useFormStatus } from "react-dom";
import styled, { keyframes } from "styled-components";

import {
  ActionIcon,
  ButtonIcon,
  DangerButton,
  PrimaryButton,
  SecondaryButton,
  SmallText,
} from "@/components/admin/news-admin-ui";

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

export const InlineSpinner = styled.span`
  border: 2px solid rgba(255, 255, 255, 0.26);
  border-radius: 999px;
  border-top-color: currentColor;
  display: inline-flex;
  flex: 0 0 auto;
  height: 0.92rem;
  width: 0.92rem;
  animation: ${spin} 700ms linear infinite;
`;

const spinnerToneByVariant = Object.freeze({
  danger: "rgba(166, 55, 37, 0.18)",
  primary: "rgba(255, 255, 255, 0.26)",
  secondary: "rgba(34, 52, 79, 0.18)",
});

const VariantButtonByTone = Object.freeze({
  danger: DangerButton,
  primary: PrimaryButton,
  secondary: SecondaryButton,
});

function PendingSpinner({ tone }) {
  return (
    <ButtonIcon>
      <InlineSpinner
        aria-hidden="true"
        style={{
          borderColor: spinnerToneByVariant[tone] || spinnerToneByVariant.secondary,
          borderTopColor: "currentColor",
        }}
      />
    </ButtonIcon>
  );
}

export function PendingSubmitButton({
  children,
  disabled = false,
  icon = null,
  pendingLabel = "",
  tone = "secondary",
  ...props
}) {
  const { pending } = useFormStatus();
  const ButtonComponent = VariantButtonByTone[tone] || SecondaryButton;

  return (
    <ButtonComponent
      aria-busy={pending}
      disabled={disabled || pending}
      {...props}
    >
      {pending ? (
        <PendingSpinner tone={tone} />
      ) : icon ? (
        <ButtonIcon>
          <ActionIcon name={icon} />
        </ButtonIcon>
      ) : null}
      {pending ? pendingLabel || children : children}
    </ButtonComponent>
  );
}

export function FormPendingState({
  idleText = "",
  pendingText = "Processing...",
}) {
  const { pending } = useFormStatus();
  const text = pending ? pendingText : idleText;

  if (!text) {
    return null;
  }

  return (
    <SmallText aria-busy={pending} aria-live="polite">
      {text}
    </SmallText>
  );
}
