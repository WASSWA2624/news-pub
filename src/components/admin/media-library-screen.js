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
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.2), transparent 40%),
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
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  align-items: start;

  @media (min-width: 1240px) {
    grid-template-columns: minmax(360px, 430px) minmax(0, 1fr);
  }
`;

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  align-content: start;
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
`;

const StatusBanner = styled.div`
  background: ${({ $tone }) => ($tone === "success" ? "rgba(21, 115, 71, 0.12)" : "rgba(180, 35, 24, 0.12)")};
  border: 1px solid
    ${({ $tone, theme }) => ($tone === "success" ? theme.colors.success : theme.colors.danger)};
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

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
`;

const FieldGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
`;

const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
`;

const FieldLabel = styled.span`
  color: ${({ theme }) => theme.colors.text};
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
  padding: 0.8rem 0.92rem;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
  width: 100%;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(0, 95, 115, 0.12);
    outline: none;
  }

  &[type="file"] {
    background:
      linear-gradient(180deg, rgba(247, 249, 252, 0.98), rgba(255, 255, 255, 0.98));
    cursor: pointer;
    padding: 0.6rem 0.72rem;
  }

  &::file-selector-button {
    background: linear-gradient(180deg, #244b73, #1c3a59);
    border: none;
    border-radius: 999px;
    color: white;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    margin-right: 0.75rem;
    padding: 0.62rem 0.95rem;
  }
`;

const Textarea = styled.textarea`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: 7.5rem;
  min-width: 0;
  padding: 0.8rem 0.92rem;
  resize: vertical;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
  width: 100%;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(0, 95, 115, 0.12);
    outline: none;
  }
`;

const CheckboxLabel = styled.label`
  align-items: center;
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  font-weight: 600;
`;

const Checkbox = styled.input`
  accent-color: ${({ theme }) => theme.colors.primary};
  height: 1rem;
  width: 1rem;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const PrimaryButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 999px;
  color: white;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font: inherit;
  font-weight: 700;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.82rem 1.35rem;
`;

const SecondaryButton = styled.button`
  background: rgba(247, 249, 252, 0.96);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font: inherit;
  font-weight: 600;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.82rem 1.1rem;
`;

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ListButton = styled.button`
  background: ${({ $active }) => ($active ? "rgba(0, 95, 115, 0.12)" : "rgba(255, 255, 255, 0.98)")};
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
    box-shadow: 0 16px 34px rgba(16, 32, 51, 0.08);
    transform: translateY(-1px);
  }
`;

const AssetRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  grid-template-columns: 84px minmax(0, 1fr);
`;

const ThumbnailFrame = styled.div`
  align-items: center;
  background:
    linear-gradient(135deg, rgba(0, 95, 115, 0.08), rgba(201, 123, 42, 0.14)),
    rgba(247, 249, 252, 0.92);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: ${({ theme }) => theme.radius.sm};
  display: flex;
  justify-content: center;
  min-height: 84px;
  overflow: hidden;
`;

const ThumbnailImage = styled.img`
  display: block;
  height: 100%;
  max-height: 84px;
  object-fit: cover;
  width: 100%;
`;

const PlaceholderText = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const ListTitle = styled.strong`
  font-size: 1rem;
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
      : $tone === "success"
        ? "rgba(21, 115, 71, 0.14)"
        : "rgba(0, 95, 115, 0.12)"};
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
`;

const PreviewFrame = styled.div`
  align-items: center;
  background:
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.14), transparent 45%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.08), rgba(16, 32, 51, 0.03));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: flex;
  justify-content: center;
  min-height: 280px;
  overflow: hidden;
  padding: ${({ theme }) => theme.spacing.md};
`;

const PreviewImage = styled.img`
  display: block;
  height: auto;
  max-height: 520px;
  max-width: 100%;
  object-fit: contain;
`;

const MetaGrid = styled.dl`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
`;

const MetaItem = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const MetaTerm = styled.dt`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin: 0;
  text-transform: uppercase;
`;

const MetaValue = styled.dd`
  margin: 0;
  overflow-wrap: anywhere;
`;

const LinkValue = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const VariantGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
`;

const VariantCard = styled.div`
  background: rgba(247, 249, 252, 0.9);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
`;

function createUploadDraft() {
  return {
    alt: "",
    attributionText: "",
    caption: "",
    file: null,
    isAiGenerated: false,
    licenseType: "",
    sourceUrl: "",
    usageNotes: "",
  };
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString();
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDimensions(width, height) {
  if (!width || !height) {
    return null;
  }

  return `${width} x ${height}`;
}

function buildMediaQueryUrl(query, assetId) {
  const params = new URLSearchParams();

  if (query) {
    params.set("query", query);
  }

  if (assetId) {
    params.set("assetId", assetId);
  }

  const suffix = params.toString();

  return suffix ? `/api/media?${suffix}` : "/api/media";
}

export default function MediaLibraryScreen({ copy, initialData }) {
  const [data, setData] = useState(initialData);
  const [draft, setDraft] = useState(() => createUploadDraft());
  const [queryDraft, setQueryDraft] = useState(initialData.filters.query || "");
  const [notice, setNotice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const selectedAsset = useMemo(
    () =>
      data.assets.find((asset) => asset.id === data.selection.assetId) ||
      data.editor.asset ||
      data.assets[0] ||
      null,
    [data.assets, data.editor.asset, data.selection.assetId],
  );

  async function loadLibrary(query = data.filters.query, assetId = data.selection.assetId) {
    setIsLoading(true);
    setNotice(null);

    try {
      const response = await fetch(buildMediaQueryUrl(query, assetId), {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.searchErrorPrefix);
      }

      startTransition(() => {
        setData(payload.data);
        setQueryDraft(payload.data.filters.query || "");
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `${copy.searchErrorPrefix}: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectAsset(assetId) {
    const asset = data.assets.find((entry) => entry.id === assetId);

    if (!asset) {
      return;
    }

    setNotice(null);
    setData((currentData) => ({
      ...currentData,
      editor: {
        asset,
      },
      selection: {
        assetId,
      },
    }));
  }

  async function handleSearch(event) {
    event.preventDefault();
    await loadLibrary(queryDraft, data.selection.assetId);
  }

  async function handleClearSearch() {
    setQueryDraft("");
    await loadLibrary("", null);
  }

  async function handleUpload(event) {
    event.preventDefault();
    setIsUploading(true);
    setNotice(null);

    try {
      const formData = new FormData();

      if (draft.file) {
        formData.set("file", draft.file);
      }

      formData.set("alt", draft.alt);
      formData.set("attributionText", draft.attributionText);
      formData.set("caption", draft.caption);
      formData.set("isAiGenerated", `${draft.isAiGenerated}`);
      formData.set("licenseType", draft.licenseType);
      formData.set("sourceUrl", draft.sourceUrl);
      formData.set("usageNotes", draft.usageNotes);

      const response = await fetch("/api/media", {
        body: formData,
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.uploadErrorPrefix);
      }

      startTransition(() => {
        setData(payload.data.snapshot);
        setQueryDraft(payload.data.snapshot.filters.query || "");
        setDraft(createUploadDraft());
        setFileInputKey((currentValue) => currentValue + 1);
      });
      setNotice({
        kind: "success",
        message: copy.uploadSuccess,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `${copy.uploadErrorPrefix}: ${error.message}`,
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Page>
      <Hero>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Title>{copy.title}</Title>
        <Description>{copy.description}</Description>
        <BadgeRow>
          <Pill>{copy.currentDriverLabel}: {data.configuration.driver}</Pill>
          <Pill $tone="accent">{copy.allowedMimeTypesLabel}: {data.configuration.uploadAllowedMimeTypes.join(", ")}</Pill>
        </BadgeRow>
      </Hero>
      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{data.summary.totalAssetCount}</SummaryValue>
          <SmallText>{copy.assetCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{data.summary.totalVariantCount}</SummaryValue>
          <SmallText>{copy.variantCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{data.summary.aiGeneratedCount}</SummaryValue>
          <SmallText>{copy.aiGeneratedCountLabel}</SmallText>
        </SummaryCard>
      </SummaryGrid>
      <Layout>
        <Stack>
          <Card>
            <CardTitle>{copy.uploadTitle}</CardTitle>
            <SmallText>{copy.uploadDescription}</SmallText>
            {notice ? <StatusBanner $tone={notice.kind}>{notice.message}</StatusBanner> : null}
            <Form onSubmit={handleUpload}>
              <Field>
                <FieldLabel>{copy.fieldFile}</FieldLabel>
                <Input
                  accept={data.configuration.uploadAllowedMimeTypes.join(",")}
                  key={fileInputKey}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                  type="file"
                />
                <SmallText>{copy.mimeTypesHint}</SmallText>
              </Field>
              <FieldGrid>
                <Field>
                  <FieldLabel>{copy.fieldAlt}</FieldLabel>
                  <Input
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        alt: event.target.value,
                      }))
                    }
                    value={draft.alt}
                  />
                </Field>
                <Field>
                  <FieldLabel>{copy.fieldCaption}</FieldLabel>
                  <Input
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        caption: event.target.value,
                      }))
                    }
                    value={draft.caption}
                  />
                </Field>
              </FieldGrid>
              <FieldGrid>
                <Field>
                  <FieldLabel>{copy.fieldSourceUrl}</FieldLabel>
                  <Input
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        sourceUrl: event.target.value,
                      }))
                    }
                    value={draft.sourceUrl}
                  />
                </Field>
                <Field>
                  <FieldLabel>{copy.fieldLicenseType}</FieldLabel>
                  <Input
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        licenseType: event.target.value,
                      }))
                    }
                    value={draft.licenseType}
                  />
                </Field>
              </FieldGrid>
              <Field>
                <FieldLabel>{copy.fieldAttribution}</FieldLabel>
                <Input
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      attributionText: event.target.value,
                    }))
                  }
                  value={draft.attributionText}
                />
              </Field>
              <Field>
                <FieldLabel>{copy.fieldUsageNotes}</FieldLabel>
                <Textarea
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      usageNotes: event.target.value,
                    }))
                  }
                  value={draft.usageNotes}
                />
              </Field>
              <CheckboxLabel>
                <Checkbox
                  checked={draft.isAiGenerated}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      isAiGenerated: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                {copy.isAiGeneratedLabel}
              </CheckboxLabel>
              <ButtonRow>
                <PrimaryButton disabled={isUploading} type="submit">
                  {isUploading ? copy.uploadWorking : copy.uploadAction}
                </PrimaryButton>
              </ButtonRow>
            </Form>
          </Card>
          <Card>
            <CardTitle>{copy.libraryTitle}</CardTitle>
            <SmallText>{copy.libraryDescription}</SmallText>
            <Form onSubmit={handleSearch}>
              <Field>
                <FieldLabel>{copy.searchFieldLabel}</FieldLabel>
                <Input
                  onChange={(event) => setQueryDraft(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  value={queryDraft}
                />
              </Field>
              <ButtonRow>
                <PrimaryButton disabled={isLoading} type="submit">
                  {isLoading ? copy.searchWorking : copy.searchAction}
                </PrimaryButton>
                <SecondaryButton disabled={isLoading} onClick={handleClearSearch} type="button">
                  {copy.clearSearchAction}
                </SecondaryButton>
              </ButtonRow>
            </Form>
            {data.assets.length ? (
              <List>
                {data.assets.map((asset) => (
                  <ListButton
                    key={asset.id}
                    onClick={() => handleSelectAsset(asset.id)}
                    type="button"
                    $active={data.selection.assetId === asset.id}
                  >
                    <AssetRow>
                      <ThumbnailFrame>
                        {asset.previewUrl ? (
                          <ThumbnailImage alt={asset.alt || asset.fileName || "Media preview"} loading="lazy" src={asset.previewUrl} />
                        ) : (
                          <PlaceholderText>{copy.noPreview}</PlaceholderText>
                        )}
                      </ThumbnailFrame>
                      <div>
                        <ListTitle>{asset.fileName || asset.alt || copy.untitledAssetLabel}</ListTitle>
                        <SmallText>{formatDate(asset.createdAt) || copy.notAvailable}</SmallText>
                        <BadgeRow>
                          <Pill>{asset.storageDriver}</Pill>
                          <Pill $tone="accent">{formatDimensions(asset.width, asset.height) || copy.notAvailable}</Pill>
                          <Pill $tone="success">{copy.variantsBadgeLabel}: {asset.variantCount}</Pill>
                          {asset.isAiGenerated ? <Pill>{copy.aiGeneratedBadge}</Pill> : null}
                        </BadgeRow>
                      </div>
                    </AssetRow>
                  </ListButton>
                ))}
              </List>
            ) : (
              <SmallText>{copy.emptyState}</SmallText>
            )}
          </Card>
        </Stack>
        <Stack>
          <Card>
            <CardTitle>{copy.previewTitle}</CardTitle>
            {selectedAsset ? (
              <>
                <SmallText>{selectedAsset.alt || selectedAsset.caption || copy.previewDescription}</SmallText>
                <PreviewFrame>
                  {selectedAsset.previewUrl ? (
                    <PreviewImage alt={selectedAsset.alt || selectedAsset.fileName || "Media preview"} src={selectedAsset.previewUrl} />
                  ) : (
                    <PlaceholderText>{copy.noPreview}</PlaceholderText>
                  )}
                </PreviewFrame>
                <BadgeRow>
                  <Pill>{selectedAsset.storageDriver}</Pill>
                  <Pill $tone="accent">{selectedAsset.mimeType || copy.notAvailable}</Pill>
                  <Pill $tone="success">{formatDimensions(selectedAsset.width, selectedAsset.height) || copy.notAvailable}</Pill>
                  {selectedAsset.isAiGenerated ? <Pill>{copy.aiGeneratedBadge}</Pill> : <Pill>{copy.sourceBackedBadge}</Pill>}
                </BadgeRow>
              </>
            ) : (
              <SmallText>{copy.noSelection}</SmallText>
            )}
          </Card>
          <Card>
            <CardTitle>{copy.metadataTitle}</CardTitle>
            {selectedAsset ? (
              <MetaGrid>
                <MetaItem>
                  <MetaTerm>{copy.fileNameLabel}</MetaTerm>
                  <MetaValue>{selectedAsset.fileName || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.fileSizeLabel}</MetaTerm>
                  <MetaValue>{formatBytes(selectedAsset.fileSizeBytes) || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.mimeTypeLabel}</MetaTerm>
                  <MetaValue>{selectedAsset.mimeType || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.dimensionsLabel}</MetaTerm>
                  <MetaValue>{formatDimensions(selectedAsset.width, selectedAsset.height) || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.altTextLabel}</MetaTerm>
                  <MetaValue>{selectedAsset.alt || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.captionLabel}</MetaTerm>
                  <MetaValue>{selectedAsset.caption || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.attributionLabel}</MetaTerm>
                  <MetaValue>{selectedAsset.attributionText || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.licenseTypeLabel}</MetaTerm>
                  <MetaValue>{selectedAsset.licenseType || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.sourceDomainLabel}</MetaTerm>
                  <MetaValue>{selectedAsset.sourceDomain || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.uploadedAtLabel}</MetaTerm>
                  <MetaValue>{formatDate(selectedAsset.createdAt) || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.updatedAtLabel}</MetaTerm>
                  <MetaValue>{formatDate(selectedAsset.updatedAt) || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.storagePathLabel}</MetaTerm>
                  <MetaValue>{selectedAsset.localPath || selectedAsset.storageKey || copy.notAvailable}</MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.publicUrlLabel}</MetaTerm>
                  <MetaValue>
                    {selectedAsset.publicUrl ? (
                      <LinkValue href={selectedAsset.publicUrl} rel="noreferrer" target="_blank">
                        {selectedAsset.publicUrl}
                      </LinkValue>
                    ) : (
                      copy.notAvailable
                    )}
                  </MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.sourceUrlLabel}</MetaTerm>
                  <MetaValue>
                    {selectedAsset.sourceUrl ? (
                      <LinkValue href={selectedAsset.sourceUrl} rel="noreferrer" target="_blank">
                        {selectedAsset.sourceUrl}
                      </LinkValue>
                    ) : (
                      copy.notAvailable
                    )}
                  </MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{copy.usageNotesLabel}</MetaTerm>
                  <MetaValue>{selectedAsset.usageNotes || copy.notAvailable}</MetaValue>
                </MetaItem>
              </MetaGrid>
            ) : (
              <SmallText>{copy.noSelection}</SmallText>
            )}
          </Card>
          <Card>
            <CardTitle>{copy.variantsTitle}</CardTitle>
            {selectedAsset?.variants.length ? (
              <VariantGrid>
                {selectedAsset.variants.map((variant) => (
                  <VariantCard key={variant.id}>
                    <BadgeRow>
                      <Pill>{variant.variantKey}</Pill>
                      <Pill $tone="accent">{variant.format}</Pill>
                    </BadgeRow>
                    <SmallText>{formatDimensions(variant.width, variant.height) || copy.notAvailable}</SmallText>
                    <SmallText>{formatBytes(variant.fileSizeBytes) || copy.notAvailable}</SmallText>
                    <SmallText>{variant.storageKey || variant.localPath || copy.notAvailable}</SmallText>
                    {variant.publicUrl ? (
                      <LinkValue href={variant.publicUrl} rel="noreferrer" target="_blank">
                        {variant.publicUrl}
                      </LinkValue>
                    ) : null}
                  </VariantCard>
                ))}
              </VariantGrid>
            ) : (
              <SmallText>{copy.noVariants}</SmallText>
            )}
          </Card>
        </Stack>
      </Layout>
    </Page>
  );
}
