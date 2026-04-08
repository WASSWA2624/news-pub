"use client";

/**
 * Shared admin controls for normalized NewsPub fetch windows.
 */

import styled from "styled-components";

import {
  Field,
  FieldGrid,
  FieldHint,
  FieldLabel,
  Input,
  SecondaryButton,
  SmallText,
} from "@/components/admin/news-admin-ui";

const ControlsLayout = styled.div`
  display: grid;
  gap: 0.9rem;
`;

const WindowFieldGrid = styled(FieldGrid)`
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
`;

const CapabilityGrid = styled.div`
  display: grid;
  gap: 0.6rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
`;

const CapabilityCard = styled.div`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(248, 251, 255, 0.92)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.06), transparent 48%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  display: grid;
  gap: 0.24rem;
  padding: 0.72rem 0.78rem;
`;

const CapabilityLabel = styled.strong`
  color: #162744;
  font-size: 0.78rem;
  letter-spacing: -0.02em;
`;

const CapabilityBadge = styled.span`
  align-items: center;
  background: rgba(15, 111, 141, 0.1);
  border: 1px solid rgba(15, 111, 141, 0.16);
  border-radius: var(--theme-radius-lg, 2px);
  color: #0d5f79;
  display: inline-flex;
  font-size: 0.64rem;
  font-weight: 800;
  justify-self: start;
  min-height: var(--admin-compact-pill-min-height);
  padding: 0 0.48rem;
  text-transform: uppercase;
`;

const CheckpointToggle = styled.label`
  align-items: start;
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  display: grid;
  gap: 0.45rem;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 0.72rem 0.78rem;

  input {
    accent-color: #0d5f79;
    margin: 0.16rem 0 0;
  }
`;

const ToggleCopy = styled.div`
  display: grid;
  gap: 0.16rem;
`;

const ResetRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

/**
 * Shared normalized fetch-window controls used by stream settings and batch
 * run dialogs.
 *
 * @param {object} props - Window values, callbacks, and provider capability copy.
 * @returns {JSX.Element} Normalized fetch-window inputs plus mapping guidance.
 */
export default function FetchWindowControls({
  capabilityDetails = [],
  checkpointHint = "Explicit manual windows only advance checkpoints when you enable that below.",
  disabled = false,
  endValue = "",
  onEndChange,
  onReset = null,
  onStartChange,
  onWriteCheckpointChange,
  startValue = "",
  windowHint = "NewsPub defaults manual runs to the last 24 hours through now, then maps that normalized window safely to the selected provider endpoints.",
  writeCheckpointOnSuccess = false,
}) {
  return (
    <ControlsLayout>
      <WindowFieldGrid>
        <Field>
          <FieldLabel>Window start</FieldLabel>
          <Input
            disabled={disabled}
            onChange={(event) => onStartChange?.(event.target.value)}
            type="datetime-local"
            value={startValue}
          />
          <FieldHint>{windowHint}</FieldHint>
        </Field>
        <Field>
          <FieldLabel>Window end</FieldLabel>
          <Input
            disabled={disabled}
            onChange={(event) => onEndChange?.(event.target.value)}
            type="datetime-local"
            value={endValue}
          />
          <FieldHint>Use explicit manual boundaries when you want diagnostics, backfills, or one-off bounded runs to stay auditable.</FieldHint>
        </Field>
      </WindowFieldGrid>

      {typeof onReset === "function" ? (
        <ResetRow>
          <SecondaryButton disabled={disabled} onClick={onReset} type="button">
            Reset to last 24 hours
          </SecondaryButton>
        </ResetRow>
      ) : null}

      <CheckpointToggle>
        <input
          checked={writeCheckpointOnSuccess}
          disabled={disabled}
          onChange={(event) => onWriteCheckpointChange?.(event.target.checked)}
          type="checkbox"
        />
        <ToggleCopy>
          <CapabilityLabel>Write checkpoint on success</CapabilityLabel>
          <SmallText>{checkpointHint}</SmallText>
        </ToggleCopy>
      </CheckpointToggle>

      {capabilityDetails.length ? (
        <CapabilityGrid>
          {capabilityDetails.map((detail) => (
            <CapabilityCard key={detail.id}>
              <CapabilityLabel>{detail.label}</CapabilityLabel>
              <CapabilityBadge>{detail.badge}</CapabilityBadge>
              <SmallText>{detail.description}</SmallText>
            </CapabilityCard>
          ))}
        </CapabilityGrid>
      ) : null}
    </ControlsLayout>
  );
}
