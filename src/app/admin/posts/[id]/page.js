/**
 * Admin page for editing one NewsPub canonical story and its publication diagnostics.
 */

import {
  ActionIcon,
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminPage,
  AdminSectionTitle,
  ButtonIcon,
  ButtonRow,
  Card,
  CardDescription,
  DataTable,
  DataTableWrap,
  EmptyState,
  LinkButton,
  NoticeBanner,
  NoticeItem,
  NoticeList,
  NoticeTitle,
  SectionGrid,
  SidebarStack,
  SmallText,
  StatusBadge,
  SecondaryButton,
  Textarea,
  formatDateTime,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import AdminFormModal from "@/components/admin/admin-form-modal";
import { PendingSubmitButton } from "@/components/admin/pending-action";
import { getPostEditorSnapshot } from "@/features/posts";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { NewsPubError } from "@/lib/news/shared";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { repostPostAction, retryPublishAttemptAction, updatePostEditorAction } from "../../actions";

const PostEditorModalForm = dynamic(() => import("@/components/admin/post-editor-modal-form"), {
  loading: () => <SmallText>Loading canonical story editor...</SmallText>,
});

function getTone(status) {
  if (["PUBLISHED", "SUCCEEDED", "APPROVED", "PASS", "OPTIMIZED", "COMPLETED"].includes(status)) {
    return "success";
  }

  if (["FAILED", "ARCHIVED", "BLOCK"].includes(status)) {
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

function renderPreviewBody(payload) {
  if (!payload) {
    return "No optimized payload has been generated yet.";
  }

  if (payload.caption) {
    return payload.caption;
  }

  return payload.body || payload.summary || "No optimized payload body is available yet.";
}

/**
 * Renders the canonical story editor and destination publish review workspace.
 *
 * @param {object} props - Route props containing the post id param.
 * @returns {Promise<JSX.Element>} The admin editor page for one story.
 */
export default async function PostEditorPage({ params }) {
  const { id } = await params;
  const messages = await getMessages(defaultLocale);
  let snapshot;

  try {
    snapshot = await getPostEditorSnapshot({
      locale: defaultLocale,
      post_id: id,
    });
  } catch (error) {
    if (error instanceof NewsPubError && error.status === "post_not_found") {
      notFound();
    }

    throw error;
  }
  const copy = messages.admin.postEditor;
  const translation = snapshot.selectedTranslation;
  const defaultArticleMatch = snapshot.post.articleMatches.find(
    (match) => match.destination?.platform === "WEBSITE",
  ) || snapshot.post.articleMatches[0];
  const latestAttempt = defaultArticleMatch?.publishAttempts?.[0] || null;
  const optimizedPayload = defaultArticleMatch?.optimizedPayload || null;
  const statusOptions = snapshot.statusValues.map((value) => ({
    description: `${formatEnumLabel(value)} story state`,
    label: formatEnumLabel(value),
    value,
  }));
  const editorialStageOptions = snapshot.editorialStageValues.map((value) => ({
    description: `${formatEnumLabel(value)} editorial step`,
    label: formatEnumLabel(value),
    value,
  }));
  const articleMatchOptions = [
    {
      description: "Let NewsPub pick the best website or destination match automatically.",
      label: "Auto-select best match",
      value: "",
    },
    ...snapshot.post.articleMatches.map((match) => ({
      badge: match.status,
      description: match.stream?.name || match.destination?.platform || "Linked destination match",
      label: match.destination?.name || match.destination?.platform || "Destination",
      value: match.id,
    })),
  ];
  const categoryOptions = snapshot.categories.map((category) => ({
    description: category.description || "Assign this story to the category.",
    label: category.name,
    value: category.id,
  }));

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminHeroHeading description={copy.description} icon="edit" title={copy.title} />
      </AdminHero>

      <SectionGrid $wide>
        <Card>
          <AdminSectionTitle icon="edit">Canonical story editor</AdminSectionTitle>
          <CardDescription>
            The editor now opens as a full workspace modal so long-form copy, publishing controls, and metadata stay organized across mobile and desktop.
          </CardDescription>
          <SmallText>
            Close the modal whenever you need to cross-check story status, source details, or publish history on the underlying page.
          </SmallText>
          <ButtonRow>
            <AdminFormModal
              autoOpen
              description="Update editorial settings, story copy, categories, and publishing actions in a full-size modal editor."
              size="full"
              title={`Edit ${translation?.title || snapshot.post.slug}`}
              triggerFullWidth
              triggerIcon="edit"
              triggerLabel="Open editor"
              triggerTone="primary"
            >
              <PostEditorModalForm
                action={updatePostEditorAction}
                articleMatchOptions={articleMatchOptions}
                articleMatches={snapshot.post.articleMatches}
                categoryOptions={categoryOptions}
                defaultArticleMatchId={defaultArticleMatch?.id || ""}
                defaultLocale={defaultLocale}
                editorialStageOptions={editorialStageOptions}
                post={snapshot.post}
                selectedTranslation={translation}
                statusOptions={statusOptions}
              />
            </AdminFormModal>
          </ButtonRow>
        </Card>

        <SidebarStack>
          <Card>
            <AdminSectionTitle icon="published">Story status</AdminSectionTitle>
            <ButtonRow>
              <StatusBadge $tone={getTone(snapshot.post.status)}>{snapshot.post.status}</StatusBadge>
              <StatusBadge $tone={getTone(snapshot.post.editorial_stage)}>{snapshot.post.editorial_stage}</StatusBadge>
              {defaultArticleMatch ? (
                <StatusBadge $tone={getTone(defaultArticleMatch.workflow_stage)}>
                  {defaultArticleMatch.workflow_stage}
                </StatusBadge>
              ) : null}
            </ButtonRow>
            <SmallText>Published: {formatDateTime(snapshot.post.published_at)}</SmallText>
            <SmallText>Scheduled: {formatDateTime(snapshot.post.scheduled_publish_at)}</SmallText>
            <SmallText>Source: {snapshot.post.source_name}</SmallText>
            <LinkButton href={snapshot.post.websitePath} target="_blank">
              <ButtonIcon>
                <ActionIcon name="external-link" />
              </ButtonIcon>
              Open website path
            </LinkButton>
          </Card>

          <Card>
            <AdminSectionTitle icon="refresh">Manual repost</AdminSectionTitle>
            <CardDescription>
              Create a fresh publish attempt for the linked destination even if this story was already published, failed, scheduled, or archived before.
            </CardDescription>
            {defaultArticleMatch ? (
              <form action={repostPostAction}>
                <input name="article_match_id" type="hidden" value={defaultArticleMatch.id} />
                <input name="post_id" type="hidden" value={snapshot.post.id} />
                <input name="returnTo" type="hidden" value={`/admin/posts/${snapshot.post.id}`} />
                <PendingSubmitButton
                  icon="refresh"
                  pendingLabel="Creating repost attempt..."
                  tone="secondary"
                  type="submit"
                >
                  Repost default match
                </PendingSubmitButton>
              </form>
            ) : (
              <SmallText>No linked destination match is available for repost yet.</SmallText>
            )}
            {latestAttempt?.status === "FAILED" && latestAttempt.retryable ? (
              <form action={retryPublishAttemptAction}>
                <input name="attemptId" type="hidden" value={latestAttempt.id} />
                <input name="returnTo" type="hidden" value={`/admin/posts/${snapshot.post.id}`} />
                <SecondaryButton type="submit">
                  <ButtonIcon>
                    <ActionIcon name="refresh" />
                  </ButtonIcon>
                  Retry failed publish
                </SecondaryButton>
              </form>
            ) : null}
          </Card>

          <Card>
            <AdminSectionTitle icon="news">Source article</AdminSectionTitle>
            <CardDescription>
              Canonical render artifacts stay linked to the originating normalized article.
            </CardDescription>
            <SmallText>{snapshot.post.sourceArticle?.title || "No source article linked."}</SmallText>
            <SmallText>{snapshot.post.sourceArticle?.source_name || "Unknown source"}</SmallText>
            <SmallText>{snapshot.post.sourceArticle?.source_url || "No source URL"}</SmallText>
          </Card>

          <Card>
            <AdminSectionTitle icon="shield">Policy review</AdminSectionTitle>
            {defaultArticleMatch ? (
              <>
                <ButtonRow>
                  <StatusBadge $tone={getTone(defaultArticleMatch.policy_status)}>
                    {defaultArticleMatch.policy_status}
                  </StatusBadge>
                  <StatusBadge $tone={getTone(defaultArticleMatch.optimization_status)}>
                    {defaultArticleMatch.optimization_status}
                  </StatusBadge>
                </ButtonRow>
                <SmallText>Risk score: {defaultArticleMatch.ban_risk_score ?? "Not scored yet"}</SmallText>
                <SmallText>Optimized: {formatDateTime(defaultArticleMatch.last_optimized_at)}</SmallText>
                {defaultArticleMatch.optimizationDetails?.reasonMessage ? (
                  <SmallText>{defaultArticleMatch.optimizationDetails.reasonMessage}</SmallText>
                ) : null}
                {defaultArticleMatch.policyReasons.length ? (
                  <NoticeBanner $tone={defaultArticleMatch.policy_status === "BLOCK" ? "danger" : "warning"}>
                    <NoticeTitle>Review findings</NoticeTitle>
                    <NoticeList>
                      {defaultArticleMatch.policyReasons.map((reason) => (
                        <NoticeItem key={reason.code || reason.message}>
                          {reason.message || reason.code}
                        </NoticeItem>
                      ))}
                    </NoticeList>
                  </NoticeBanner>
                ) : (
                  <SmallText>No active policy warnings are recorded for the default match.</SmallText>
                )}
              </>
            ) : (
              <SmallText>No destination match is available to score yet.</SmallText>
            )}
          </Card>
        </SidebarStack>
      </SectionGrid>

      <Card>
        <AdminSectionTitle icon="sparkles">Canonical vs optimized preview</AdminSectionTitle>
        <SectionGrid $wide>
          <Card>
            <AdminSectionTitle icon="news">Canonical</AdminSectionTitle>
            <SmallText>{translation?.title || snapshot.post.slug}</SmallText>
            <Textarea defaultValue={translation?.content_md || snapshot.post.excerpt} readOnly style={{ minHeight: "220px" }} />
          </Card>
          <Card>
            <AdminSectionTitle icon="destinations">Destination preview</AdminSectionTitle>
            {optimizedPayload ? (
              <>
                <SmallText>{optimizedPayload.title || "Untitled optimized payload"}</SmallText>
                <Textarea defaultValue={renderPreviewBody(optimizedPayload)} readOnly style={{ minHeight: "220px" }} />
                {optimizedPayload.hashtags?.length ? (
                  <SmallText>{optimizedPayload.hashtags.join(" ")}</SmallText>
                ) : null}
              </>
            ) : (
              <EmptyState>Run optimization to generate the current destination preview.</EmptyState>
            )}
          </Card>
        </SectionGrid>
      </Card>

      <Card>
        <AdminSectionTitle icon="destinations">Destination matches and publish history</AdminSectionTitle>
        {snapshot.post.articleMatches.length ? (
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Workflow</th>
                  <th>AI</th>
                  <th>Policy</th>
                  <th>Queued</th>
                  <th>Published</th>
                  <th>Attempts</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.post.articleMatches.map((match) => (
                  <tr key={match.id}>
                    <td data-label="Destination">
                      <strong>{match.destination?.name || "Destination"}</strong>
                      <SmallText>{match.stream?.name || "Stream"}</SmallText>
                    </td>
                    <td data-label="Status">
                      <StatusBadge $tone={getTone(match.status)}>{match.status}</StatusBadge>
                    </td>
                    <td data-label="Workflow">
                      <StatusBadge $tone={getTone(match.workflow_stage)}>{match.workflow_stage}</StatusBadge>
                    </td>
                    <td data-label="AI">
                      <StatusBadge $tone={getTone(match.optimization_status)}>{match.optimization_status}</StatusBadge>
                      {match.optimizationDetails?.reasonCode ? (
                        <SmallText>{match.optimizationDetails.reasonCode}</SmallText>
                      ) : null}
                      {match.optimizationDetails?.reasonMessage ? (
                        <SmallText>{match.optimizationDetails.reasonMessage}</SmallText>
                      ) : null}
                    </td>
                    <td data-label="Policy">
                      <StatusBadge $tone={getTone(match.policy_status)}>{match.policy_status}</StatusBadge>
                    </td>
                    <td data-label="Queued">{formatDateTime(match.queued_at)}</td>
                    <td data-label="Published">{formatDateTime(match.published_at)}</td>
                    <td data-label="Attempts">
                      <strong>{match.publishAttempts.length}</strong>
                      {match.publishAttempts[0]?.diagnosticReasonCode ? (
                        <SmallText>{match.publishAttempts[0].diagnosticReasonCode}</SmallText>
                      ) : null}
                      {match.publishAttempts[0]?.diagnosticReasonMessage ? (
                        <SmallText>{match.publishAttempts[0].diagnosticReasonMessage}</SmallText>
                      ) : null}
                      {match.publishAttempts[0]?.last_error_message ? (
                        <SmallText>
                          {match.publishAttempts[0].last_error_code || "Failure"}: {match.publishAttempts[0].last_error_message}
                        </SmallText>
                      ) : null}
                    </td>
                    <td data-label="Action">
                      <ButtonRow>
                        <form action={repostPostAction}>
                          <input name="article_match_id" type="hidden" value={match.id} />
                          <input name="post_id" type="hidden" value={snapshot.post.id} />
                          <input name="returnTo" type="hidden" value={`/admin/posts/${snapshot.post.id}`} />
                          <PendingSubmitButton
                            icon="refresh"
                            pendingLabel="Reposting..."
                            tone="secondary"
                            type="submit"
                          >
                            Repost now
                          </PendingSubmitButton>
                        </form>
                        {match.publishAttempts[0]?.status === "FAILED" && match.publishAttempts[0]?.retryable ? (
                          <form action={retryPublishAttemptAction}>
                            <input name="attemptId" type="hidden" value={match.publishAttempts[0].id} />
                            <input name="returnTo" type="hidden" value={`/admin/posts/${snapshot.post.id}`} />
                            <SecondaryButton type="submit">
                              <ButtonIcon>
                                <ActionIcon name="refresh" />
                              </ButtonIcon>
                              Retry
                            </SecondaryButton>
                          </form>
                        ) : null}
                      </ButtonRow>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        ) : (
          <SmallText>No destination matches are linked to this story yet.</SmallText>
        )}
      </Card>

      <Card>
        <AdminSectionTitle icon="dashboard">Audit timeline</AdminSectionTitle>
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
                      <strong>{event.entity_type}</strong>
                      <SmallText>{event.entity_id}</SmallText>
                      {event.reasonMessage ? <SmallText>{event.reasonMessage}</SmallText> : null}
                    </td>
                    <td data-label="Created">{formatDateTime(event.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        ) : (
          <EmptyState>No audit events have been recorded for this story yet.</EmptyState>
        )}
      </Card>
    </AdminPage>
  );
}
