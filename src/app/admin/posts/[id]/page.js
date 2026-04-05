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
  Field,
  FieldGrid,
  FieldLabel,
  Input,
  LinkButton,
  PrimaryButton,
  SectionGrid,
  SmallText,
  StatusBadge,
  Textarea,
  Select,
  formatDateTime,
} from "@/components/admin/news-admin-ui";
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
          <form action={updatePostEditorAction}>
            <input name="locale" type="hidden" value={translation?.locale || defaultLocale} />
            <input name="postId" type="hidden" value={snapshot.post.id} />
            <FieldGrid>
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <Input defaultValue={snapshot.post.slug} name="slug" required />
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select defaultValue={snapshot.post.status} name="status">
                  {snapshot.statusValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <FieldLabel>Editorial stage</FieldLabel>
                <Select defaultValue={snapshot.post.editorialStage} name="editorialStage">
                  {snapshot.editorialStageValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <FieldLabel>Publish target match</FieldLabel>
                <Select defaultValue={defaultArticleMatch?.id || ""} name="articleMatchId">
                  <option value="">Auto-select best match</option>
                  {snapshot.post.articleMatches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.destination?.name || match.destination?.platform} ({match.status})
                    </option>
                  ))}
                </Select>
              </Field>
            </FieldGrid>
            <Field style={{ marginTop: "0.85rem" }}>
              <FieldLabel>Title</FieldLabel>
              <Input defaultValue={translation?.title || ""} name="title" required />
            </Field>
            <Field style={{ marginTop: "0.85rem" }}>
              <FieldLabel>Summary</FieldLabel>
              <Textarea defaultValue={translation?.summary || snapshot.post.excerpt} name="summary" />
            </Field>
            <Field style={{ marginTop: "0.85rem" }}>
              <FieldLabel>Body markdown</FieldLabel>
              <Textarea defaultValue={translation?.contentMd || ""} name="contentMd" style={{ minHeight: "280px" }} />
            </Field>
            <Field style={{ marginTop: "0.85rem" }}>
              <FieldLabel>Categories</FieldLabel>
              <Select
                defaultValue={snapshot.post.categories.map((category) => category.id)}
                multiple
                name="categoryIds"
                style={{ minHeight: "180px" }}
              >
                {snapshot.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field style={{ marginTop: "0.85rem" }}>
              <FieldLabel>Schedule publish time</FieldLabel>
              <Input name="publishAt" type="datetime-local" />
            </Field>
            <ButtonRow style={{ marginTop: "0.85rem" }}>
              <PrimaryButton name="intent" type="submit" value="save">
                Save story
              </PrimaryButton>
              <PrimaryButton name="intent" type="submit" value="publish">
                Publish now
              </PrimaryButton>
              <PrimaryButton name="intent" type="submit" value="schedule">
                Schedule publish
              </PrimaryButton>
              <PrimaryButton name="intent" type="submit" value="archive">
                Archive story
              </PrimaryButton>
            </ButtonRow>
          </form>
        </Card>

        <div style={{ display: "grid", gap: "1rem" }}>
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
        </div>
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
                    <td>
                      <strong>{match.destination?.name || "Destination"}</strong>
                      <SmallText>{match.stream?.name || "Stream"}</SmallText>
                    </td>
                    <td>
                      <StatusBadge $tone={getTone(match.status)}>{match.status}</StatusBadge>
                    </td>
                    <td>{formatDateTime(match.queuedAt)}</td>
                    <td>{formatDateTime(match.publishedAt)}</td>
                    <td>{match.publishAttempts.length}</td>
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
