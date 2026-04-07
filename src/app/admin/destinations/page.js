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
  NoticeBanner,
  NoticeTitle,
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
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import DestinationFormCard from "@/components/admin/destination-form-card";
import AppIcon from "@/components/common/app-icon";
import { getDestinationManagementSnapshot } from "@/features/destinations";
import { getMetaDestinationFormConfig } from "@/features/destinations/meta-config";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import styled from "styled-components";
import { deleteDestinationAction, saveDestinationAction } from "../actions";

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
  background: ${({ $platform }) =>
    $platform === "FACEBOOK"
      ? "rgba(24, 119, 242, 0.1)"
      : $platform === "INSTAGRAM"
        ? "rgba(225, 48, 108, 0.1)"
        : "rgba(15, 111, 141, 0.07)"};
  border: 1px solid
    ${({ $platform }) =>
      $platform === "FACEBOOK"
        ? "rgba(24, 119, 242, 0.18)"
        : $platform === "INSTAGRAM"
          ? "rgba(225, 48, 108, 0.18)"
          : "rgba(15, 111, 141, 0.12)"};
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $platform }) =>
    $platform === "FACEBOOK"
      ? "#1666d3"
      : $platform === "INSTAGRAM"
        ? "#b42357"
        : "#0d5f79"};
  display: inline-flex;
  font-size: 0.64rem;
  font-weight: 800;
  gap: 0.38rem;
  letter-spacing: 0.08em;
  min-height: 28px;
  padding: 0 0.7rem;
  text-transform: uppercase;

  svg {
    height: 0.8rem;
    width: 0.8rem;
  }
`;

const DestinationRecord = styled(RecordCard)`
  gap: 0.85rem;
  padding: 0.9rem;
`;

const RecordLead = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const DestinationHeading = styled.div`
  align-items: center;
  display: flex;
  gap: 0.65rem;
  min-width: 0;
`;

const DestinationIdentity = styled.div`
  display: grid;
  gap: 0.14rem;
  min-width: 0;
`;

const DestinationPlatformBadge = styled.span`
  align-items: center;
  background: ${({ $platform }) =>
    $platform === "FACEBOOK"
      ? "linear-gradient(180deg, rgba(24, 119, 242, 0.16), rgba(24, 119, 242, 0.08))"
      : $platform === "INSTAGRAM"
        ? "linear-gradient(180deg, rgba(225, 48, 108, 0.16), rgba(225, 48, 108, 0.08))"
        : "linear-gradient(180deg, rgba(15, 111, 141, 0.16), rgba(15, 111, 141, 0.08))"};
  border: 1px solid
    ${({ $platform }) =>
      $platform === "FACEBOOK"
        ? "rgba(24, 119, 242, 0.18)"
        : $platform === "INSTAGRAM"
          ? "rgba(225, 48, 108, 0.18)"
          : "rgba(15, 111, 141, 0.18)"};
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $platform }) =>
    $platform === "FACEBOOK"
      ? "#1666d3"
      : $platform === "INSTAGRAM"
        ? "#b42357"
        : "#0d5f79"};
  display: inline-flex;
  flex: 0 0 auto;
  height: 2.35rem;
  justify-content: center;
  width: 2.35rem;

  svg {
    height: 1rem;
    width: 1rem;
  }
`;

const ActionCluster = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;

  > form {
    display: inline-flex;
  }
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
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $tone }) => ($tone === "accent" ? "#0d5f79" : "#30435f")};
  display: inline-flex;
  font-size: 0.62rem;
  font-weight: 800;
  gap: 0.32rem;
  letter-spacing: 0.08em;
  min-height: 24px;
  padding: 0 0.55rem;
  text-transform: uppercase;

  svg {
    height: 0.72rem;
    width: 0.72rem;
  }
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

function getDeleteDescription(destination) {
  const relatedStreamText = destination.streamCount
    ? `${destination.streamCount} stream${destination.streamCount === 1 ? "" : "s"}`
    : null;
  const relatedHistoryCount = destination.articleMatchCount + destination.publishAttemptCount;
  const relatedHistoryText = relatedHistoryCount
    ? `${relatedHistoryCount} related publishing record${relatedHistoryCount === 1 ? "" : "s"}`
    : null;

  if (relatedStreamText || relatedHistoryText) {
    return `This will permanently remove ${destination.name} and also delete ${[relatedStreamText, relatedHistoryText]
      .filter(Boolean)
      .join(" and ")} linked to it.`;
  }

  return `This will permanently remove ${destination.name}. Saved tokens, routing details, and connection notes will be deleted.`;
}

function getDestinationPlatformIcon(platform) {
  if (platform === "FACEBOOK") {
    return "facebook";
  }

  if (platform === "INSTAGRAM") {
    return "instagram";
  }

  return "globe";
}

export default async function DestinationsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const metaConfig = getMetaDestinationFormConfig();
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getDestinationManagementSnapshot(),
  ]);
  const copy = messages.admin.destinations;
  const pageError =
    typeof resolvedSearchParams?.error === "string" ? resolvedSearchParams.error.trim() : "";

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminHeroHeading description={copy.description} icon="destinations" title={copy.title} />
      </AdminHero>

      {pageError ? (
        <NoticeBanner $tone="danger">
          <NoticeTitle>{pageError}</NoticeTitle>
        </NoticeBanner>
      ) : null}

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
                <PlatformChip key={platform} $platform={platform}>
                  <AppIcon name={getDestinationPlatformIcon(platform)} size={12} />
                  {formatEnumLabel(platform)}
                </PlatformChip>
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
                      <DestinationHeading>
                        <DestinationPlatformBadge $platform={destination.platform}>
                          <AppIcon
                            name={getDestinationPlatformIcon(destination.platform)}
                            size={16}
                          />
                        </DestinationPlatformBadge>
                        <DestinationIdentity>
                          <RecordTitle>{destination.name}</RecordTitle>
                          <SmallText>{destination.accountHandle || destination.slug}</SmallText>
                        </DestinationIdentity>
                      </DestinationHeading>
                      <RouteRail>
                        <RoutePill $tone="accent">
                          <AppIcon
                            name={getDestinationPlatformIcon(destination.platform)}
                            size={11}
                          />
                          {formatEnumLabel(destination.platform)}
                        </RoutePill>
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
                  <ButtonRow as={ActionCluster}>
                    <AdminFormModal
                      description="Manage destination identity, platform compatibility, connection details, and operational notes in one modal workspace."
                      mountOnOpen
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
                        metaConfig={metaConfig}
                        platformOptions={platformOptions}
                        submitLabel="Save destination"
                      />
                    </AdminFormModal>
                    <form action={deleteDestinationAction}>
                      <input name="id" type="hidden" value={destination.id} />
                      <ConfirmSubmitButton
                        confirmLabel="Delete destination"
                        description={getDeleteDescription(destination)}
                        title="Delete this destination?"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
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
              mountOnOpen
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
                metaConfig={metaConfig}
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
