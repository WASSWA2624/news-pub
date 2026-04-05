"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
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

const SmallText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.6;
  margin: 0;
  overflow-wrap: anywhere;
`;

const SummaryGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 18px 50px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  overflow: hidden;
  padding: ${({ theme }) => theme.spacing.lg};
  position: relative;

  &::before {
    background: linear-gradient(90deg, rgba(0, 95, 115, 0.18), rgba(201, 123, 42, 0.14));
    content: "";
    height: 3px;
    inset: 0 0 auto;
    position: absolute;
  }
`;

const StatValue = styled.strong`
  font-size: 2rem;
  line-height: 1;
`;

const List = styled.div`
  align-content: start;
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
    $tone === "accent"
      ? "rgba(201, 123, 42, 0.18)"
      : $tone === "primary"
        ? "rgba(0, 95, 115, 0.12)"
        : $tone === "success"
          ? "rgba(21, 115, 71, 0.14)"
        : "rgba(88, 97, 116, 0.12)"};
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text};
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.34rem 0.72rem;
`;

const SecondaryButton = styled.button`
  background: rgba(247, 249, 252, 0.98);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  min-height: 42px;
  padding: 0.72rem 1rem;
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

const StatusBanner = styled.div`
  background: ${({ $tone }) =>
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

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
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
  min-height: ${({ $rows }) => `${$rows * 1.65}rem`};
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
  padding: 0.82rem 1.35rem;
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    box-shadow: ${({ disabled }) =>
      disabled ? "none" : "0 16px 28px rgba(0, 95, 115, 0.22)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

const StickyCard = styled(Card)`
  @media (min-width: 1240px) {
    grid-template-rows: auto auto minmax(0, 1fr);
    max-height: calc(100vh - 2rem);
    overflow: hidden;
    position: sticky;
    top: 1rem;
  }
`;

const CardHeader = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
`;

const CardHeaderRow = styled.div`
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const CardHeaderCopy = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: min(100%, 26rem);
`;

const FilterStack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ScrollArea = styled.div`
  align-content: start;
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  min-height: 0;
  min-width: 0;

  @media (min-width: 1240px) {
    overflow: auto;
    padding-right: 0.15rem;
    scrollbar-gutter: stable;
  }
`;

const FormSection = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  min-width: 0;
`;

const SectionTitle = styled.h3`
  font-size: 0.95rem;
  margin: 0;
`;

const DetailGrid = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const OverviewHeader = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const OverviewTitle = styled.h3`
  font-size: clamp(1.45rem, 2.2vw, 2rem);
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin: 0;
`;

const DomainLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  overflow-wrap: anywhere;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const MetaGrid = styled.dl`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  margin: 0;
`;

const MetaItem = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
`;

const MetaTerm = styled.dt`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  margin: 0;
  text-transform: uppercase;
`;

const MetaValue = styled.dd`
  margin: 0;
  overflow-wrap: anywhere;
`;

const OverviewStats = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr));
`;

const OverviewStat = styled.div`
  background: rgba(247, 249, 252, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: 0.18rem;
  min-width: 0;
  padding: ${({ theme }) => theme.spacing.md};
`;

const OverviewStatLabel = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const OverviewStatValue = styled.strong`
  font-size: 1.4rem;
  line-height: 1;
`;

const PreviewSplit = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};

  @media (min-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const TagSection = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  min-width: 0;
`;

const TagCloud = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const DetailItem = styled.article`
  background: rgba(247, 249, 252, 0.9);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  min-width: 0;
  padding: ${({ theme }) => theme.spacing.md};
`;

const DetailTitle = styled.strong`
  font-size: 0.98rem;
  overflow-wrap: anywhere;
`;

const DetailLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const EmptyPanel = styled.div`
  align-content: center;
  background: rgba(247, 249, 252, 0.9);
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.muted};
  display: grid;
  min-height: 14rem;
  padding: ${({ theme }) => theme.spacing.lg};
`;

function createDraft(editor) {
  return {
    aliasesText: editor?.aliases?.map((alias) => alias.alias).join("\n") || "",
    branchCountriesText: editor?.manufacturer?.branchCountries?.join("\n") || "",
    headquartersCountry: editor?.manufacturer?.headquartersCountry || "",
    manufacturerId: editor?.manufacturer?.id || null,
    name: editor?.manufacturer?.name || "",
    primaryDomain: editor?.manufacturer?.primaryDomain || "",
  };
}

function parseMultiline(value) {
  return [...new Set(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
}

function normalizeSearchValue(value) {
  return `${value || ""}`.trim().toLowerCase();
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toExternalUrl(value) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

export default function ManufacturerManagementScreen({ copy, initialData }) {
  const [data, setData] = useState(initialData);
  const [draft, setDraft] = useState(() => createDraft(initialData.editor));
  const [listQuery, setListQuery] = useState("");
  const [notice, setNotice] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setDraft(createDraft(data.editor));
  }, [data.editor]);

  const filteredManufacturers = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(listQuery);

    if (!normalizedQuery) {
      return data.manufacturers;
    }

    return data.manufacturers.filter((manufacturer) =>
      [manufacturer.name, manufacturer.primaryDomain].some((value) =>
        normalizeSearchValue(value).includes(normalizedQuery),
      ),
    );
  }, [data.manufacturers, listQuery]);

  const totalSourceCount = useMemo(
    () =>
      data.manufacturers.reduce(
        (total, manufacturer) => total + (manufacturer.sourceReferenceCount || 0),
        0,
      ),
    [data.manufacturers],
  );

  const liveAliases = useMemo(() => parseMultiline(draft.aliasesText), [draft.aliasesText]);
  const liveBranchCountries = useMemo(
    () => parseMultiline(draft.branchCountriesText),
    [draft.branchCountriesText],
  );

  const selectedManufacturer = data.editor.manufacturer;
  const selectionStats = data.editor.stats;
  const hasSelectedManufacturer = Boolean(selectedManufacturer?.id);
  const previewName = draft.name.trim() || selectedManufacturer?.name || copy.unnamedLabel;
  const previewDomain = draft.primaryDomain.trim() || selectedManufacturer?.primaryDomain || "";
  const previewHeadquarters =
    draft.headquartersCountry.trim() || selectedManufacturer?.headquartersCountry || "";
  const domainHref = toExternalUrl(previewDomain);

  async function loadManufacturer(manufacturerId) {
    if (!manufacturerId) {
      return;
    }

    setIsBusy(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/manufacturers?manufacturerId=${manufacturerId}`, {
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
        aliases: [],
        manufacturer: {
          branchCountries: [],
          headquartersCountry: "",
          id: null,
          name: "",
          normalizedName: "",
          primaryDomain: "",
          rankingScore: 0,
          slug: "",
        },
        models: [],
        sourceReferences: [],
        stats: {
          aliasCount: 0,
          modelCount: 0,
          sourceReferenceCount: 0,
        },
      },
      selection: {
        manufacturerId: null,
      },
    }));
    setDraft({
      aliasesText: "",
      branchCountriesText: "",
      headquartersCountry: "",
      manufacturerId: null,
      name: "",
      primaryDomain: "",
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsBusy(true);
    setNotice(null);

    try {
      const response = await fetch("/api/manufacturers", {
        body: JSON.stringify({
          aliases: parseMultiline(draft.aliasesText),
          branchCountries: parseMultiline(draft.branchCountriesText),
          headquartersCountry: draft.headquartersCountry,
          manufacturerId: draft.manufacturerId || undefined,
          name: draft.name,
          primaryDomain: draft.primaryDomain,
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

  return (
    <Page>
      <Hero>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Title>{copy.title}</Title>
        <Description>{copy.description}</Description>
        <BadgeRow>
          <Pill $tone="primary">
            {hasSelectedManufacturer
              ? copy.recordStatusEditing || "Selected record"
              : copy.recordStatusNew || "New record"}
          </Pill>
          {previewDomain ? <Pill $tone="accent">{previewDomain}</Pill> : null}
          {selectedManufacturer?.slug ? <Pill>{selectedManufacturer.slug}</Pill> : null}
        </BadgeRow>
      </Hero>
      <SummaryGrid>
        <StatCard>
          <StatValue>{data.summary.manufacturerCount}</StatValue>
          <SmallText>{copy.manufacturerSummary}</SmallText>
        </StatCard>
        <StatCard>
          <StatValue>{data.summary.aliasCount}</StatValue>
          <SmallText>{copy.aliasSummary}</SmallText>
        </StatCard>
        <StatCard>
          <StatValue>{data.summary.modelCount}</StatValue>
          <SmallText>{copy.modelSummary}</SmallText>
        </StatCard>
        <StatCard>
          <StatValue>{totalSourceCount}</StatValue>
          <SmallText>
            {copy.sourceSummary ||
              "Linked source references currently attached to canonical manufacturers."}
          </SmallText>
        </StatCard>
      </SummaryGrid>
      <Layout>
        <Stack>
          <StickyCard>
            <CardHeaderRow>
              <CardHeaderCopy>
                <CardTitle>{copy.listTitle}</CardTitle>
                <SmallText>{copy.listDescription}</SmallText>
              </CardHeaderCopy>
              <SecondaryButton onClick={handleCreateNew} type="button">
                {copy.createAction}
              </SecondaryButton>
            </CardHeaderRow>

            <FilterStack>
              <Field>
                <FieldLabel>{copy.filterFieldLabel || "Filter manufacturers"}</FieldLabel>
                <Input
                  onChange={(event) => setListQuery(event.target.value)}
                  placeholder={
                    copy.filterPlaceholder || "Search by canonical name or primary domain"
                  }
                  value={listQuery}
                />
              </Field>
              {listQuery ? (
                <BadgeRow>
                  <Pill>{filteredManufacturers.length}</Pill>
                  <SecondaryButton onClick={() => setListQuery("")} type="button">
                    {copy.clearFilterAction || "Clear filter"}
                  </SecondaryButton>
                </BadgeRow>
              ) : null}
            </FilterStack>

            {filteredManufacturers.length ? (
              <ScrollArea>
                <List>
                  {filteredManufacturers.map((manufacturer) => (
                    <ListButton
                      key={manufacturer.id}
                      onClick={() => loadManufacturer(manufacturer.id)}
                      type="button"
                      $active={data.selection.manufacturerId === manufacturer.id}
                    >
                      <ListTitle>{manufacturer.name}</ListTitle>
                      <SmallText>{manufacturer.primaryDomain || copy.notAvailable}</SmallText>
                      <BadgeRow>
                        <Pill $tone="primary">
                          {copy.aliasBadge}: {manufacturer.aliasCount}
                        </Pill>
                        <Pill>{copy.modelBadge}: {manufacturer.modelCount}</Pill>
                        <Pill>{copy.sourceBadge}: {manufacturer.sourceReferenceCount}</Pill>
                        <Pill $tone="accent">
                          {copy.scoreBadge}: {manufacturer.rankingScore}
                        </Pill>
                        {data.selection.manufacturerId === manufacturer.id ? (
                          <Pill $tone="success">
                            {copy.recordStatusEditing || "Selected record"}
                          </Pill>
                        ) : null}
                      </BadgeRow>
                    </ListButton>
                  ))}
                </List>
              </ScrollArea>
            ) : (
              <EmptyPanel>
                {listQuery
                  ? copy.filteredEmpty || "No manufacturers matched the current filter."
                  : copy.emptyManufacturers}
              </EmptyPanel>
            )}
          </StickyCard>
        </Stack>
        <Stack>
          <Card>
            <CardHeader>
              <CardTitle>{copy.overviewTitle || "Record snapshot"}</CardTitle>
              <SmallText>
                {copy.overviewDescription ||
                  "Keep the normalized record, territory coverage, and connected research visible while you edit."}
              </SmallText>
            </CardHeader>
            {previewName || previewDomain || liveAliases.length || liveBranchCountries.length ? (
              <>
                <OverviewHeader>
                  <OverviewTitle>{previewName}</OverviewTitle>
                  {previewDomain && domainHref ? (
                    <DomainLink href={domainHref} rel="noreferrer" target="_blank">
                      {previewDomain}
                    </DomainLink>
                  ) : (
                    <SmallText>{copy.notAvailable}</SmallText>
                  )}
                  <BadgeRow>
                    {hasSelectedManufacturer ? (
                      <Pill $tone="primary">
                        {copy.recordStatusEditing || "Selected record"}
                      </Pill>
                    ) : (
                      <Pill $tone="accent">{copy.recordStatusNew || "New record"}</Pill>
                    )}
                    {previewHeadquarters ? <Pill>{previewHeadquarters}</Pill> : null}
                  </BadgeRow>
                </OverviewHeader>

                <MetaGrid>
                  <MetaItem>
                    <MetaTerm>{copy.normalizedNameLabel || "Normalized name"}</MetaTerm>
                    <MetaValue>
                      {selectedManufacturer?.normalizedName || copy.notAvailable}
                    </MetaValue>
                  </MetaItem>
                  <MetaItem>
                    <MetaTerm>{copy.slugLabel || "Slug"}</MetaTerm>
                    <MetaValue>{selectedManufacturer?.slug || copy.notAvailable}</MetaValue>
                  </MetaItem>
                  <MetaItem>
                    <MetaTerm>{copy.fieldHeadquarters}</MetaTerm>
                    <MetaValue>{previewHeadquarters || copy.notAvailable}</MetaValue>
                  </MetaItem>
                  <MetaItem>
                    <MetaTerm>{copy.fieldPrimaryDomain}</MetaTerm>
                    <MetaValue>{previewDomain || copy.notAvailable}</MetaValue>
                  </MetaItem>
                </MetaGrid>

                <OverviewStats>
                  <OverviewStat>
                    <OverviewStatLabel>{copy.aliasBadge}</OverviewStatLabel>
                    <OverviewStatValue>{selectionStats.aliasCount}</OverviewStatValue>
                  </OverviewStat>
                  <OverviewStat>
                    <OverviewStatLabel>{copy.modelBadge}</OverviewStatLabel>
                    <OverviewStatValue>{selectionStats.modelCount}</OverviewStatValue>
                  </OverviewStat>
                  <OverviewStat>
                    <OverviewStatLabel>{copy.sourceBadge}</OverviewStatLabel>
                    <OverviewStatValue>{selectionStats.sourceReferenceCount}</OverviewStatValue>
                  </OverviewStat>
                  <OverviewStat>
                    <OverviewStatLabel>{copy.scoreBadge}</OverviewStatLabel>
                    <OverviewStatValue>{selectedManufacturer?.rankingScore || 0}</OverviewStatValue>
                  </OverviewStat>
                </OverviewStats>

                <PreviewSplit>
                  <TagSection>
                    <SectionTitle>{copy.fieldAliases}</SectionTitle>
                    {liveAliases.length ? (
                      <TagCloud>
                        {liveAliases.map((alias) => (
                          <Pill key={alias}>{alias}</Pill>
                        ))}
                      </TagCloud>
                    ) : (
                      <SmallText>{copy.notAvailable}</SmallText>
                    )}
                  </TagSection>

                  <TagSection>
                    <SectionTitle>{copy.fieldBranchCountries}</SectionTitle>
                    {liveBranchCountries.length ? (
                      <TagCloud>
                        {liveBranchCountries.map((country) => (
                          <Pill key={country} $tone="accent">
                            {country}
                          </Pill>
                        ))}
                      </TagCloud>
                    ) : (
                      <SmallText>
                        {copy.branchCoverageEmpty ||
                          "No branch countries have been captured yet."}
                      </SmallText>
                    )}
                  </TagSection>
                </PreviewSplit>
              </>
            ) : (
              <EmptyPanel>
                {copy.overviewEmpty ||
                  "Create a new manufacturer or choose one from the list to inspect its current normalization snapshot."}
              </EmptyPanel>
            )}
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{copy.editorTitle}</CardTitle>
              <SmallText>{copy.editorDescription}</SmallText>
            </CardHeader>
            {notice ? <StatusBanner $tone={notice.kind}>{notice.message}</StatusBanner> : null}
            <Form onSubmit={handleSave}>
              <FormSection>
                <SectionTitle>Identity</SectionTitle>
                <FieldGrid>
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
                    <FieldLabel>{copy.fieldPrimaryDomain}</FieldLabel>
                    <Input
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          primaryDomain: event.target.value,
                        }))
                      }
                      value={draft.primaryDomain}
                    />
                  </Field>
                </FieldGrid>
              </FormSection>

              <FormSection>
                <SectionTitle>Coverage</SectionTitle>
                <FieldGrid>
                  <Field>
                    <FieldLabel>{copy.fieldHeadquarters}</FieldLabel>
                    <Input
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          headquartersCountry: event.target.value,
                        }))
                      }
                      value={draft.headquartersCountry}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{copy.fieldBranchCountries}</FieldLabel>
                    <Textarea
                      $rows={5}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          branchCountriesText: event.target.value,
                        }))
                      }
                      value={draft.branchCountriesText}
                    />
                    <SmallText>{copy.fieldBranchCountriesHint}</SmallText>
                  </Field>
                </FieldGrid>
              </FormSection>

              <FormSection>
                <SectionTitle>{copy.fieldAliases}</SectionTitle>
                <Field>
                  <FieldLabel>{copy.fieldAliases}</FieldLabel>
                  <Textarea
                    $rows={6}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        aliasesText: event.target.value,
                      }))
                    }
                    value={draft.aliasesText}
                  />
                  <SmallText>{copy.fieldAliasesHint}</SmallText>
                </Field>
              </FormSection>

              <ActionRow>
                <SmallText>
                  {isBusy
                    ? copy.saveWorking
                    : draft.manufacturerId
                      ? `${copy.editingLabel}: ${draft.name || copy.unnamedLabel}`
                      : copy.creatingLabel}
                </SmallText>
                <SaveButton disabled={isBusy} type="submit">
                  {isBusy ? copy.saveWorking : copy.saveAction}
                </SaveButton>
              </ActionRow>
            </Form>
          </Card>
          <DetailGrid>
            <Card>
              <CardHeader>
                <CardTitle>{copy.modelsTitle}</CardTitle>
                <SmallText>
                  Models already linked to the selected canonical manufacturer stay visible here
                  while you edit naming and territory data.
                </SmallText>
              </CardHeader>
              {data.editor.models.length ? (
                <List>
                  {data.editor.models.map((model) => (
                    <DetailItem key={model.id}>
                      <DetailTitle>{model.name}</DetailTitle>
                      <SmallText>{model.equipmentName}</SmallText>
                      <BadgeRow>
                        <Pill>{copy.modelYearBadge}: {model.latestKnownYear || copy.notAvailable}</Pill>
                        <Pill $tone="accent">{copy.scoreBadge}: {model.rankingScore}</Pill>
                        <Pill>{copy.sourceBadge}: {model.sourceReferenceCount}</Pill>
                      </BadgeRow>
                    </DetailItem>
                  ))}
                </List>
              ) : (
                <EmptyPanel>{copy.emptyModels}</EmptyPanel>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{copy.sourcesTitle}</CardTitle>
                <SmallText>
                  The most recent research references stay grouped here so verification context is
                  visible beside the canonical record.
                </SmallText>
              </CardHeader>
              {data.editor.sourceReferences.length ? (
                <List>
                  {data.editor.sourceReferences.map((sourceReference) => (
                    <DetailItem key={sourceReference.id}>
                      <DetailTitle>{sourceReference.title}</DetailTitle>
                      <SmallText>{sourceReference.sourceDomain}</SmallText>
                      <BadgeRow>
                        <Pill>{sourceReference.sourceType}</Pill>
                        {sourceReference.reliabilityTier ? (
                          <Pill $tone="accent">{sourceReference.reliabilityTier}</Pill>
                        ) : null}
                        {sourceReference.lastCheckedAt ? (
                          <Pill $tone="success">
                            {(copy.lastCheckedLabel || "Last checked")}:{" "}
                            {formatDate(sourceReference.lastCheckedAt)}
                          </Pill>
                        ) : null}
                      </BadgeRow>
                      {sourceReference.url ? (
                        <DetailLink href={sourceReference.url} rel="noreferrer" target="_blank">
                          {sourceReference.url}
                        </DetailLink>
                      ) : null}
                    </DetailItem>
                  ))}
                </List>
              ) : (
                <EmptyPanel>{copy.emptySources}</EmptyPanel>
              )}
            </Card>
          </DetailGrid>
        </Stack>
      </Layout>
    </Page>
  );
}
