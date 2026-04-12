/**
 * Admin page for NewsPub runtime settings, environment health, and operational checks.
 */

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
  SummaryGrid,
  StatusBadge,
} from "@/components/admin/news-admin-ui";
import { getSettingsSnapshot } from "@/features/settings";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { refreshSettingsAction } from "../actions";

function getAiTone(status) {
  if (status === "READY") {
    return "success";
  }

  if (status === "MISCONFIGURED") {
    return "danger";
  }

  return "warning";
}

/**
 * Renders the NewsPub settings workspace with runtime health, AI visibility,
 * and bounded configuration summaries.
 *
 * @returns {Promise<JSX.Element>} The admin settings route.
 */
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
        <AdminMetricCard icon="sparkles" label="AI runtime" tone={getAiTone(snapshot.ai.status)} value={snapshot.ai.status} />
        <AdminMetricCard icon="warning" label="Configuration issues" tone="danger" value={snapshot.summary.configurationIssueCount} />
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardHeader>
            <AdminSectionTitle icon="sparkles">Assistive AI runtime</AdminSectionTitle>
            <SmallText>
              AI stays optional at runtime, so deterministic formatting and manual editorial flows remain available even when AI is disabled or unhealthy.
            </SmallText>
          </CardHeader>
          <StatusBadge $tone={getAiTone(snapshot.ai.status)}>{snapshot.ai.status}</StatusBadge>
          <SmallText>{snapshot.ai.summary}</SmallText>
          <SmallText>Runtime mode: {snapshot.ai.runtimeMode}</SmallText>
          <SmallText>Model: {snapshot.ai.model}</SmallText>
          <SmallText>Request timeout: {snapshot.ai.requestTimeoutMs} ms</SmallText>
          <SmallText>Credentials configured: {snapshot.ai.credentialsConfigured ? "Yes" : "No"}</SmallText>
          <NoticeBanner $tone={snapshot.ai.status === "READY" ? "success" : "warning"}>
            <NoticeTitle>
              {snapshot.ai.status === "READY" ? "AI assistive path available" : "Deterministic path remains active"}
            </NoticeTitle>
            <SmallText>
              {snapshot.ai.status === "READY"
                ? "Optimization can use AI when healthy, with deterministic fallback still preserving the publish path."
                : "NewsPub will skip or fall back from AI as needed and continue through the deterministic editorial workflow."}
            </SmallText>
          </NoticeBanner>
        </Card>

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
                      {locale.is_default ? "Default" : locale.is_active ? "Active" : "Inactive"}
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
                  <NoticeItem key={`${issue.entity_type}-${issue.entity_id}-${issue.code}`}>
                    {issue.entity_type}: {issue.entityLabel}. {issue.message}
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
