import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  DataTable,
  DataTableWrap,
  EmptyState,
  Field,
  FieldGrid,
  FieldLabel,
  Input,
  PrimaryButton,
  SectionGrid,
  SmallText,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
  Textarea,
} from "@/components/admin/news-admin-ui";
import AdminFormModal from "@/components/admin/admin-form-modal";
import { getMediaLibrarySnapshot } from "@/features/media";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import styled from "styled-components";
import { uploadMediaAction } from "../actions";

const UploadForm = styled.form`
  display: grid;
  gap: 0.85rem;
`;

export default async function MediaPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getMediaLibrarySnapshot(),
  ]);
  const copy = messages.admin.media;

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminTitle>{copy.title}</AdminTitle>
        <AdminDescription>{copy.description}</AdminDescription>
      </AdminHero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.totalCount}</SummaryValue>
          <SummaryLabel>Total media assets</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.variantCount}</SummaryValue>
          <SummaryLabel>Generated variants</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardHeader>
            <CardTitle>Upload media asset</CardTitle>
            <CardDescription>
              Uploaded assets go through the shared storage adapter and responsive variant pipeline.
            </CardDescription>
          </CardHeader>
          <SmallText>
            Launch a compact upload modal when you need to add a file, source metadata, and descriptive text.
          </SmallText>
          <AdminFormModal
            description="Upload a media asset with source information, descriptive text, and attribution in one responsive form."
            size="wide"
            title="Upload media asset"
            triggerFullWidth
            triggerLabel="Upload asset"
            triggerTone="primary"
          >
            <UploadForm action={uploadMediaAction}>
              <FieldGrid>
                <Field>
                  <FieldLabel>File</FieldLabel>
                  <Input name="file" required type="file" />
                </Field>
                <Field>
                  <FieldLabel>Source URL</FieldLabel>
                  <Input name="sourceUrl" />
                </Field>
                <Field>
                  <FieldLabel>Alt text</FieldLabel>
                  <Input name="alt" />
                </Field>
                <Field>
                  <FieldLabel>Attribution</FieldLabel>
                  <Input name="attributionText" />
                </Field>
              </FieldGrid>
              <Field>
                <FieldLabel>Caption</FieldLabel>
                <Textarea name="caption" />
              </Field>
              <PrimaryButton type="submit">Upload asset</PrimaryButton>
            </UploadForm>
          </AdminFormModal>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current media library</CardTitle>
            <CardDescription>Files stay scannable on mobile with the same details visible as compact cards.</CardDescription>
          </CardHeader>
          {snapshot.assets.length ? (
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Source</th>
                    <th>Size</th>
                    <th>Variants</th>
                  </tr>
                </thead>
                <tbody>
                {snapshot.assets.map((asset) => (
                  <tr key={asset.id}>
                    <td data-label="Asset">
                      <strong>{asset.fileName || asset.id}</strong>
                      <SmallText>{asset.alt || asset.caption || "No descriptive text"}</SmallText>
                    </td>
                    <td data-label="Source">{asset.sourceDomain || asset.storageDriver}</td>
                    <td data-label="Size">{asset.fileSizeBytes || 0} bytes</td>
                    <td data-label="Variants">{asset.variants.length}</td>
                  </tr>
                ))}
                </tbody>
              </DataTable>
            </DataTableWrap>
          ) : (
            <EmptyState>No media assets have been uploaded or ingested yet.</EmptyState>
          )}
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
