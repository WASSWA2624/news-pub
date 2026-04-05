import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  ButtonRow,
  Card,
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
import { getMediaLibrarySnapshot } from "@/features/media";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { uploadMediaAction } from "../actions";

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
          <CardTitle>Upload media asset</CardTitle>
          <CardDescription>
            Uploaded assets go through the shared storage adapter and responsive variant pipeline.
          </CardDescription>
          <form action={uploadMediaAction}>
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
            <Field style={{ marginTop: "0.85rem" }}>
              <FieldLabel>Caption</FieldLabel>
              <Textarea name="caption" />
            </Field>
            <ButtonRow style={{ marginTop: "0.85rem" }}>
              <PrimaryButton type="submit">Upload asset</PrimaryButton>
            </ButtonRow>
          </form>
        </Card>

        <Card>
          <CardTitle>Current media library</CardTitle>
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
                      <td>
                        <strong>{asset.fileName || asset.id}</strong>
                        <SmallText>{asset.alt || asset.caption || "No descriptive text"}</SmallText>
                      </td>
                      <td>{asset.sourceDomain || asset.storageDriver}</td>
                      <td>{asset.fileSizeBytes || 0} bytes</td>
                      <td>{asset.variants.length}</td>
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
