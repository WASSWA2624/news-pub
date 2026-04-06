import {
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  SummaryGrid,
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import StreamManagementScreen from "@/components/admin/stream-management-screen";
import { getStreamManagementSnapshot } from "@/features/streams";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { getProviderDefinition } from "@/lib/news/provider-definitions";
import { saveStreamAction } from "../actions";

const modeValues = ["AUTO_PUBLISH", "REVIEW_REQUIRED"];
const statusValues = ["ACTIVE", "PAUSED"];
const modeOptions = modeValues.map((value) => ({
  description:
    value === "AUTO_PUBLISH"
      ? "Eligible stories can move straight into publishing."
      : "Stories stay queued for editorial review before publishing.",
  label: formatEnumLabel(value),
  value,
}));
const statusOptions = statusValues.map((value) => ({
  description:
    value === "ACTIVE"
      ? "The stream can run on schedule or manually."
      : "The stream is configured but currently paused.",
  label: formatEnumLabel(value),
  value,
}));

export default async function StreamsPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getStreamManagementSnapshot(),
  ]);
  const copy = messages.admin.streams;
  const destinationOptions = snapshot.destinations.map((destination) => ({
    badge: destination.platform,
    description: `${destination.slug} | ${formatEnumLabel(destination.kind)}`,
    kind: destination.kind,
    label: destination.name,
    platform: destination.platform,
    value: destination.id,
  }));
  const providerOptions = snapshot.providers.map((provider) => ({
    badge: provider.providerKey,
    description: getProviderDefinition(provider.providerKey)?.docsUrl || "Configured provider",
    docsUrl: getProviderDefinition(provider.providerKey)?.docsUrl || "",
    label: provider.label,
    providerKey: provider.providerKey,
    value: provider.id,
  }));
  const templateOptions = [
    {
      description: "Let NewsPub resolve the best template from platform, locale, and category defaults.",
      label: "No explicit template",
      value: "",
    },
    ...snapshot.templates.map((template) => ({
      badge: template.platform,
      description: template.locale ? `Locale override: ${template.locale}` : "Platform-aware template",
      label: template.name,
      platform: template.platform,
      value: template.id,
    })),
  ];
  const categoryOptions = snapshot.categories.map((category) => ({
    description: category.description || "Assign this stream to the category.",
    label: category.name,
    value: category.id,
  }));

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminHeroHeading description={copy.description} icon="streams" title={copy.title} />
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="streams" label="Total streams" value={snapshot.summary.totalCount} />
        <AdminMetricCard icon="badge-check" label="Active streams" value={snapshot.summary.activeCount} />
        <AdminMetricCard icon="clock" label="Paused streams" tone="accent" value={snapshot.summary.pausedCount} />
      </SummaryGrid>

      <StreamManagementScreen
        categoryOptions={categoryOptions}
        destinationOptions={destinationOptions}
        modeOptions={modeOptions}
        providerOptions={providerOptions}
        saveStreamAction={saveStreamAction}
        statusOptions={statusOptions}
        streams={snapshot.streams}
        templateOptions={templateOptions}
      />
    </AdminPage>
  );
}
