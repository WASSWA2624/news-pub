"use client";

import { startTransition, useEffect, useState } from "react";
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
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.2), transparent 38%),
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
  max-width: 860px;
`;

const SummaryGrid = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
`;

const SummaryCard = styled.section`
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 18px 50px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const SummaryValue = styled.strong`
  font-size: 2rem;
  line-height: 1;
`;

const Layout = styled.section`
  align-items: start;
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: 1240px) {
    grid-template-columns: minmax(360px, 420px) minmax(0, 1fr);
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
  box-shadow: 0 18px 50px rgba(16, 32, 51, 0.08);
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

const SmallText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.6;
  margin: 0;
  overflow-wrap: anywhere;
`;

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  min-width: 0;
`;

const ListButton = styled.button`
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(180deg, rgba(0, 95, 115, 0.12), rgba(0, 95, 115, 0.08))"
      : "rgba(255, 255, 255, 0.98)"};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  min-width: 0;
  padding: ${({ theme }) => theme.spacing.md};
  text-align: left;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 18px 34px rgba(16, 32, 51, 0.08);
    transform: translateY(-1px);
  }
`;

const ListTitle = styled.strong`
  font-size: 1rem;
  overflow-wrap: anywhere;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Pill = styled.span`
  background: ${({ $tone }) =>
    $tone === "accent" ? "rgba(201, 123, 42, 0.18)" : "rgba(0, 95, 115, 0.12)"};
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.34rem 0.72rem;
`;

const StatusBanner = styled.div`
  background: ${({ $tone, theme }) =>
    $tone === "success" ? "rgba(21, 115, 71, 0.12)" : "rgba(180, 35, 24, 0.12)"};
  border: 1px solid ${({ $tone, theme }) => ($tone === "success" ? theme.colors.success : theme.colors.danger)};
  border-radius: ${({ theme }) => theme.radius.md};
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

const SecondaryButton = styled.button`
  background: rgba(247, 249, 252, 0.96);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  min-height: 42px;
  padding: 0.75rem 1rem;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 14px 28px rgba(16, 32, 51, 0.08);
    transform: translateY(-1px);
  }
`;

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
`;

const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
`;

const FieldLabel = styled.span`
  font-weight: 700;
`;

const Input = styled.input`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-width: 0;
  padding: 0.82rem 0.92rem;
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

const Textarea = styled.textarea`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: 9rem;
  min-width: 0;
  padding: 0.82rem 0.92rem;
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

const ActionRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const SaveButton = styled.button`
  background: ${({ $tone, theme }) => ($tone === "danger" ? theme.colors.danger : theme.colors.primary)};
  border: none;
  border-radius: 999px;
  color: white;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font: inherit;
  font-weight: 700;
  min-height: 44px;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.82rem 1.3rem;
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    box-shadow: ${({ disabled }) =>
      disabled ? "none" : "0 16px 28px rgba(16, 32, 51, 0.14)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

const StickyCard = styled(Card)`
  @media (min-width: 1240px) {
    position: sticky;
    top: 1rem;
  }
`;

function createDraft(editor) {
  return {
    categoryId: editor?.category?.id || null,
    description: editor?.category?.description || "",
    name: editor?.category?.name || "",
    slug: editor?.category?.slug || "",
  };
}

export default function CategoryManagementScreen({ copy, initialData }) {
  const [data, setData] = useState(initialData);
  const [draft, setDraft] = useState(() => createDraft(initialData.editor));
  const [notice, setNotice] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setDraft(createDraft(data.editor));
  }, [data.editor]);

  async function loadCategory(categoryId) {
    if (!categoryId) {
      return;
    }

    setIsBusy(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/categories?categoryId=${categoryId}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.loadErrorPrefix);
      }

      startTransition(() => {
        setData(payload.data);
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `${copy.loadErrorPrefix}: ${error.message}`,
      });
    } finally {
      setIsBusy(false);
    }
  }

  function handleCreateNew() {
    setNotice(null);
    setData((currentData) => ({
      ...currentData,
      editor: {
        category: {
          description: "",
          id: null,
          name: "",
          postCount: 0,
          slug: "",
        },
      },
      selection: {
        categoryId: null,
      },
    }));
    setDraft({
      categoryId: null,
      description: "",
      name: "",
      slug: "",
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsBusy(true);
    setNotice(null);

    try {
      const response = await fetch("/api/categories", {
        body: JSON.stringify({
          categoryId: draft.categoryId || undefined,
          description: draft.description,
          name: draft.name,
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

  async function handleDelete() {
    if (!draft.categoryId || !window.confirm(copy.deleteConfirmation)) {
      return;
    }

    setIsBusy(true);
    setNotice(null);

    try {
      const response = await fetch("/api/categories", {
        body: JSON.stringify({
          categoryId: draft.categoryId,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.deleteErrorPrefix);
      }

      startTransition(() => {
        setData(payload.data.snapshot);
      });
      setNotice({
        kind: "success",
        message: copy.deleteSuccess,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `${copy.deleteErrorPrefix}: ${error.message}`,
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
        <SummaryCard>
          <SummaryValue>{data.summary.categoryCount}</SummaryValue>
          <SmallText>{copy.categoryCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{data.summary.assignedPostCount}</SummaryValue>
          <SmallText>{copy.assignedPostCountLabel}</SmallText>
        </SummaryCard>
      </SummaryGrid>
      <Layout>
        <Stack>
          <StickyCard>
            <CardTitle>{copy.listTitle}</CardTitle>
            <SmallText>{copy.listDescription}</SmallText>
            <SecondaryButton onClick={handleCreateNew} type="button">
              {copy.createAction}
            </SecondaryButton>
            {data.categories.length ? (
              <List>
                {data.categories.map((category) => (
                  <ListButton
                    key={category.id}
                    onClick={() => loadCategory(category.id)}
                    type="button"
                    $active={data.selection.categoryId === category.id}
                  >
                    <ListTitle>{category.name}</ListTitle>
                    <SmallText>{category.slug}</SmallText>
                    <BadgeRow>
                      <Pill>{copy.postCountLabel}: {category.postCount}</Pill>
                      {category.description ? <Pill $tone="accent">{copy.hasDescriptionLabel}</Pill> : null}
                    </BadgeRow>
                  </ListButton>
                ))}
              </List>
            ) : (
              <SmallText>{copy.emptyState}</SmallText>
            )}
          </StickyCard>
        </Stack>
        <Stack>
          <Card>
            <CardTitle>{copy.editorTitle}</CardTitle>
            <SmallText>{copy.editorDescription}</SmallText>
            {notice ? <StatusBanner $tone={notice.kind}>{notice.message}</StatusBanner> : null}
            <Form onSubmit={handleSave}>
              <Field>
                <FieldLabel>{copy.fieldName}</FieldLabel>
                <Input
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      name: event.target.value,
                    }))
                  }
                  value={draft.name}
                />
              </Field>
              <Field>
                <FieldLabel>{copy.fieldDescription}</FieldLabel>
                <Textarea
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      description: event.target.value,
                    }))
                  }
                  value={draft.description}
                />
              </Field>
              <Field>
                <FieldLabel>{copy.fieldSlug}</FieldLabel>
                <Input disabled value={draft.slug || copy.slugPreviewPlaceholder} />
                <SmallText>{copy.slugHint}</SmallText>
              </Field>
              <ActionRow>
                <SmallText>
                  {isBusy
                    ? copy.saveWorking
                    : draft.categoryId
                      ? `${copy.editingLabel}: ${draft.name || copy.untitledLabel}`
                      : copy.creatingLabel}
                </SmallText>
                <ButtonRow>
                  {draft.categoryId ? (
                    <SaveButton
                      $tone="danger"
                      disabled={isBusy}
                      onClick={handleDelete}
                      type="button"
                    >
                      {copy.deleteAction}
                    </SaveButton>
                  ) : null}
                  <SaveButton disabled={isBusy} type="submit">
                    {isBusy ? copy.saveWorking : copy.saveAction}
                  </SaveButton>
                </ButtonRow>
              </ActionRow>
            </Form>
          </Card>
        </Stack>
      </Layout>
    </Page>
  );
}
