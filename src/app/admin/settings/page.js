import {
  ActionIcon,
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  ButtonIcon,
  ButtonRow,
  Card,
  CardHeader,
  DataTable,
  DataTableWrap,
  NoticeBanner,
  NoticeItem,
  NoticeList,
  NoticeTitle,
  PrimaryButton,
  SectionGrid,
  SmallText,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
} from "@/components/admin/news-admin-ui";
import { getSettingsSnapshot } from "@/features/settings";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { refreshSettingsAction } from "../actions";

export default async function SettingsPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getSettingsSnapshot(),
  ]);
  const copy = messages.admin.settings;

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminHeroHeading description={copy.description} icon="settings" title={copy.title} />
        <ButtonRow>
          <form action={refreshSettingsAction}>
            <PrimaryButton type="submit">
              <ButtonIcon>
                <ActionIcon name="refresh" />
              </ButtonIcon>
              Refresh settings snapshot
            </PrimaryButton>
          </form>
        </ButtonRow>
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="providers" label="Provider records" value={snapshot.summary.providerCount} />
        <AdminMetricCard icon="destinations" label="Destination records" value={snapshot.summary.destinationCount} />
        <AdminMetricCard icon="streams" label="Stream records" value={snapshot.summary.streamCount} />
        <AdminMetricCard icon="warning" label="Configuration issues" tone="danger" value={snapshot.summary.configurationIssueCount} />
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardHeader>
            <AdminSectionTitle icon="globe">Locales</AdminSectionTitle>
            <SmallText>Locale status stays readable in stacked cards on smaller screens.</SmallText>
          </CardHeader>
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.locales.map((locale) => (
                  <tr key={locale.code}>
                    <td data-label="Code">{locale.code}</td>
                    <td data-label="Name">{locale.name}</td>
                    <td data-label="State">
                      {locale.isDefault ? "Default" : locale.isActive ? "Active" : "Inactive"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        </Card>

        <Card>
          <CardHeader>
            <AdminSectionTitle icon="sliders">Runtime configuration</AdminSectionTitle>
            <SmallText>Operational values are grouped into a short checklist instead of a large settings form.</SmallText>
          </CardHeader>
          <SmallText>Storage driver: {snapshot.storage.driver}</SmallText>
          <SmallText>Max remote file bytes: {snapshot.storage.maxRemoteFileBytes}</SmallText>
          <SmallText>Allowed upload MIME types: {snapshot.storage.uploadAllowedMimeTypes.join(", ")}</SmallText>
          <SmallText>Initial backfill hours: {snapshot.scheduler.initialBackfillHours}</SmallText>
          <SmallText>Default schedule timezone: {snapshot.scheduler.defaultTimezone}</SmallText>
          <SmallText>Analytics enabled: {snapshot.toggles.enableAnalytics ? "Yes" : "No"}</SmallText>
          <SmallText>Metrics enabled: {snapshot.toggles.enableMetrics ? "Yes" : "No"}</SmallText>
        </Card>

        <Card>
          <CardHeader>
            <AdminSectionTitle icon="shield">Configuration health</AdminSectionTitle>
            <SmallText>
              Cross-check destination kinds, stream modes, and template platforms before scheduled jobs hit them.
            </SmallText>
          </CardHeader>
          {snapshot.configurationIssues.length ? (
            <NoticeBanner $tone="danger">
              <NoticeTitle>Detected incompatible records</NoticeTitle>
              <NoticeList>
                {snapshot.configurationIssues.map((issue) => (
                  <NoticeItem key={`${issue.entityType}-${issue.entityId}-${issue.code}`}>
                    {issue.entityType}: {issue.entityLabel}. {issue.message}
                  </NoticeItem>
                ))}
              </NoticeList>
            </NoticeBanner>
          ) : (
            <NoticeBanner $tone="success">
              <NoticeTitle>No incompatible settings detected</NoticeTitle>
              <SmallText>
                Destinations, streams, and templates are aligned for the current workspace snapshot.
              </SmallText>
            </NoticeBanner>
          )}
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
