import {
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  ButtonRow,
  Card,
  DataTable,
  DataTableWrap,
  EmptyState,
  SectionGrid,
  SmallText,
  StatusBadge,
  SummaryGrid,
  formatDateTime,
} from "@/components/admin/news-admin-ui";
import { PendingSubmitButton } from "@/components/admin/pending-action";
import { getAdminJobLogsSnapshot } from "@/features/analytics";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { repostPostAction, retryPublishAttemptAction } from "../actions";

function getTone(status) {
  if (["SUCCEEDED", "CONNECTED", "COMPLETED"].includes(status)) {
    return "success";
  }

  if (["FAILED", "ERROR"].includes(status)) {
    return "danger";
  }

  return "warning";
}

function getAuditTone(level) {
  if (level === "error") {
    return "danger";
  }

  if (level === "warn") {
    return "warning";
  }

  return undefined;
}

function describeFetchRunMode(run) {
  const executionDetails = run.executionDetails;

  if (executionDetails?.executionMode === "shared_batch" && executionDetails.groupSize > 1) {
    return `Shared fetch | ${executionDetails.groupSize} streams | ${executionDetails.endpoint || "shared request"}`;
  }

  return executionDetails?.endpoint
    ? `Single fetch | ${executionDetails.endpoint}`
    : "Single fetch";
}

function describeFetchRunWindow(run) {
  const streamWindow = run.executionDetails?.streamFetchWindow;

  if (!streamWindow?.start || !streamWindow?.end) {
    return "Window not recorded";
  }

  return `${streamWindow.source || "window"} | ${formatDateTime(streamWindow.start)} to ${formatDateTime(streamWindow.end)}`;
}

/**
 * Renders the admin job history page for fetch runs, publish attempts, and audit events.
 *
 * @param {object} props - Search param props for filtering the logs.
 * @returns {Promise<JSX.Element>} The jobs page.
 */
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
        <AdminHeroHeading description={copy.description} icon="jobs" title={copy.title} />
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="refresh" label="Fetch runs shown" value={snapshot.summary.totalFetchRuns} />
        <AdminMetricCard icon="destinations" label="Publish attempts shown" value={snapshot.summary.totalPublishAttempts} />
        <AdminMetricCard icon="warning" label="Failures shown" tone="danger" value={snapshot.summary.failedPublishAttempts + snapshot.summary.failedFetchRuns} />
        <AdminMetricCard icon="warning" label="AI skipped events" tone="warning" value={snapshot.summary.aiSkippedEvents} />
        <AdminMetricCard icon="warning" label="AI fallback events" tone="warning" value={snapshot.summary.aiFallbackEvents} />
        <AdminMetricCard icon="server" label="Shared upstream calls" tone="accent" value={snapshot.summary.sharedUpstreamCalls} />
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <AdminSectionTitle icon="refresh">Fetch runs</AdminSectionTitle>
          {snapshot.fetchRuns.length ? (
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Stream</th>
                    <th>Status</th>
                    <th>Mode</th>
                    <th>Fetched</th>
                    <th>Published</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.fetchRuns.map((run) => (
                    <tr key={run.id}>
                      <td data-label="Stream">
                        <strong>{run.stream?.name || "Stream"}</strong>
                        <SmallText>{run.provider?.label || "Provider"}</SmallText>
                        <SmallText>{describeFetchRunWindow(run)}</SmallText>
                      </td>
                      <td data-label="Status">
                        <StatusBadge $tone={getTone(run.status)}>{run.status}</StatusBadge>
                      </td>
                      <td data-label="Mode">
                        <SmallText>{describeFetchRunMode(run)}</SmallText>
                        {run.executionDetails?.partitionReasonCodes?.length ? (
                          <SmallText>{run.executionDetails.partitionReasonCodes.join(", ")}</SmallText>
                        ) : null}
                      </td>
                      <td data-label="Fetched">{run.fetchedCount}</td>
                      <td data-label="Published">{run.publishedCount}</td>
                      <td data-label="Started">{formatDateTime(run.startedAt)}</td>
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
          <AdminSectionTitle icon="destinations">Publish attempts</AdminSectionTitle>
          {snapshot.publishAttempts.length ? (
            <DataTableWrap>
              <DataTable>
                <thead>
                <tr>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>AI</th>
                  <th>Remote id</th>
                  <th>Queued</th>
                  <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.publishAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td data-label="Destination">
                        <strong>{attempt.destination?.name || attempt.platform}</strong>
                        <SmallText>{attempt.stream?.name || "Stream"}</SmallText>
                      </td>
                      <td data-label="Status">
                        <StatusBadge $tone={getTone(attempt.status)}>{attempt.status}</StatusBadge>
                      </td>
                      <td data-label="AI">
                        {attempt.optimizationStatus ? (
                          <StatusBadge $tone={getTone(attempt.optimizationStatus)}>
                            {attempt.optimizationStatus}
                          </StatusBadge>
                        ) : (
                          <SmallText>Not recorded</SmallText>
                        )}
                        {attempt.aiResolution?.reasonMessage ? (
                          <SmallText>{attempt.aiResolution.reasonMessage}</SmallText>
                        ) : null}
                      </td>
                      <td data-label="Remote id">{attempt.remoteId || "Pending"}</td>
                      <td data-label="Queued">{formatDateTime(attempt.queuedAt)}</td>
                      <td data-label="Actions">
                        <ButtonRow>
                          {attempt.post?.id ? (
                            <form action={repostPostAction}>
                              <input name="articleMatchId" type="hidden" value={attempt.articleMatchId} />
                              <input name="postId" type="hidden" value={attempt.post.id} />
                              <input name="returnTo" type="hidden" value="/admin/jobs" />
                              <PendingSubmitButton
                                icon="refresh"
                                pendingLabel="Reposting..."
                                tone="secondary"
                                type="submit"
                              >
                                Repost
                              </PendingSubmitButton>
                            </form>
                          ) : null}
                          {attempt.status === "FAILED" ? (
                            <form action={retryPublishAttemptAction}>
                              <input name="attemptId" type="hidden" value={attempt.id} />
                              <input name="returnTo" type="hidden" value="/admin/jobs" />
                              <PendingSubmitButton
                                icon="refresh"
                                pendingLabel="Retrying..."
                                tone="secondary"
                                type="submit"
                              >
                                Retry
                              </PendingSubmitButton>
                            </form>
                          ) : !attempt.post?.id ? (
                            <SmallText>Not available</SmallText>
                          ) : null}
                        </ButtonRow>
                      </td>
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
        <AdminSectionTitle icon="file-text">Recent audit events</AdminSectionTitle>
        {snapshot.auditEvents.length ? (
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Severity</th>
                  <th>Entity</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.auditEvents.map((event) => (
                  <tr key={event.id}>
                    <td data-label="Action">
                      <strong>{event.action}</strong>
                      {event.reasonCode ? <SmallText>{event.reasonCode}</SmallText> : null}
                    </td>
                    <td data-label="Severity">
                      <StatusBadge $tone={getAuditTone(event.level)}>{event.level}</StatusBadge>
                    </td>
                    <td data-label="Entity">
                      <strong>{event.entityType}</strong>
                      <SmallText>{event.entityId}</SmallText>
                      {event.reasonMessage ? (
                        <SmallText>{event.reasonMessage}</SmallText>
                      ) : null}
                    </td>
                    <td data-label="Created">{formatDateTime(event.createdAt)}</td>
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
