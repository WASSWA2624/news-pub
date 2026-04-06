import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
  ButtonRow,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  MetaPill,
  RecordCard,
  RecordHeader,
  RecordMeta,
  RecordStack,
  RecordTitle,
  RecordTitleBlock,
  SectionGrid,
  SmallText,
  StatusBadge,
  SummaryCard,
  SummaryGrid,
  SummaryLabel,
  SummaryValue,
} from "@/components/admin/news-admin-ui";
import AdminFormModal from "@/components/admin/admin-form-modal";
import ProviderFormCard from "@/components/admin/provider-form-card";
import { getProviderManagementSnapshot } from "@/features/providers";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { saveProviderAction } from "../actions";

export default async function ProvidersPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getProviderManagementSnapshot(),
  ]);
  const copy = messages.admin.providers;

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminTitle>{copy.title}</AdminTitle>
        <AdminDescription>{copy.description}</AdminDescription>
      </AdminHero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.totalCount}</SummaryValue>
          <SummaryLabel>Total providers</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.enabledCount}</SummaryValue>
          <SummaryLabel>Enabled providers</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.configuredCredentialCount}</SummaryValue>
          <SummaryLabel>Credentials configured</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardHeader>
            <CardTitle>Configured providers</CardTitle>
            <CardDescription>
              Provider secrets remain env-only. This screen controls selection, defaults, labels,
              and request defaults.
            </CardDescription>
          </CardHeader>
          <RecordStack>
            {snapshot.configs.map((provider) => (
              <RecordCard key={provider.id}>
                <RecordHeader>
                  <RecordTitleBlock>
                    <RecordTitle>{provider.label}</RecordTitle>
                    <SmallText>
                      {provider.description || provider.baseUrl || "Provider configuration record."}
                    </SmallText>
                  </RecordTitleBlock>
                  <RecordMeta>
                    <MetaPill>{provider.providerKey}</MetaPill>
                    <StatusBadge $tone={provider.credentialState === "configured" ? "success" : "warning"}>
                      {provider.credentialState}
                    </StatusBadge>
                  </RecordMeta>
                </RecordHeader>
                <SmallText>
                  Availability, labels, and request defaults are now edited in a dedicated workspace so the provider list stays easier to scan.
                </SmallText>
                <ButtonRow style={{ justifyContent: "flex-end" }}>
                  <AdminFormModal
                    description="Review provider metadata, request defaults, and availability settings without crowding the dashboard grid."
                    size="full"
                    title={`Edit ${provider.label}`}
                    triggerIcon="edit"
                    triggerLabel="Edit provider"
                  >
                    <ProviderFormCard action={saveProviderAction} provider={provider} />
                  </AdminFormModal>
                </ButtonRow>
              </RecordCard>
            ))}
          </RecordStack>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supported provider catalog</CardTitle>
            <CardDescription>
              Provider records are seeded for the supported Release 1 news APIs. Each card now exposes the official filter set directly, so admins do not have to remember provider-specific parameter names or values before configuring defaults.
            </CardDescription>
          </CardHeader>
          <SmallText>
            Supported catalog: {snapshot.supportedProviders.map((provider) => `${provider.label} (${provider.providerKey})`).join(", ")}.
          </SmallText>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
