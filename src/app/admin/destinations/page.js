import {
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  ButtonRow,
  Card,
  CardHeader,
  CardDescription,
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
import AdminFormModal from "@/components/admin/admin-form-modal";
import DestinationFormCard from "@/components/admin/destination-form-card";
import { getDestinationManagementSnapshot } from "@/features/destinations";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import styled from "styled-components";
import { saveDestinationAction } from "../actions";

const DestinationGrid = styled(SectionGrid)`
  @media (min-width: 1080px) {
    grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.9fr);
  }
`;

const DirectoryHeader = styled.div`
  align-items: start;
  display: grid;
  gap: 0.75rem;

  @media (min-width: 860px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }
`;

const PlatformRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const PlatformChip = styled.span`
  align-items: center;
  background: rgba(15, 111, 141, 0.07);
  border: 1px solid rgba(15, 111, 141, 0.12);
  border-radius: 999px;
  color: #0d5f79;
  display: inline-flex;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: 28px;
  padding: 0 0.7rem;
  text-transform: uppercase;
`;

const DestinationRecord = styled(RecordCard)`
  gap: 0.85rem;
  padding: 0.9rem;
`;

const RecordLead = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const RouteRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

const RoutePill = styled.span`
  align-items: center;
  background: ${({ $tone }) =>
    $tone === "accent"
      ? "rgba(15, 111, 141, 0.08)"
      : "rgba(16, 32, 51, 0.05)"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "accent"
        ? "rgba(15, 111, 141, 0.14)"
        : "rgba(16, 32, 51, 0.08)"};
  border-radius: 999px;
  color: ${({ $tone }) => ($tone === "accent" ? "#0d5f79" : "#30435f")};
  display: inline-flex;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: 24px;
  padding: 0 0.55rem;
  text-transform: uppercase;
`;

const StickyCard = styled(Card)`
  align-self: start;
  position: sticky;
  top: 5.7rem;
`;

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
  FACEBOOK_PROFILE: "Stored for reference, but not publish-capable automatically.",
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
        <AdminHeroHeading description={copy.description} icon="destinations" title={copy.title} />
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="destinations" label="Total destinations" value={snapshot.summary.totalCount} />
        <AdminMetricCard icon="badge-check" label="Connected destinations" value={snapshot.summary.connectedCount} />
        <AdminMetricCard icon="warning" label="Destinations in error" tone="danger" value={snapshot.summary.errorCount} />
      </SummaryGrid>

      <DestinationGrid $wide>
        <Card>
          <DirectoryHeader>
            <CardHeader>
              <AdminSectionTitle icon="destinations">Configured destinations</AdminSectionTitle>
              <CardDescription>
                Keep each publishing target compact, connected, and easier to audit with grouped identity, routing, and connection details.
              </CardDescription>
            </CardHeader>
            <PlatformRail>
              {platformValues.map((platform) => (
                <PlatformChip key={platform}>{formatEnumLabel(platform)}</PlatformChip>
              ))}
            </PlatformRail>
          </DirectoryHeader>
          <RecordStack>
            {snapshot.destinations.map((destination) => {
              const displayConnectionStatus =
                destination.effectiveConnectionStatus || destination.connectionStatus;

              return (
                <DestinationRecord key={destination.id}>
                  <RecordHeader>
                    <RecordTitleBlock as={RecordLead}>
                      <RecordTitle>{destination.name}</RecordTitle>
                      <SmallText>{destination.accountHandle || destination.slug}</SmallText>
                      <RouteRail>
                        <RoutePill $tone="accent">{formatEnumLabel(destination.platform)}</RoutePill>
                        <RoutePill>{formatEnumLabel(destination.kind)}</RoutePill>
                        <RoutePill>{destination.slug}</RoutePill>
                      </RouteRail>
                    </RecordTitleBlock>
                    <RecordMeta>
                      <MetaPill>{formatEnumLabel(destination.kind)}</MetaPill>
                      <StatusBadge $tone={getTone(displayConnectionStatus)}>
                        {displayConnectionStatus}
                      </StatusBadge>
                    </RecordMeta>
                  </RecordHeader>
                  <SmallText>
                    {destination.usesRuntimeCredentials
                      ? "Meta runtime credentials are currently sourced from environment variables for this destination."
                      : "Identity, routing, credentials, and operational notes open in a focused modal with room for longer configurations."}
                  </SmallText>
                  <ButtonRow>
                    <AdminFormModal
                      description="Manage destination identity, platform compatibility, connection details, and operational notes in one modal workspace."
                      size="full"
                      title={`Edit ${destination.name}`}
                      triggerIcon="edit"
                      triggerLabel="Edit destination"
                    >
                      <DestinationFormCard
                        action={saveDestinationAction}
                        connectionStatusOptions={connectionStatusOptions}
                        destination={destination}
                        kindOptions={kindOptions}
                        platformOptions={platformOptions}
                        submitLabel="Save destination"
                      />
                    </AdminFormModal>
                  </ButtonRow>
                </DestinationRecord>
              );
            })}
          </RecordStack>
        </Card>

        <StickyCard>
          <CardHeader>
            <AdminSectionTitle icon="plus">Add destination</AdminSectionTitle>
            <CardDescription>
              Website and social endpoints can be managed independently and connected to multiple streams.
            </CardDescription>
          </CardHeader>
          <SmallText>
            Open a full-size composer when you need to add a new website or social endpoint without leaving the directory view.
          </SmallText>
          <ButtonRow>
            <AdminFormModal
              description="Create a new destination with identity, routing, status, and credential details in a single responsive workspace."
              size="full"
              title="Create destination"
              triggerFullWidth
              triggerIcon="plus"
              triggerLabel="New destination"
              triggerTone="primary"
            >
              <DestinationFormCard
                action={saveDestinationAction}
                connectionStatusOptions={connectionStatusOptions}
                kindOptions={kindOptions}
                platformOptions={platformOptions}
                submitLabel="Create destination"
              />
            </AdminFormModal>
          </ButtonRow>
        </StickyCard>
      </DestinationGrid>
    </AdminPage>
  );
}
