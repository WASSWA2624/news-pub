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
  SectionGrid,
  SmallText,
  StatusBadge,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
  formatDateTime,
} from "@/components/admin/news-admin-ui";
import { getAdminJobLogsSnapshot } from "@/features/analytics";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";

function getTone(status) {
  if (["SUCCEEDED", "CONNECTED"].includes(status)) {
    return "success";
  }

  if (["FAILED", "ERROR"].includes(status)) {
    return "danger";
  }

  return "warning";
}

export default async function JobsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getAdminJobLogsSnapshot({
      search: resolvedSearchParams?.search,
      status: resolvedSearchParams?.status,
    }),
  ]);
  const copy = messages.admin.jobs;

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminTitle>{copy.title}</AdminTitle>
        <AdminDescription>{copy.description}</AdminDescription>
      </AdminHero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.totalFetchRuns}</SummaryValue>
          <SummaryLabel>Fetch runs shown</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.totalPublishAttempts}</SummaryValue>
          <SummaryLabel>Publish attempts shown</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.failedPublishAttempts + snapshot.summary.failedFetchRuns}</SummaryValue>
          <SummaryLabel>Failures shown</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardTitle>Fetch runs</CardTitle>
          {snapshot.fetchRuns.length ? (
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Stream</th>
                    <th>Status</th>
                    <th>Fetched</th>
                    <th>Published</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.fetchRuns.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <strong>{run.stream?.name || "Stream"}</strong>
                        <SmallText>{run.provider?.label || "Provider"}</SmallText>
                      </td>
                      <td>
                        <StatusBadge $tone={getTone(run.status)}>{run.status}</StatusBadge>
                      </td>
                      <td>{run.fetchedCount}</td>
                      <td>{run.publishedCount}</td>
                      <td>{formatDateTime(run.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableWrap>
          ) : (
            <EmptyState>No fetch runs matched the current filters.</EmptyState>
          )}
        </Card>

        <Card>
          <CardTitle>Publish attempts</CardTitle>
          {snapshot.publishAttempts.length ? (
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th>Status</th>
                    <th>Remote id</th>
                    <th>Queued</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.publishAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td>
                        <strong>{attempt.destination?.name || attempt.platform}</strong>
                        <SmallText>{attempt.stream?.name || "Stream"}</SmallText>
                      </td>
                      <td>
                        <StatusBadge $tone={getTone(attempt.status)}>{attempt.status}</StatusBadge>
                      </td>
                      <td>{attempt.remoteId || "Pending"}</td>
                      <td>{formatDateTime(attempt.queuedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableWrap>
          ) : (
            <EmptyState>No publish attempts matched the current filters.</EmptyState>
          )}
        </Card>
      </SectionGrid>

      <Card>
        <CardTitle>Recent audit events</CardTitle>
        {snapshot.auditEvents.length ? (
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.auditEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{event.action}</td>
                    <td>
                      <strong>{event.entityType}</strong>
                      <SmallText>{event.entityId}</SmallText>
                    </td>
                    <td>{formatDateTime(event.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        ) : (
          <EmptyState>No audit events matched the current filters.</EmptyState>
        )}
      </Card>
    </AdminPage>
  );
}
