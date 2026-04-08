/**
 * Admin page for browsing and uploading NewsPub media assets.
 */

import {
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  Card,
  CardHeader,
  CardDescription,
  DataTable,
  DataTableWrap,
  EmptyState,
  SectionGrid,
  SmallText,
  SummaryGrid,
} from "@/components/admin/news-admin-ui";
import AdminFormModal from "@/components/admin/admin-form-modal";
import MediaUploadModalForm from "@/components/admin/media-upload-modal-form";
import { getMediaLibrarySnapshot } from "@/features/media";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { uploadMediaAction } from "../actions";

/**
 * Renders the admin media library page with the shared upload modal workflow
 * and the current asset inventory.
 *
 * @returns {Promise<JSX.Element>} The media library route.
 */
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
        <AdminHeroHeading description={copy.description} icon="media" title={copy.title} />
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="media" label="Total media assets" value={snapshot.summary.totalCount} />
        <AdminMetricCard icon="layout" label="Generated variants" value={snapshot.summary.variantCount} />
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardHeader>
            <AdminSectionTitle icon="upload">Upload media asset</AdminSectionTitle>
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
            triggerIcon="upload"
            triggerLabel="Upload asset"
            triggerTone="primary"
          >
            <MediaUploadModalForm action={uploadMediaAction} />
          </AdminFormModal>
        </Card>

        <Card>
          <CardHeader>
            <AdminSectionTitle icon="image">Current media library</AdminSectionTitle>
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
