import {
  ActionIcon,
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  ButtonIcon,
  ButtonRow,
  Card,
  CardHeader,
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
        <AdminHeroHeading description={copy.description} icon="published" title={copy.title} />
        <ButtonRow>
          <LinkButton href="/admin/posts/new">
            <ButtonIcon>
              <ActionIcon name="edit" />
            </ButtonIcon>
            Create manual story
          </LinkButton>
        </ButtonRow>
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="published" label="Total published stories" value={snapshot.summary.publishedCount} />
        <AdminMetricCard icon="globe" label="Website published on this page" value={snapshot.items.filter((item) => item.websitePublished).length} />
        <AdminMetricCard icon="news" label="Visible on this page" value={snapshot.items.length} />
      </SummaryGrid>

      <Card>
        <CardHeader>
          <AdminSectionTitle icon="published">Published stories</AdminSectionTitle>
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
                      <LinkButton href={`/admin/posts/${item.id}`}>
                        <ButtonIcon>
                          <ActionIcon name="edit" />
                        </ButtonIcon>
                        Open editor
                      </LinkButton>
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
