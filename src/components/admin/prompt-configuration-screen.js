"use client";

import { startTransition, useState } from "react";
import styled from "styled-components";

const Page = styled.main`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  margin: 0 auto;
  max-width: 1280px;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.2), transparent 38%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.12), rgba(16, 32, 51, 0.03));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xl};
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
  max-width: 860px;
`;

const Layout = styled.section`
  align-items: start;
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: 980px) {
    grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
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
  font-size: 1.05rem;
  margin: 0;
`;

const SmallText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.6;
  margin: 0;
  overflow-wrap: anywhere;
`;

const SummaryGrid = styled.div`
  align-items: start;
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 10.5rem), 1fr));
`;

const SummaryStat = styled.div`
  align-content: start;
  background: rgba(247, 249, 252, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
  padding: ${({ theme }) => theme.spacing.md};
`;

const StatValue = styled.strong`
  font-size: 2rem;
  line-height: 1;
`;

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
`;

const TemplateCard = styled.article`
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
  overflow: hidden;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const TemplateHeader = styled.div`
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const TemplateMeta = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const TemplateTitle = styled.h3`
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
  font-weight: 600;
  padding: 0.3rem 0.7rem;
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

const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const FieldLabel = styled.span`
  font-weight: 600;
`;

const Input = styled.input`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-width: 0;
  padding: 0.8rem 0.9rem;
  width: 100%;
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
  width: 100%;
`;

const StatusBanner = styled.div`
  background: ${({ $tone, theme }) =>
    $tone === "success" ? "rgba(21, 115, 71, 0.12)" : "rgba(180, 35, 24, 0.12)"};
  border: 1px solid
    ${({ $tone, theme }) => ($tone === "success" ? theme.colors.success : theme.colors.danger)};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.spacing.md};
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
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.8rem 1.3rem;
`;

function createDraftTemplate(template) {
  return {
    id: template.id,
    isActive: template.isActive,
    name: template.name,
    purpose: template.purpose,
    systemPrompt: template.systemPrompt,
    userPromptTemplate: template.userPromptTemplate,
  };
}

export default function PromptConfigurationScreen({ copy, initialData }) {
  const [data, setData] = useState(initialData);
  const [draftTemplates, setDraftTemplates] = useState(() =>
    initialData.templates.map(createDraftTemplate),
  );
  const [notice, setNotice] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  function updateTemplate(templateId, updates) {
    setDraftTemplates((currentDrafts) =>
      currentDrafts.map((draftTemplate) =>
        draftTemplate.id === templateId ? { ...draftTemplate, ...updates } : draftTemplate,
      ),
    );
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsBusy(true);
    setNotice(null);

    try {
      const response = await fetch("/api/prompts", {
        body: JSON.stringify({
          templates: draftTemplates,
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
        setDraftTemplates(payload.data.snapshot.templates.map(createDraftTemplate));
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
      <Layout>
        <Stack>
          <Card>
            <CardTitle>{copy.summaryTitle}</CardTitle>
            <SummaryGrid>
              <SummaryStat>
                <StatValue>{data.summary.templateCount}</StatValue>
                <SmallText>{copy.templateSummary}</SmallText>
              </SummaryStat>
              <SummaryStat>
                <StatValue>{data.summary.activeTemplateCount}</StatValue>
                <SmallText>{copy.activeSummary}</SmallText>
              </SummaryStat>
              <SummaryStat>
                <StatValue>{data.summary.purposeCount}</StatValue>
                <SmallText>{copy.purposeSummary}</SmallText>
              </SummaryStat>
            </SummaryGrid>
          </Card>
        </Stack>
        <Stack>
          <Card>
            <CardTitle>{copy.editorTitle}</CardTitle>
            <SmallText>{copy.editorDescription}</SmallText>
            {notice ? <StatusBanner $tone={notice.kind}>{notice.message}</StatusBanner> : null}
            <Form onSubmit={handleSave}>
              {data.templates.map((template) => {
                const draftTemplate = draftTemplates.find((item) => item.id === template.id);

                return (
                  <TemplateCard key={template.id}>
                    <TemplateHeader>
                      <TemplateMeta>
                        <TemplateTitle>{template.name}</TemplateTitle>
                        <BadgeRow>
                          <Pill $tone="primary">{template.purpose}</Pill>
                          <Pill>v{template.version}</Pill>
                          {template.isActive ? <Pill $tone="accent">{copy.activeLabel}</Pill> : null}
                        </BadgeRow>
                      </TemplateMeta>
                      <Toggle>
                        <Checkbox
                          checked={draftTemplate?.isActive || false}
                          onChange={(event) =>
                            updateTemplate(template.id, { isActive: event.target.checked })
                          }
                          type="checkbox"
                        />
                        <span>{copy.enabledLabel}</span>
                      </Toggle>
                    </TemplateHeader>
                    <Field>
                      <FieldLabel>{copy.fieldName}</FieldLabel>
                      <Input
                        onChange={(event) =>
                          updateTemplate(template.id, { name: event.target.value })
                        }
                        value={draftTemplate?.name || ""}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{copy.fieldSystemPrompt}</FieldLabel>
                      <Textarea
                        $rows={7}
                        onChange={(event) =>
                          updateTemplate(template.id, { systemPrompt: event.target.value })
                        }
                        value={draftTemplate?.systemPrompt || ""}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{copy.fieldUserPrompt}</FieldLabel>
                      <Textarea
                        $rows={7}
                        onChange={(event) =>
                          updateTemplate(template.id, {
                            userPromptTemplate: event.target.value,
                          })
                        }
                        value={draftTemplate?.userPromptTemplate || ""}
                      />
                    </Field>
                  </TemplateCard>
                );
              })}
              <ActionRow>
                <SmallText>{isBusy ? copy.saveWorking : copy.statusReady}</SmallText>
                <SaveButton disabled={isBusy} type="submit">
                  {isBusy ? copy.saveWorking : copy.saveAction}
                </SaveButton>
              </ActionRow>
            </Form>
          </Card>
        </Stack>
      </Layout>
    </Page>
  );
}
