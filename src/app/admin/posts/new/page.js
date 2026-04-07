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
  PrimaryButton,
  SecondaryButton,
  SectionGrid,
  SidebarStack,
  SmallText,
  Textarea,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import { AdminDisclosureSection } from "@/components/admin/admin-form-primitives";
import SearchableSelect from "@/components/common/searchable-select";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getManualPostCreationSnapshot } from "@/features/posts";
import { createManualPostAction } from "../../actions";

/**
 * Renders the manual story creation page for the admin editorial workspace.
 *
 * @returns {Promise<JSX.Element>} The manual story composer page.
 */
export default async function NewManualPostPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getManualPostCreationSnapshot({
      locale: defaultLocale,
    }),
  ]);
  const copy = messages.admin.manualPost;
  const availableStreams = snapshot.websiteStreams.filter((stream) => !stream.validationIssues.length);
  const unavailableStreams = snapshot.websiteStreams.filter((stream) => stream.validationIssues.length);
  const streamOptions = availableStreams.map((stream) => ({
    badge: `${stream.locale.toUpperCase()} | ${formatEnumLabel(stream.status)}`,
    description: stream.templateName
      ? `${stream.destinationName} using ${stream.templateName}`
      : `${stream.destinationName} publishing stream`,
    label: stream.name,
    value: stream.id,
  }));
  const categoryOptions = snapshot.categories.map((category) => ({
    description: "Assign the story to this category.",
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
          <AdminSectionTitle icon="edit">Manual story form</AdminSectionTitle>
          <CardDescription>
            Manual stories publish through an existing website stream, so templates, locale handling, scheduling,
            and revalidation continue to work the same way as the automated pipeline.
          </CardDescription>

          {availableStreams.length ? (
            <form action={createManualPostAction}>
              <AdminDisclosureSection
                defaultOpen
                meta={[
                  { label: snapshot.defaultStreamId ? "Stream ready" : "Pick stream", tone: snapshot.defaultStreamId ? "success" : "warning" },
                ]}
                summary="Choose the website stream and optional slug that should own the manual story."
                title="Routing"
              >
                <FieldGrid>
                  <Field as="div">
                    <FieldLabel>Website stream</FieldLabel>
                    <SearchableSelect
                      ariaLabel="Website stream"
                      defaultValue={snapshot.defaultStreamId || ""}
                      name="streamId"
                      options={streamOptions}
                      placeholder="Select a website stream"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Slug</FieldLabel>
                    <Input name="slug" placeholder="optional-custom-slug" />
                  </Field>
                </FieldGrid>
              </AdminDisclosureSection>

              <AdminDisclosureSection
                defaultOpen={false}
                meta={[{ label: "Required attribution", tone: "muted" }]}
                summary="Store the human-visible source attribution that NewsPub keeps attached to the canonical story."
                title="Source attribution"
              >
                <FieldGrid>
                  <Field>
                    <FieldLabel>Source name</FieldLabel>
                    <Input defaultValue="NewsPub Editorial" name="sourceName" required />
                  </Field>
                  <Field>
                    <FieldLabel>Source URL</FieldLabel>
                    <Input name="sourceUrl" placeholder="https://example.com/source-story" required type="url" />
                  </Field>
                </FieldGrid>
              </AdminDisclosureSection>

              <AdminDisclosureSection
                defaultOpen
                meta={[{ label: "Editorial draft", tone: "accent" }]}
                summary="Enter the canonical copy that the website stream, editor, and publish history will continue to manage."
                title="Story copy"
              >
                <Field>
                  <FieldLabel>Title</FieldLabel>
                  <Input name="title" required />
                </Field>
                <Field>
                  <FieldLabel>Summary</FieldLabel>
                  <Textarea name="summary" placeholder="A short editorial summary for listings and social previews." />
                </Field>
                <Field>
                  <FieldLabel>Body markdown</FieldLabel>
                    <Textarea name="contentMd" required style={{ minHeight: "320px" }} />
                  </Field>
              </AdminDisclosureSection>

              <AdminDisclosureSection
                defaultOpen={false}
                meta={[{ label: "Draft, schedule, or publish", tone: "muted" }]}
                summary="Assign categories, choose an optional publish time, and decide whether this story should save, schedule, or publish immediately."
                title="Publishing"
              >
                <Field as="div">
                  <FieldLabel>Categories</FieldLabel>
                  <SearchableSelect
                    ariaLabel="Story categories"
                    multiple
                    name="categoryIds"
                    options={categoryOptions}
                    placeholder="Select one or more categories"
                  />
                </Field>
                <Field>
                  <FieldLabel>Schedule publish time</FieldLabel>
                  <Input name="publishAt" type="datetime-local" />
                </Field>
                <ButtonRow>
                  <SecondaryButton name="intent" type="submit" value="save">
                    <ButtonIcon>
                      <ActionIcon name="save" />
                    </ButtonIcon>
                    Save draft
                  </SecondaryButton>
                  <SecondaryButton name="intent" type="submit" value="schedule">
                    <ButtonIcon>
                      <ActionIcon name="schedule" />
                    </ButtonIcon>
                    Schedule publish
                  </SecondaryButton>
                  <PrimaryButton name="intent" type="submit" value="publish">
                    <ButtonIcon>
                      <ActionIcon name="publish" />
                    </ButtonIcon>
                    Publish now
                  </PrimaryButton>
                </ButtonRow>
              </AdminDisclosureSection>
            </form>
          ) : (
            <EmptyState>
              No publish-ready website streams are available yet. Create or repair a website stream, then return here.
            </EmptyState>
          )}
        </Card>

        <SidebarStack>
          <Card>
            <AdminSectionTitle icon="streams">Available streams</AdminSectionTitle>
            {availableStreams.length ? (
              <>
                {availableStreams.map((stream) => (
                  <SmallText key={stream.id}>
                    <strong>{stream.name}</strong>
                    {" "}
                    ({stream.locale.toUpperCase()} | {formatEnumLabel(stream.status)})
                  </SmallText>
                ))}
              </>
            ) : (
              <SmallText>No website stream can accept manual stories right now.</SmallText>
            )}
            <LinkButton href="/admin/streams">
              <ButtonIcon>
                <ActionIcon name="streams" />
              </ButtonIcon>
              Open streams
            </LinkButton>
          </Card>

          <Card>
            <AdminSectionTitle icon="review">What stays unchanged</AdminSectionTitle>
            <SmallText>Provider fetches, stream schedules, templates, and destination settings are left untouched.</SmallText>
            <SmallText>
              This manual path creates a website-linked canonical story so the existing editor and publish history keep
              working.
            </SmallText>
          </Card>

          {unavailableStreams.length ? (
            <NoticeBanner $tone="warning">
              <NoticeTitle>Streams needing attention</NoticeTitle>
              <NoticeList>
                {unavailableStreams.map((stream) => (
                  <NoticeItem key={stream.id}>
                    {stream.name}: {stream.validationIssues[0]?.message || "This stream is not ready for publishing."}
                  </NoticeItem>
                ))}
              </NoticeList>
            </NoticeBanner>
          ) : null}
        </SidebarStack>
      </SectionGrid>
    </AdminPage>
  );
}
