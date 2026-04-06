import {
  ActionIcon,
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  ButtonIcon,
  ButtonRow,
  Card,
  CardDescription,
  DataTable,
  DataTableWrap,
  EmptyState,
  MetaPill,
  PrimaryButton,
  SectionGrid,
  SmallText,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
  StatusBadge,
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
        <AdminHeroHeading description={copy.description} icon="dashboard" title={copy.title} />
        <ButtonRow>
          <form action={runSchedulerAction}>
            <PrimaryButton type="submit">
              <ButtonIcon>
                <ActionIcon name="bolt" />
              </ButtonIcon>
              Run due streams now
            </PrimaryButton>
          </form>
        </ButtonRow>
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="refresh" label="Fetch runs, last 7 days" value={snapshot.summary.fetchRunCount7d} />
        <AdminMetricCard icon="review" label="Publishable stories, last 7 days" value={snapshot.summary.publishableCount7d} />
        <AdminMetricCard icon="published" label="Published stories, last 7 days" value={snapshot.summary.publishedCount7d} />
      </SummaryGrid>

      <SummaryGrid>
        <AdminMetricCard icon="warning" label="Failed fetch runs" tone="danger" value={snapshot.summary.failedFetchRuns7d} />
        <AdminMetricCard icon="send" label="Failed publish attempts" tone="danger" value={snapshot.summary.failedPublishAttempts7d} />
        <AdminMetricCard icon="refresh" label="Retry count" tone="accent" value={snapshot.summary.retryCount7d} />
      </SummaryGrid>

      <SectionGrid $wide>
        <Card>
          <AdminSectionTitle icon="refresh">Recent fetch runs</AdminSectionTitle>
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
          <AdminSectionTitle icon="shield">Operational health</AdminSectionTitle>
          <SummaryGrid>
            <AdminMetricCard icon="providers" label="Enabled providers" value={snapshot.providerStatus.enabled} />
            <AdminMetricCard icon="warning" label="Providers missing credentials" tone="danger" value={snapshot.providerStatus.missingCredentials} />
            <AdminMetricCard icon="destinations" label="Connected destinations" value={snapshot.destinationStatus.connected} />
            <AdminMetricCard icon="warning" label="Destinations in error" tone="danger" value={snapshot.destinationStatus.error} />
            <AdminMetricCard icon="streams" label="Active streams" value={snapshot.streamStatus.active} />
          </SummaryGrid>
          <CardDescription>
            The dashboard keeps provider credentials, destination health, and active stream coverage in one glance.
          </CardDescription>
        </Card>
      </SectionGrid>

      <SectionGrid>
        <Card>
          <AdminSectionTitle icon="providers">Provider status</AdminSectionTitle>
          {snapshot.providerStatus.providers.length ? (
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Credentials</th>
                    <th>Availability</th>
                    <th>Streams</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.providerStatus.providers.map((provider) => (
                    <tr key={provider.id}>
                      <td data-label="Provider">
                        <strong>{provider.label}</strong>
                        <SmallText>{provider.providerKey}</SmallText>
                      </td>
                      <td data-label="Credentials">
                        <StatusBadge
                          $tone={provider.credentialState === "configured" ? "success" : "warning"}
                        >
                          {provider.credentialState}
                        </StatusBadge>
                      </td>
                      <td data-label="Availability">
                        <MetaPill>{provider.isEnabled ? "Enabled" : "Disabled"}</MetaPill>
                        {provider.isDefault ? <MetaPill>Default</MetaPill> : null}
                      </td>
                      <td data-label="Streams">{provider.activeStreamCount}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableWrap>
          ) : (
            <EmptyState>No provider records have been configured yet.</EmptyState>
          )}
        </Card>

        <Card>
          <AdminSectionTitle icon="warning">Recent failures and retries</AdminSectionTitle>
          {snapshot.recentFailures.length ? (
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.recentFailures.map((failure) => (
                    <tr key={failure.id}>
                      <td data-label="Type">{failure.type}</td>
                      <td data-label="Target">
                        <strong>{failure.label}</strong>
                        <SmallText>{failure.details}</SmallText>
                      </td>
                      <td data-label="Status">
                        <StatusBadge $tone="danger">{failure.status}</StatusBadge>
                      </td>
                      <td data-label="Created">{formatDateTime(failure.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableWrap>
          ) : (
            <EmptyState>No recent failures were recorded in the last 7 days.</EmptyState>
          )}
        </Card>
      </SectionGrid>

      <SectionGrid>
        <Card>
          <AdminSectionTitle icon="destinations">Recent publish attempts</AdminSectionTitle>
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
          <AdminSectionTitle icon="published">Published stories</AdminSectionTitle>
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
