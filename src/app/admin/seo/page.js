import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  Card,
  CardTitle,
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
        <AdminTitle>{copy.title}</AdminTitle>
        <AdminDescription>{copy.description}</AdminDescription>
      </AdminHero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.publishedStoryCount}</SummaryValue>
          <SummaryLabel>Published website stories</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.categoryPageCount}</SummaryValue>
          <SummaryLabel>Category landing pages</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.storyLocalesCount}</SummaryValue>
          <SummaryLabel>Story locale records</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <Card>
        <CardTitle>Published story metadata</CardTitle>
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
                    <td>{story.metaTitle}</td>
                    <td>{story.canonicalUrl}</td>
                    <td>{story.locales.join(", ")}</td>
                    <td>{story.missingSeoRecord ? "Needs review" : "Configured"}</td>
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
