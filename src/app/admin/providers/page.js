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
  PillRow,
  RecordCard,
  RecordHeader,
  RecordMeta,
  RecordStack,
  RecordTitle,
  RecordTitleBlock,
  SectionGrid,
  SmallText,
  StatusBadge,
  SummaryGrid,
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

function formatConfigKey(value) {
  return `${value || ""}`
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}

function formatConfigValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ") || "none";
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${formatConfigKey(key)}: ${formatConfigValue(nestedValue)}`)
      .join(", ");
  }

  const normalizedValue = `${value ?? ""}`.trim();

  return normalizedValue || "none";
}

function buildRequestDefaultsPreview(request_defaults_json = {}) {
  const entries = Object.entries(request_defaults_json).filter(([, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (value && typeof value === "object") {
      return Object.keys(value).length > 0;
    }

    return `${value ?? ""}`.trim() !== "";
  });

  if (!entries.length) {
    return "Saved request defaults: none. NewsPub is using the provider integration baseline.";
  }

  const preview = entries
    .slice(0, 4)
    .map(([key, value]) => `${formatConfigKey(key)} = ${formatConfigValue(value)}`)
    .join(" | ");

  return entries.length > 4
    ? `Saved request defaults: ${preview} | +${entries.length - 4} more`
    : `Saved request defaults: ${preview}`;
}

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
        <AdminMetricCard icon="sparkles" label="Providers with saved defaults" tone="accent" value={snapshot.summary.savedDefaultsCount} />
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
                      {provider.description || provider.base_url || "Provider configuration record."}
                    </SmallText>
                  </RecordTitleBlock>
                  <RecordMeta>
                    <MetaPill>{provider.provider_key}</MetaPill>
                    <StatusBadge $tone={provider.credentialState === "configured" ? "success" : "warning"}>
                      {provider.credentialState}
                    </StatusBadge>
                  </RecordMeta>
                </RecordHeader>
                <PillRow>
                  <MetaPill $tone={provider.is_enabled ? "success" : "warning"}>
                    {provider.is_enabled ? "Enabled" : "Disabled"}
                  </MetaPill>
                  <MetaPill $tone={provider.is_selectable ? "success" : "warning"}>
                    {provider.is_selectable ? "Selectable" : "Hidden from stream picker"}
                  </MetaPill>
                  {provider.is_default ? <MetaPill $tone="accent">Workspace default</MetaPill> : null}
                  <MetaPill>
                    {Object.keys(provider.request_defaults_json || {}).length} saved default{Object.keys(provider.request_defaults_json || {}).length === 1 ? "" : "s"}
                  </MetaPill>
                </PillRow>
                <SmallText>{buildRequestDefaultsPreview(provider.request_defaults_json)}</SmallText>
                {provider.base_url ? (
                  <SmallText>Stored base URL: {provider.base_url}</SmallText>
                ) : null}
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
            Supported catalog: {snapshot.supportedProviders.map((provider) => `${provider.label} (${provider.provider_key})`).join(", ")}.
          </SmallText>
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
