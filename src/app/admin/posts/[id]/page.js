import {
  ActionIcon,
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  ButtonIcon,
  ButtonRow,
  Card,
  CardDescription,
  CardTitle,
  DataTable,
  DataTableWrap,
  Field,
  FieldGrid,
  FieldLabel,
  FormSection,
  FormSectionTitle,
  Input,
  LinkButton,
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
import AdminFormModal, { AdminModalFooterActions } from "@/components/admin/admin-form-modal";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import SearchableSelect from "@/components/common/searchable-select";
import { getPostEditorSnapshot } from "@/features/posts";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { updatePostEditorAction } from "../../actions";

function getTone(status) {
  if (["PUBLISHED", "SUCCEEDED", "APPROVED"].includes(status)) {
    return "success";
  }

  if (["FAILED", "ARCHIVED"].includes(status)) {
    return "danger";
  }

  return "warning";
}

export default async function PostEditorPage({ params }) {
  const { id } = await params;
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getPostEditorSnapshot({
      locale: defaultLocale,
      postId: id,
    }),
  ]);
  const copy = messages.admin.postEditor;
  const translation = snapshot.selectedTranslation;
  const defaultArticleMatch = snapshot.post.articleMatches.find(
    (match) => match.destination?.platform === "WEBSITE",
  ) || snapshot.post.articleMatches[0];
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
        <AdminTitle>{copy.title}</AdminTitle>
        <AdminDescription>{copy.description}</AdminDescription>
      </AdminHero>

      <SectionGrid $wide>
        <Card>
          <CardTitle>Canonical story editor</CardTitle>
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
                <FormSection>
                  <FormSectionTitle>Editorial settings</FormSectionTitle>
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
                </FormSection>

                <FormSection>
                  <FormSectionTitle>Story copy</FormSectionTitle>
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
                </FormSection>

                <FormSection>
                  <FormSectionTitle>Publishing</FormSectionTitle>
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
                </FormSection>
                <AdminModalFooterActions>
                  <SecondaryButton form={postEditorFormId} name="intent" type="submit" value="save">
                    <ButtonIcon>
                      <ActionIcon name="save" />
                    </ButtonIcon>
                    Save story
                  </SecondaryButton>
                  <SecondaryButton form={postEditorFormId} name="intent" type="submit" value="schedule">
                    <ButtonIcon>
                      <ActionIcon name="schedule" />
                    </ButtonIcon>
                    Schedule publish
                  </SecondaryButton>
                  <PrimaryButton form={postEditorFormId} name="intent" type="submit" value="publish">
                    <ButtonIcon>
                      <ActionIcon name="publish" />
                    </ButtonIcon>
                    Publish now
                  </PrimaryButton>
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
            <CardTitle>Story status</CardTitle>
            <ButtonRow>
              <StatusBadge $tone={getTone(snapshot.post.status)}>{snapshot.post.status}</StatusBadge>
              <StatusBadge $tone={getTone(snapshot.post.editorialStage)}>{snapshot.post.editorialStage}</StatusBadge>
            </ButtonRow>
            <SmallText>Published: {formatDateTime(snapshot.post.publishedAt)}</SmallText>
            <SmallText>Scheduled: {formatDateTime(snapshot.post.scheduledPublishAt)}</SmallText>
            <SmallText>Source: {snapshot.post.sourceName}</SmallText>
            <LinkButton href={snapshot.post.websitePath} target="_blank">
              Open website path
            </LinkButton>
          </Card>

          <Card>
            <CardTitle>Source article</CardTitle>
            <CardDescription>
              Canonical render artifacts stay linked to the originating normalized article.
            </CardDescription>
            <SmallText>{snapshot.post.sourceArticle?.title || "No source article linked."}</SmallText>
            <SmallText>{snapshot.post.sourceArticle?.sourceName || "Unknown source"}</SmallText>
            <SmallText>{snapshot.post.sourceArticle?.sourceUrl || "No source URL"}</SmallText>
          </Card>
        </SidebarStack>
      </SectionGrid>

      <Card>
        <CardTitle>Destination matches and publish history</CardTitle>
        {snapshot.post.articleMatches.length ? (
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Queued</th>
                  <th>Published</th>
                  <th>Attempts</th>
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
                    <td data-label="Queued">{formatDateTime(match.queuedAt)}</td>
                    <td data-label="Published">{formatDateTime(match.publishedAt)}</td>
                    <td data-label="Attempts">{match.publishAttempts.length}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        ) : (
          <SmallText>No destination matches are linked to this story yet.</SmallText>
        )}
      </Card>
    </AdminPage>
  );
}
