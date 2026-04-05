import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  ButtonRow,
  Card,
  CardDescription,
  CardTitle,
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
          <CardTitle>Operational health</CardTitle>
          <SummaryGrid>
            <SummaryCard>
              <SummaryValue>{snapshot.providerStatus.enabled}</SummaryValue>
              <SummaryLabel>Enabled providers</SummaryLabel>
            </SummaryCard>
            <SummaryCard>
              <SummaryValue>{snapshot.providerStatus.missingCredentials}</SummaryValue>
              <SummaryLabel>Providers missing credentials</SummaryLabel>
            </SummaryCard>
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
          <CardDescription>
            The dashboard keeps provider credentials, destination health, and active stream coverage in one glance.
          </CardDescription>
        </Card>
      </SectionGrid>

      <SectionGrid>
        <Card>
          <CardTitle>Provider status</CardTitle>
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
          <CardTitle>Recent failures and retries</CardTitle>
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
