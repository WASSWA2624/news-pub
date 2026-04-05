"use client";

import { startTransition, useMemo, useState } from "react";
import styled from "styled-components";

const Page = styled.main`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  margin: 0 auto;
  max-width: 1480px;
  padding: clamp(1rem, 2vw, 2rem);
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.22), transparent 38%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.12), rgba(16, 32, 51, 0.03));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  padding: clamp(1.2rem, 2.2vw, 2rem);
`;

const Eyebrow = styled.p`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1.05;
  margin: 0;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.7;
  margin: 0;
  max-width: 820px;
`;

const SummaryGrid = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: 1120px) {
    grid-template-columns: minmax(340px, 0.9fr) minmax(0, 1.2fr);
  }
`;

const Stack = styled.div`
  align-content: start;
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  min-width: 0;
`;

const Card = styled.section`
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 20px 60px rgba(16, 32, 51, 0.08);
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
  font-size: clamp(1.05rem, 1vw, 1.2rem);
  line-height: 1.15;
  margin: 0;
`;

const SummaryStat = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const StatValue = styled.strong`
  font-size: 2rem;
  line-height: 1;
`;

const SmallText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.6;
  margin: 0;
  overflow-wrap: anywhere;
`;

const StepList = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  margin: 0;
  padding-left: 1.2rem;
`;

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
`;

const ConfigCard = styled.article`
  background: ${({ $enabled }) => ($enabled ? "rgba(255, 255, 255, 0.98)" : "rgba(247, 249, 252, 0.96)")};
  border: 1px solid ${({ $enabled, theme }) => ($enabled ? theme.colors.border : "rgba(88, 97, 116, 0.32)")};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const ConfigHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const ConfigMeta = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const ConfigTitle = styled.h3`
  font-size: 1rem;
  margin: 0;
`;

const BadgeRow = styled.div`
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
        : "rgba(88, 97, 116, 0.12)"};
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text};
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.34rem 0.72rem;
`;

const Toggle = styled.label`
  align-items: center;
  display: inline-flex;
  gap: ${({ theme }) => theme.spacing.sm};
  font-weight: 600;
`;

const Checkbox = styled.input`
  accent-color: ${({ theme }) => theme.colors.primary};
  height: 1.1rem;
  width: 1.1rem;
`;

const FieldGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
`;

const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
`;

const FieldLabel = styled.span`
  font-weight: 700;
`;

const Textarea = styled.textarea`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: ${({ $rows }) => `${$rows * 1.65}rem`};
  min-width: 0;
  padding: 0.8rem 0.9rem;
  resize: vertical;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
  width: 100%;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(0, 95, 115, 0.12);
    outline: none;
  }
`;

const StatusBanner = styled.div`
  background: ${({ $tone, theme }) =>
    $tone === "success" ? "rgba(21, 115, 71, 0.12)" : "rgba(180, 35, 24, 0.12)"};
  border: 1px solid
    ${({ $tone, theme }) => ($tone === "success" ? theme.colors.success : theme.colors.danger)};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.spacing.md};
  position: relative;

  &::before {
    background: ${({ $tone, theme }) => ($tone === "success" ? theme.colors.success : theme.colors.danger)};
    border-radius: 999px;
    content: "";
    inset: 0 auto 0 0;
    position: absolute;
    width: 4px;
  }
`;

const ActionRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const SaveButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 999px;
  color: white;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font: inherit;
  font-weight: 700;
  min-height: 44px;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.8rem 1.3rem;
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    box-shadow: ${({ disabled }) =>
      disabled ? "none" : "0 16px 28px rgba(0, 95, 115, 0.22)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

function createDraftConfig(config) {
  return {
    allowedDomainsText: config.allowedDomains.join("\n"),
    isEnabled: config.isEnabled,
    notes: config.notes || "",
    sourceType: config.sourceType,
  };
}

function parseAllowedDomains(value) {
  return [...new Set(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
}

export default function SourceConfigurationScreen({ copy, initialData }) {
  const [data, setData] = useState(initialData);
  const [draftConfigs, setDraftConfigs] = useState(() =>
    initialData.configs.map(createDraftConfig),
  );
  const [notice, setNotice] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const dirtyCount = useMemo(
    () =>
      draftConfigs.filter((draftConfig, index) => {
        const config = data.configs[index];

        return (
          config.isEnabled !== draftConfig.isEnabled ||
          config.notes !== draftConfig.notes ||
          config.allowedDomains.join("\n") !== draftConfig.allowedDomainsText
        );
      }).length,
    [data.configs, draftConfigs],
  );

  function updateDraft(sourceType, updates) {
    setDraftConfigs((currentDrafts) =>
      currentDrafts.map((draftConfig) =>
        draftConfig.sourceType === sourceType ? { ...draftConfig, ...updates } : draftConfig,
      ),
    );
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsBusy(true);
    setNotice(null);

    try {
      const response = await fetch("/api/sources", {
        body: JSON.stringify({
          configs: draftConfigs.map((draftConfig) => ({
            allowedDomains: parseAllowedDomains(draftConfig.allowedDomainsText),
            isEnabled: draftConfig.isEnabled,
            notes: draftConfig.notes,
            sourceType: draftConfig.sourceType,
          })),
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PUT",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.saveErrorPrefix);
      }

      startTransition(() => {
        setData(payload.data.snapshot);
        setDraftConfigs(payload.data.snapshot.configs.map(createDraftConfig));
      });
      setNotice({
        kind: "success",
        message: copy.saveSuccess,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `${copy.saveErrorPrefix}: ${error.message}`,
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Page>
      <Hero>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Title>{copy.title}</Title>
        <Description>{copy.description}</Description>
      </Hero>
      <SummaryGrid>
        <Stack>
          <Card>
            <CardTitle>{copy.summaryTitle}</CardTitle>
            <SummaryStat>
              <StatValue>{data.summary.enabledCount}</StatValue>
              <SmallText>{copy.enabledSummary}</SmallText>
            </SummaryStat>
            <SummaryStat>
              <StatValue>{data.summary.restrictedCount}</StatValue>
              <SmallText>{copy.restrictedSummary}</SmallText>
            </SummaryStat>
            <SummaryStat>
              <StatValue>{data.summary.totalCount}</StatValue>
              <SmallText>{copy.totalSummary}</SmallText>
            </SummaryStat>
          </Card>
          <Card>
            <CardTitle>{copy.priorityTitle}</CardTitle>
            <StepList>
              {data.priorityOrder.map((item) => (
                <SmallText as="li" key={item.sourceType}>
                  {item.priority}. {item.label}
                </SmallText>
              ))}
            </StepList>
          </Card>
        </Stack>
        <Stack>
          <Card>
            <CardTitle>{copy.configurationsTitle}</CardTitle>
            <SmallText>{copy.configurationsDescription}</SmallText>
            {notice ? <StatusBanner $tone={notice.kind}>{notice.message}</StatusBanner> : null}
            <Form onSubmit={handleSave}>
              {data.configs.map((config) => {
                const draftConfig = draftConfigs.find((item) => item.sourceType === config.sourceType);

                return (
                  <ConfigCard key={config.sourceType} $enabled={draftConfig?.isEnabled}>
                    <ConfigHeader>
                      <ConfigMeta>
                        <ConfigTitle>{config.name}</ConfigTitle>
                        <BadgeRow>
                          <Pill $tone="primary">#{config.priority}</Pill>
                          <Pill>{config.sourceType}</Pill>
                          {config.reliabilityMarker ? (
                            <Pill $tone="accent">{config.reliabilityMarker}</Pill>
                          ) : null}
                        </BadgeRow>
                      </ConfigMeta>
                      <Toggle>
                        <Checkbox
                          checked={draftConfig?.isEnabled || false}
                          onChange={(event) =>
                            updateDraft(config.sourceType, { isEnabled: event.target.checked })
                          }
                          type="checkbox"
                        />
                        <span>{copy.enabledLabel}</span>
                      </Toggle>
                    </ConfigHeader>
                    <SmallText>
                      {copy.usageLabel}: {config.usageCount}
                    </SmallText>
                    <FieldGrid>
                      <Field>
                        <FieldLabel>{copy.allowedDomainsLabel}</FieldLabel>
                        <Textarea
                          $rows={5}
                          onChange={(event) =>
                            updateDraft(config.sourceType, {
                              allowedDomainsText: event.target.value,
                            })
                          }
                          value={draftConfig?.allowedDomainsText || ""}
                        />
                        <SmallText>{copy.allowedDomainsHint}</SmallText>
                      </Field>
                      <Field>
                        <FieldLabel>{copy.notesLabel}</FieldLabel>
                        <Textarea
                          $rows={5}
                          onChange={(event) =>
                            updateDraft(config.sourceType, {
                              notes: event.target.value,
                            })
                          }
                          value={draftConfig?.notes || ""}
                        />
                        <SmallText>{copy.notesHint}</SmallText>
                      </Field>
                    </FieldGrid>
                  </ConfigCard>
                );
              })}
              <ActionRow>
                <SmallText>
                  {isBusy
                    ? copy.saveWorking
                    : dirtyCount
                      ? `${dirtyCount} ${copy.pendingChangesLabel}`
                      : copy.noPendingChanges}
                </SmallText>
                <SaveButton disabled={isBusy} type="submit">
                  {isBusy ? copy.saveWorking : copy.saveAction}
                </SaveButton>
              </ActionRow>
            </Form>
          </Card>
        </Stack>
      </SummaryGrid>
    </Page>
  );
}
