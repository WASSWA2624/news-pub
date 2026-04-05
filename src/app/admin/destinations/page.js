import {
  AdminDescription,
  AdminEyebrow,
  AdminHero,
  AdminPage,
  AdminTitle,
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
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import DestinationFormCard from "@/components/admin/destination-form-card";
import { getDestinationManagementSnapshot } from "@/features/destinations";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { saveDestinationAction } from "../actions";

const platformValues = ["WEBSITE", "FACEBOOK", "INSTAGRAM"];
const kindValues = [
  "WEBSITE",
  "FACEBOOK_PROFILE",
  "FACEBOOK_PAGE",
  "INSTAGRAM_PERSONAL",
  "INSTAGRAM_BUSINESS"
];
const connectionStatusValues = ["DISCONNECTED", "CONNECTED", "ERROR"];
const kindDescriptions = Object.freeze({
  FACEBOOK_PAGE: "Use a Facebook page publishing destination.",
  FACEBOOK_PROFILE: "Use a Facebook profile publishing destination.",
  INSTAGRAM_BUSINESS: "Use a publish-capable Instagram business account.",
  INSTAGRAM_PERSONAL: "Stored for reference, but not publish-capable automatically.",
  WEBSITE: "Publish directly to the NewsPub website.",
});
const connectionStatusDescriptions = Object.freeze({
  CONNECTED: "Ready for publishing.",
  DISCONNECTED: "Configured but not actively connected.",
  ERROR: "Needs operator attention before publishing.",
});
const platformOptions = platformValues.map((value) => ({
  badge: value,
  description: `${formatEnumLabel(value)} destination`,
  label: formatEnumLabel(value),
  value,
}));
const kindOptions = kindValues.map((value) => ({
  badge: value.split("_")[0],
  description: kindDescriptions[value],
  label: formatEnumLabel(value),
  value,
}));
const connectionStatusOptions = connectionStatusValues.map((value) => ({
  description: connectionStatusDescriptions[value],
  label: formatEnumLabel(value),
  value,
}));

function getTone(status) {
  if (status === "CONNECTED") {
    return "success";
  }

  if (status === "ERROR") {
    return "danger";
  }

  return "warning";
}

export default async function DestinationsPage() {
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getDestinationManagementSnapshot(),
  ]);
  const copy = messages.admin.destinations;

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
          <SummaryLabel>Total destinations</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.connectedCount}</SummaryValue>
          <SummaryLabel>Connected destinations</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{snapshot.summary.errorCount}</SummaryValue>
          <SummaryLabel>Destinations in error</SummaryLabel>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <Card>
          <CardHeader>
            <CardTitle>Configured destinations</CardTitle>
            <CardDescription>Keep each publishing target compact, connected, and easy to audit from mobile.</CardDescription>
          </CardHeader>
          <RecordStack>
            {snapshot.destinations.map((destination) => (
              <RecordCard key={destination.id}>
                <RecordHeader>
                  <RecordTitleBlock>
                    <RecordTitle>{destination.name}</RecordTitle>
                    <SmallText>{destination.accountHandle || destination.slug}</SmallText>
                  </RecordTitleBlock>
                  <RecordMeta>
                    <MetaPill>{formatEnumLabel(destination.kind)}</MetaPill>
                    <StatusBadge $tone={getTone(destination.connectionStatus)}>
                      {destination.connectionStatus}
                    </StatusBadge>
                  </RecordMeta>
                </RecordHeader>
                <DestinationFormCard
                  action={saveDestinationAction}
                  connectionStatusOptions={connectionStatusOptions}
                  destination={destination}
                  kindOptions={kindOptions}
                  platformOptions={platformOptions}
                  submitLabel="Save destination"
                />
              </RecordCard>
            ))}
          </RecordStack>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add destination</CardTitle>
            <CardDescription>
              Website and social endpoints can be managed independently and connected to multiple streams.
            </CardDescription>
          </CardHeader>
          <DestinationFormCard
            action={saveDestinationAction}
            kindOptions={kindOptions}
            platformOptions={platformOptions}
            submitLabel="Create destination"
          />
        </Card>
      </SectionGrid>
    </AdminPage>
  );
}
