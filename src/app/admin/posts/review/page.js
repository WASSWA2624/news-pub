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

function getTone(status) {
  if (["PUBLISHED", "APPROVED", "PASS", "OPTIMIZED"].includes(status)) {
    return "success";
  }

  if (["FAILED", "BLOCK"].includes(status)) {
    return "danger";
  }

  if (status === "SCHEDULED") {
    return "warning";
  }

  return "warning";
}

/**
 * Renders the admin review queue for draft and scheduled stories.
 *
 * @param {object} props - Search param props for filtering the queue.
 * @returns {Promise<JSX.Element>} The review queue page.
 */
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
        <AdminHeroHeading description={copy.description} icon="review" title={copy.title} />
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
        <AdminMetricCard icon="review" label="Stories awaiting action" value={snapshot.summary.reviewCount} />
        <AdminMetricCard icon="calendar-clock" label="Scheduled stories" tone="accent" value={snapshot.summary.scheduledCount} />
        <AdminMetricCard icon="news" label="Visible on this page" value={snapshot.items.length} />
      </SummaryGrid>

      <Card>
        <CardHeader>
          <AdminSectionTitle icon="review">Review queue</AdminSectionTitle>
          <SmallText>Stories stay easy to scan on small screens without losing the editorial status details.</SmallText>
        </CardHeader>
        {snapshot.items.length ? (
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Story</th>
                  <th>Status</th>
                  <th>Workflow</th>
                  <th>AI</th>
                  <th>Policy</th>
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
                    <td data-label="Workflow">
                      <StatusBadge $tone={getTone(item.reviewWorkflowStage)}>
                        {item.reviewWorkflowStage}
                      </StatusBadge>
                    </td>
                    <td data-label="AI">
                      <StatusBadge $tone={getTone(item.reviewOptimizationStatus)}>
                        {item.reviewOptimizationStatus}
                      </StatusBadge>
                      {item.reviewOptimizationDetails?.reasonMessage ? (
                        <SmallText>{item.reviewOptimizationDetails.reasonMessage}</SmallText>
                      ) : null}
                    </td>
                    <td data-label="Policy">
                      <StatusBadge $tone={getTone(item.reviewPolicyStatus)}>
                        {item.reviewPolicyStatus}
                      </StatusBadge>
                    </td>
                    <td data-label="Source">{item.sourceName}</td>
                    <td data-label="Scheduled">{formatDateTime(item.scheduledPublishAt)}</td>
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
          <EmptyState>No held or scheduled stories are waiting for review.</EmptyState>
        )}
      </Card>
    </AdminPage>
  );
}
