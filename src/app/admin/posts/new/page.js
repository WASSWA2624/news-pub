/**
 * Admin page for creating a manual NewsPub story.
 */

import {
  ActionIcon,
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminPage,
  AdminSectionTitle,
  ButtonIcon,
  Card,
  CardDescription,
  EmptyState,
  LinkButton,
  NoticeBanner,
  NoticeItem,
  NoticeList,
  NoticeTitle,
  SectionGrid,
  SidebarStack,
  SmallText,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getManualPostCreationSnapshot } from "@/features/posts";
import dynamic from "next/dynamic";
import { createManualPostAction } from "../../actions";

const ManualPostForm = dynamic(() => import("@/components/admin/manual-post-form"), {
  loading: () => <SmallText>Loading manual story form...</SmallText>,
});

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
            <ManualPostForm
              action={createManualPostAction}
              categoryOptions={categoryOptions}
              defaultStreamId={snapshot.defaultStreamId || ""}
              streamOptions={streamOptions}
            />
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
