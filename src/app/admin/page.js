import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  ButtonRow,
  Card,
  CardTitle,
  DataTable,
  DataTableWrap,
  EmptyState,
  PrimaryButton,
  SectionGrid,
  SmallText,
  StatusBadge,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
  formatDateTime,
} from "@/components/admin/news-admin-ui";
import { getAdminDashboardSnapshot } from "@/features/analytics";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { requireAdminPageSession } from "@/lib/auth";
import { runSchedulerAction } from "./actions";

function getTone(status) {
  if (["SUCCEEDED", "CONNECTED", "ACTIVE"].includes(status)) {
    return "success";
  }

  if (["FAILED", "ERROR", "PAUSED"].includes(status)) {
    return "danger";
  }

  return "warning";
}

export default async function AdminDashboardPage() {
  const auth = await requireAdminPageSession("/admin");
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getAdminDashboardSnapshot(auth.user),
  ]);
  const copy = messages.admin.dashboard;

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminTitle>{copy.title}</AdminTitle>
        <AdminDescription>{copy.description}</AdminDescription>
        <ButtonRow>
          <form action={runSchedulerAction}>
            <PrimaryButton type="submit">Run due streams now</PrimaryButton>
          </form>
        </ButtonRow>
      </AdminHero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.fetchRunCount7d}</SummaryValue>
          <SummaryLabel>Fetch runs, last 7 days</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.publishableCount7d}</SummaryValue>
          <SummaryLabel>Publishable stories, last 7 days</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.publishedCount7d}</SummaryValue>
          <SummaryLabel>Published stories, last 7 days</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.failedFetchRuns7d}</SummaryValue>
          <SummaryLabel>Failed fetch runs</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.failedPublishAttempts7d}</SummaryValue>
          <SummaryLabel>Failed publish attempts</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.retryCount7d}</SummaryValue>
          <SummaryLabel>Retry count</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid $wide>
        <Card>
          <CardTitle>Recent fetch runs</CardTitle>
          {snapshot.recentFetchRuns.length ? (
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Stream</th>
                    <th>Status</th>
                    <th>Fetched</th>
                    <th>Publishable</th>
                    <th>Published</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.recentFetchRuns.map((run) => (
                    <tr key={run.id}>
                      <td data-label="Stream">
                        <strong>{run.stream?.name || "Stream"}</strong>
                        <SmallText>{run.provider?.label || "Provider"}</SmallText>
                      </td>
                      <td data-label="Status">
                        <StatusBadge $tone={getTone(run.status)}>{run.status}</StatusBadge>
                      </td>
                      <td data-label="Fetched">{run.fetchedCount}</td>
                      <td data-label="Publishable">{run.publishableCount}</td>
                      <td data-label="Published">{run.publishedCount}</td>
                      <td data-label="Started">{formatDateTime(run.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableWrap>
          ) : (
            <EmptyState>No fetch runs have been recorded yet.</EmptyState>
          )}
        </Card>

        <Card>
          <CardTitle>Connection health</CardTitle>
          <SummaryGrid>
            <SummaryCard>
              <SummaryValue>{snapshot.destinationStatus.connected}</SummaryValue>
              <SummaryLabel>Connected destinations</SummaryLabel>
            </SummaryCard>
            <SummaryCard>
              <SummaryValue>{snapshot.destinationStatus.error}</SummaryValue>
              <SummaryLabel>Destinations in error</SummaryLabel>
            </SummaryCard>
            <SummaryCard>
              <SummaryValue>{snapshot.streamStatus.active}</SummaryValue>
              <SummaryLabel>Active streams</SummaryLabel>
            </SummaryCard>
          </SummaryGrid>
        </Card>
      </SectionGrid>

      <SectionGrid>
        <Card>
          <CardTitle>Recent publish attempts</CardTitle>
          {snapshot.recentPublishAttempts.length ? (
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
                  {snapshot.recentPublishAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td data-label="Destination">
                        <strong>{attempt.destination?.name || attempt.platform}</strong>
                        <SmallText>{attempt.stream?.name || "Stream"}</SmallText>
                      </td>
                      <td data-label="Status">
                        <StatusBadge $tone={getTone(attempt.status)}>{attempt.status}</StatusBadge>
                      </td>
                      <td data-label="Remote id">{attempt.remoteId || "Pending"}</td>
                      <td data-label="Queued">{formatDateTime(attempt.queuedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableWrap>
          ) : (
            <EmptyState>No publish attempts have been recorded yet.</EmptyState>
          )}
        </Card>

        <Card>
          <CardTitle>Published stories</CardTitle>
          {snapshot.latestStories.length ? (
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Story</th>
                    <th>Published</th>
                    {snapshot.canViewAnalytics ? <th>Views</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.latestStories.map((story) => (
                    <tr key={story.id}>
                      <td data-label="Story">
                        <strong>{story.title}</strong>
                        <SmallText>{story.slug}</SmallText>
                      </td>
                      <td data-label="Published">{formatDateTime(story.publishedAt)}</td>
                      {snapshot.canViewAnalytics ? <td data-label="Views">{story.viewCount}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableWrap>
          ) : (
            <EmptyState>No published stories have been recorded yet.</EmptyState>
          )}
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
