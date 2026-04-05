import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  Card,
  CardHeader,
  CardTitle,
  DataTable,
  DataTableWrap,
  EmptyState,
  LinkButton,
  SmallText,
  StatusBadge,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
  formatDateTime,
} from "@/components/admin/news-admin-ui";
import { getPostInventorySnapshot } from "@/features/posts";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";

export default async function PublishedPostsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getPostInventorySnapshot({
      page: resolvedSearchParams?.page,
      scope: "published",
      search: resolvedSearchParams?.search,
    }),
  ]);
  const copy = messages.admin.published;

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminTitle>{copy.title}</AdminTitle>
        <AdminDescription>{copy.description}</AdminDescription>
      </AdminHero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.publishedCount}</SummaryValue>
          <SummaryLabel>Total published stories</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.items.filter((item) => item.websitePublished).length}</SummaryValue>
          <SummaryLabel>Website published on this page</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.items.length}</SummaryValue>
          <SummaryLabel>Visible on this page</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <Card>
        <CardHeader>
          <CardTitle>Published stories</CardTitle>
          <SmallText>Published inventory stays compact on mobile while preserving website and source context.</SmallText>
        </CardHeader>
        {snapshot.items.length ? (
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Story</th>
                  <th>Status</th>
                  <th>Published</th>
                  <th>Source</th>
                  <th>Website</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Story">
                      <strong>{item.title}</strong>
                      <SmallText>{item.slug}</SmallText>
                    </td>
                    <td data-label="Status">
                      <StatusBadge $tone={item.status === "PUBLISHED" ? "success" : "warning"}>
                        {item.status}
                      </StatusBadge>
                    </td>
                    <td data-label="Published">{formatDateTime(item.publishedAt)}</td>
                    <td data-label="Source">{item.sourceName}</td>
                    <td data-label="Website">{item.websitePublished ? "Yes" : "No"}</td>
                    <td data-label="Action">
                      <LinkButton href={`/admin/posts/${item.id}`}>Open editor</LinkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        ) : (
          <EmptyState>No published stories have been recorded yet.</EmptyState>
        )}
      </Card>
    </AdminPage>
  );
}
