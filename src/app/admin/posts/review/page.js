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

function getTone(status) {
  if (status === "SCHEDULED") {
    return "warning";
  }

  return "success";
}

export default async function ReviewQueuePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getPostInventorySnapshot({
      page: resolvedSearchParams?.page,
      scope: "review",
      search: resolvedSearchParams?.search,
    }),
  ]);
  const copy = messages.admin.review;

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminTitle>{copy.title}</AdminTitle>
        <AdminDescription>{copy.description}</AdminDescription>
      </AdminHero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.reviewCount}</SummaryValue>
          <SummaryLabel>Stories awaiting action</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.scheduledCount}</SummaryValue>
          <SummaryLabel>Scheduled stories</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.items.length}</SummaryValue>
          <SummaryLabel>Visible on this page</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <Card>
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <SmallText>Stories stay easy to scan on small screens without losing the editorial status details.</SmallText>
        </CardHeader>
        {snapshot.items.length ? (
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Story</th>
                  <th>Status</th>
                  <th>Editorial stage</th>
                  <th>Source</th>
                  <th>Scheduled</th>
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
                      <StatusBadge $tone={getTone(item.status)}>{item.status}</StatusBadge>
                    </td>
                    <td data-label="Editorial stage">{item.editorialStage}</td>
                    <td data-label="Source">{item.sourceName}</td>
                    <td data-label="Scheduled">{formatDateTime(item.scheduledPublishAt)}</td>
                    <td data-label="Action">
                      <LinkButton href={`/admin/posts/${item.id}`}>Open editor</LinkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        ) : (
          <EmptyState>No held or scheduled stories are waiting for review.</EmptyState>
        )}
      </Card>
    </AdminPage>
  );
}
