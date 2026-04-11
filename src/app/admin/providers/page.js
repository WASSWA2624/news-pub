/**
 * Admin page for managing NewsPub providers and provider defaults.
 */

import {
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  ButtonRow,
  Card,
  CardHeader,
  CardDescription,
  AdminSectionTitle,
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
import { getProviderManagementSnapshot } from "@/features/providers";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import dynamic from "next/dynamic";
import { saveProviderAction } from "../actions";

const ProviderFormCard = dynamic(() => import("@/components/admin/provider-form-card"), {
  loading: () => <SmallText>Loading provider editor...</SmallText>,
});

/**
 * Renders the provider management route with shared record cards and the
 * full-workspace provider editor.
 *
 * @returns {Promise<JSX.Element>} The providers route.
 */
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
        <AdminHeroHeading description={copy.description} icon="providers" title={copy.title} />
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="providers" label="Total providers" value={snapshot.summary.totalCount} />
        <AdminMetricCard icon="badge-check" label="Enabled providers" value={snapshot.summary.enabledCount} />
        <AdminMetricCard icon="shield" label="Credentials configured" value={snapshot.summary.configuredCredentialCount} />
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardHeader>
            <AdminSectionTitle icon="providers">Configured providers</AdminSectionTitle>
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
                <ButtonRow $justify="flex-end">
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
            <AdminSectionTitle icon="book-open">Supported provider catalog</AdminSectionTitle>
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
