import {
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  Card,
  CardHeader,
  DataTable,
  DataTableWrap,
  EmptyState,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
} from "@/components/admin/news-admin-ui";
import { getSeoManagementSnapshot } from "@/features/seo";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";

/**
 * Renders the compact SEO review route for published website story metadata.
 *
 * @returns {Promise<JSX.Element>} The SEO route.
 */
export default async function SeoPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getSeoManagementSnapshot(),
  ]);
  const copy = messages.admin.seo;

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminHeroHeading description={copy.description} icon="seo" title={copy.title} />
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="published" label="Published website stories" value={snapshot.summary.publishedStoryCount} />
        <AdminMetricCard icon="categories" label="Category landing pages" value={snapshot.summary.categoryPageCount} />
        <AdminMetricCard icon="globe" label="Story locale records" value={snapshot.summary.storyLocalesCount} />
      </SummaryGrid>

      <Card>
        <CardHeader>
          <AdminSectionTitle icon="seo">Published story metadata</AdminSectionTitle>
          <EmptyState>SEO review stays compact on mobile without losing canonical and locale coverage details.</EmptyState>
        </CardHeader>
        {snapshot.stories.length ? (
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Story</th>
                  <th>Canonical URL</th>
                  <th>Locales</th>
                  <th>SEO status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.stories.map((story) => (
                  <tr key={story.slug}>
                    <td data-label="Story">{story.metaTitle}</td>
                    <td data-label="Canonical URL">{story.canonicalUrl}</td>
                    <td data-label="Locales">{story.locales.join(", ")}</td>
                    <td data-label="SEO status">{story.missingSeoRecord ? "Needs review" : "Configured"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        ) : (
          <EmptyState>No published website stories are available for SEO review yet.</EmptyState>
        )}
      </Card>
    </AdminPage>
  );
}
