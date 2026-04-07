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
  Field,
  FieldGrid,
  FieldLabel,
  Input,
  LinkButton,
  NoticeBanner,
  NoticeItem,
  NoticeList,
  NoticeTitle,
  SectionGrid,
  SidebarStack,
  SmallText,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  Textarea,
  formatDateTime,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import { AdminDisclosureSection } from "@/components/admin/admin-form-primitives";
import AdminFormModal, { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import { PendingSubmitButton } from "@/components/admin/pending-action";
import SearchableSelect from "@/components/common/searchable-select";
import { getPostEditorSnapshot } from "@/features/posts";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { NewsPubError } from "@/lib/news/shared";
import { notFound } from "next/navigation";
import { repostPostAction, retryPublishAttemptAction, updatePostEditorAction } from "../../actions";

function getTone(status) {
  if (["PUBLISHED", "SUCCEEDED", "APPROVED", "PASS", "OPTIMIZED"].includes(status)) {
    return "success";
  }

  if (["FAILED", "ARCHIVED", "BLOCK"].includes(status)) {
    return "danger";
  }

  return "warning";
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
      postId: id,
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
  const postEditorFormId = `post-editor-form-${snapshot.post.id}`;

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
              <form action={updatePostEditorAction} id={postEditorFormId}>
                <input name="locale" type="hidden" value={translation?.locale || defaultLocale} />
                <input name="postId" type="hidden" value={snapshot.post.id} />
                <AdminDisclosureSection
                  defaultOpen
                  meta={[
                    { label: snapshot.post.status, tone: getTone(snapshot.post.status) },
                    { label: snapshot.post.editorialStage, tone: getTone(snapshot.post.editorialStage) },
                  ]}
                  summary="Choose the editorial stage, canonical slug, and destination match that the workflow actions should target."
                  title="Editorial settings"
                >
                  <FieldGrid>
                    <Field>
                      <FieldLabel>Slug</FieldLabel>
                      <Input defaultValue={snapshot.post.slug} name="slug" required />
                    </Field>
                    <Field as="div">
                      <FieldLabel>Status</FieldLabel>
                      <SearchableSelect
                        ariaLabel="Story status"
                        defaultValue={snapshot.post.status}
                        name="status"
                        options={statusOptions}
                        placeholder="Select a status"
                      />
                    </Field>
                    <Field as="div">
                      <FieldLabel>Editorial stage</FieldLabel>
                      <SearchableSelect
                        ariaLabel="Editorial stage"
                        defaultValue={snapshot.post.editorialStage}
                        name="editorialStage"
                        options={editorialStageOptions}
                        placeholder="Select an editorial stage"
                      />
                    </Field>
                    <Field as="div">
                      <FieldLabel>Publish target match</FieldLabel>
                      <SearchableSelect
                        ariaLabel="Publish target match"
                        defaultValue={defaultArticleMatch?.id || ""}
                        name="articleMatchId"
                        options={articleMatchOptions}
                        placeholder="Select a destination match"
                      />
                    </Field>
                  </FieldGrid>
                </AdminDisclosureSection>

                <AdminDisclosureSection
                  defaultOpen
                  meta={[
                    { label: translation?.locale || defaultLocale, tone: "muted" },
                    { label: translation?.title ? "Copy loaded" : "Needs copy", tone: translation?.title ? "success" : "warning" },
                  ]}
                  summary="Edit the canonical title, summary, and body that feed both the website rendering path and destination optimization."
                  title="Story copy"
                >
                  <Field>
                    <FieldLabel>Title</FieldLabel>
                    <Input defaultValue={translation?.title || ""} name="title" required />
                  </Field>
                  <Field>
                    <FieldLabel>Summary</FieldLabel>
                    <Textarea defaultValue={translation?.summary || snapshot.post.excerpt} name="summary" />
                  </Field>
                  <Field>
                    <FieldLabel>Body markdown</FieldLabel>
                    <Textarea
                      defaultValue={translation?.contentMd || ""}
                      name="contentMd"
                      style={{ minHeight: "280px" }}
                    />
                  </Field>
                </AdminDisclosureSection>

                <AdminDisclosureSection
                  defaultOpen={false}
                  meta={[
                    { label: defaultArticleMatch?.optimizationStatus || "NOT_REQUESTED", tone: getTone(defaultArticleMatch?.optimizationStatus) },
                    { label: defaultArticleMatch?.policyStatus || "PASS", tone: getTone(defaultArticleMatch?.policyStatus) },
                  ]}
                  summary="Set categories, schedule publication, and run the editorial actions that approve, optimize, hold, or publish this story."
                  title="Publishing"
                >
                  <Field as="div">
                    <FieldLabel>Categories</FieldLabel>
                    <SearchableSelect
                      ariaLabel="Story categories"
                      defaultValue={snapshot.post.categories.map((category) => category.id)}
                      name="categoryIds"
                      multiple
                      options={categoryOptions}
                      placeholder="Select one or more categories"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Schedule publish time</FieldLabel>
                    <Input name="publishAt" type="datetime-local" />
                  </Field>
                </AdminDisclosureSection>
                <AdminModalFooterActions>
                  <PendingSubmitButton
                    form={postEditorFormId}
                    icon="sparkles"
                    name="intent"
                    pendingLabel="Optimizing preview..."
                    tone="secondary"
                    type="submit"
                    value="optimize"
                  >
                    Optimize now
                  </PendingSubmitButton>
                  <PendingSubmitButton
                    form={postEditorFormId}
                    icon="badge-check"
                    name="intent"
                    pendingLabel="Approving story..."
                    tone="secondary"
                    type="submit"
                    value="approve"
                  >
                    Approve
                  </PendingSubmitButton>
                  <PendingSubmitButton
                    form={postEditorFormId}
                    icon="warning"
                    name="intent"
                    pendingLabel="Holding story..."
                    tone="secondary"
                    type="submit"
                    value="reject"
                  >
                    Reject
                  </PendingSubmitButton>
                  <PendingSubmitButton
                    form={postEditorFormId}
                    icon="save"
                    name="intent"
                    pendingLabel="Saving story..."
                    tone="secondary"
                    type="submit"
                    value="save"
                  >
                    Save story
                  </PendingSubmitButton>
                  <PendingSubmitButton
                    form={postEditorFormId}
                    icon="schedule"
                    name="intent"
                    pendingLabel="Scheduling story..."
                    tone="secondary"
                    type="submit"
                    value="schedule"
                  >
                    Schedule publish
                  </PendingSubmitButton>
                  <PendingSubmitButton
                    form={postEditorFormId}
                    icon="publish"
                    name="intent"
                    pendingLabel="Publishing now..."
                    tone="primary"
                    type="submit"
                    value="publish"
                  >
                    Publish now
                  </PendingSubmitButton>
                  <ConfirmSubmitButton
                    confirmLabel="Archive story"
                    description="The story will be moved to an archived state. Use this when it should no longer remain active in the editorial flow."
                    formId={postEditorFormId}
                    icon="archive"
                    submitName="intent"
                    submitValue="archive"
                    title="Archive this story?"
                    tone="danger"
                  >
                    Archive story
                  </ConfirmSubmitButton>
                </AdminModalFooterActions>
              </form>
            </AdminFormModal>
          </ButtonRow>
        </Card>

        <SidebarStack>
          <Card>
            <AdminSectionTitle icon="published">Story status</AdminSectionTitle>
            <ButtonRow>
              <StatusBadge $tone={getTone(snapshot.post.status)}>{snapshot.post.status}</StatusBadge>
              <StatusBadge $tone={getTone(snapshot.post.editorialStage)}>{snapshot.post.editorialStage}</StatusBadge>
              {defaultArticleMatch ? (
                <StatusBadge $tone={getTone(defaultArticleMatch.workflowStage)}>
                  {defaultArticleMatch.workflowStage}
                </StatusBadge>
              ) : null}
            </ButtonRow>
            <SmallText>Published: {formatDateTime(snapshot.post.publishedAt)}</SmallText>
            <SmallText>Scheduled: {formatDateTime(snapshot.post.scheduledPublishAt)}</SmallText>
            <SmallText>Source: {snapshot.post.sourceName}</SmallText>
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
                <input name="articleMatchId" type="hidden" value={defaultArticleMatch.id} />
                <input name="postId" type="hidden" value={snapshot.post.id} />
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
            <SmallText>{snapshot.post.sourceArticle?.sourceName || "Unknown source"}</SmallText>
            <SmallText>{snapshot.post.sourceArticle?.sourceUrl || "No source URL"}</SmallText>
          </Card>

          <Card>
            <AdminSectionTitle icon="shield">Policy review</AdminSectionTitle>
            {defaultArticleMatch ? (
              <>
                <ButtonRow>
                  <StatusBadge $tone={getTone(defaultArticleMatch.policyStatus)}>
                    {defaultArticleMatch.policyStatus}
                  </StatusBadge>
                  <StatusBadge $tone={getTone(defaultArticleMatch.optimizationStatus)}>
                    {defaultArticleMatch.optimizationStatus}
                  </StatusBadge>
                </ButtonRow>
                <SmallText>Risk score: {defaultArticleMatch.banRiskScore ?? "Not scored yet"}</SmallText>
                <SmallText>Optimized: {formatDateTime(defaultArticleMatch.lastOptimizedAt)}</SmallText>
                {defaultArticleMatch.optimizationDetails?.reasonMessage ? (
                  <SmallText>{defaultArticleMatch.optimizationDetails.reasonMessage}</SmallText>
                ) : null}
                {defaultArticleMatch.policyReasons.length ? (
                  <NoticeBanner $tone={defaultArticleMatch.policyStatus === "BLOCK" ? "danger" : "warning"}>
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
            <Textarea defaultValue={translation?.contentMd || snapshot.post.excerpt} readOnly style={{ minHeight: "220px" }} />
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
                      <StatusBadge $tone={getTone(match.workflowStage)}>{match.workflowStage}</StatusBadge>
                    </td>
                    <td data-label="AI">
                      <StatusBadge $tone={getTone(match.optimizationStatus)}>{match.optimizationStatus}</StatusBadge>
                      {match.optimizationDetails?.reasonMessage ? (
                        <SmallText>{match.optimizationDetails.reasonMessage}</SmallText>
                      ) : null}
                    </td>
                    <td data-label="Policy">
                      <StatusBadge $tone={getTone(match.policyStatus)}>{match.policyStatus}</StatusBadge>
                    </td>
                    <td data-label="Queued">{formatDateTime(match.queuedAt)}</td>
                    <td data-label="Published">{formatDateTime(match.publishedAt)}</td>
                    <td data-label="Attempts">
                      <strong>{match.publishAttempts.length}</strong>
                      {match.publishAttempts[0]?.errorMessage ? (
                        <SmallText>
                          {match.publishAttempts[0].errorCode || "Failure"}: {match.publishAttempts[0].errorMessage}
                        </SmallText>
                      ) : null}
                    </td>
                    <td data-label="Action">
                      <ButtonRow>
                        <form action={repostPostAction}>
                          <input name="articleMatchId" type="hidden" value={match.id} />
                          <input name="postId" type="hidden" value={snapshot.post.id} />
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
                  <th>Entity</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.auditEvents.map((event) => (
                  <tr key={event.id}>
                    <td data-label="Action">{event.action}</td>
                    <td data-label="Entity">{event.entityType}</td>
                    <td data-label="Created">{formatDateTime(event.createdAt)}</td>
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
