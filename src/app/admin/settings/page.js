import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  ButtonRow,
  Card,
  CardTitle,
  DataTable,
  DataTableWrap,
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
        <AdminTitle>{copy.title}</AdminTitle>
        <AdminDescription>{copy.description}</AdminDescription>
        <ButtonRow>
          <form action={refreshSettingsAction}>
            <PrimaryButton type="submit">Refresh settings snapshot</PrimaryButton>
          </form>
        </ButtonRow>
      </AdminHero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.providerCount}</SummaryValue>
          <SummaryLabel>Provider records</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.destinationCount}</SummaryValue>
          <SummaryLabel>Destination records</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.streamCount}</SummaryValue>
          <SummaryLabel>Stream records</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardTitle>Locales</CardTitle>
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
                    <td>{locale.code}</td>
                    <td>{locale.name}</td>
                    <td>
                      {locale.isDefault ? "Default" : locale.isActive ? "Active" : "Inactive"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        </Card>

        <Card>
          <CardTitle>Runtime configuration</CardTitle>
          <SmallText>Storage driver: {snapshot.storage.driver}</SmallText>
          <SmallText>Max remote file bytes: {snapshot.storage.maxRemoteFileBytes}</SmallText>
          <SmallText>Allowed upload MIME types: {snapshot.storage.uploadAllowedMimeTypes.join(", ")}</SmallText>
          <SmallText>Initial backfill hours: {snapshot.scheduler.initialBackfillHours}</SmallText>
          <SmallText>Default schedule timezone: {snapshot.scheduler.defaultTimezone}</SmallText>
          <SmallText>Analytics enabled: {snapshot.toggles.enableAnalytics ? "Yes" : "No"}</SmallText>
          <SmallText>Metrics enabled: {snapshot.toggles.enableMetrics ? "Yes" : "No"}</SmallText>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
