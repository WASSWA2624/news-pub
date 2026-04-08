/**
 * Admin page for managing NewsPub publishing destinations and connection state.
 */

import {
  AdminIconBadge,
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  ButtonRow,
  Card,
  CardToolbar,
  CardHeader,
  CardDescription,
  MetaPill,
  NoticeBanner,
  NoticeTitle,
  PillRow,
  RecordCard,
  RecordHeader,
  RecordMeta,
  RecordStack,
  RecordTitle,
  RecordTitleBlock,
  SectionGrid,
  SmallText,
  StickySideCard,
  StickySideCardBody,
  StickySideCardHeader,
  StatusBadge,
  SummaryGrid,
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

const DestinationPlatformBadge = styled(AdminIconBadge)`
  height: 2.35rem;
  width: 2.35rem;

  svg {
    height: 1rem;
    width: 1rem;
  }
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

function getDestinationPlatformTone(platform) {
  if (platform === "FACEBOOK") {
    return "facebook";
  }

  if (platform === "INSTAGRAM") {
    return "instagram";
  }

  return "website";
}

/**
 * Renders the destination management route with shared directory cards,
 * responsive route pills, and a sticky create panel.
 *
 * @param {object} props - Route search param props.
 * @returns {Promise<JSX.Element>} The destinations route.
 */

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

      <SectionGrid $wide>
        <Card>
          <CardToolbar>
            <CardHeader>
              <AdminSectionTitle icon="destinations">Configured destinations</AdminSectionTitle>
              <CardDescription>
                Keep each publishing target compact, connected, and easier to audit with grouped identity, routing, and connection details.
              </CardDescription>
            </CardHeader>
            <PillRow>
              {platformValues.map((platform) => (
                <MetaPill key={platform} $tone={getDestinationPlatformTone(platform)}>
                  <AppIcon name={getDestinationPlatformIcon(platform)} size={12} />
                  {formatEnumLabel(platform)}
                </MetaPill>
              ))}
            </PillRow>
          </CardToolbar>
          <RecordStack>
            {snapshot.destinations.map((destination) => {
              const displayConnectionStatus =
                destination.effectiveConnectionStatus || destination.connectionStatus;

              return (
                <DestinationRecord key={destination.id}>
                  <RecordHeader>
                    <RecordTitleBlock as={RecordLead}>
                      <DestinationHeading>
                        <DestinationPlatformBadge $tone={getDestinationPlatformTone(destination.platform)}>
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
                      <PillRow>
                        <MetaPill $tone="accent">
                          <AppIcon
                            name={getDestinationPlatformIcon(destination.platform)}
                            size={11}
                          />
                          {formatEnumLabel(destination.platform)}
                        </MetaPill>
                        <MetaPill>{formatEnumLabel(destination.kind)}</MetaPill>
                        <MetaPill>{destination.slug}</MetaPill>
                      </PillRow>
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

        <StickySideCard>
          <StickySideCardHeader>
            <AdminSectionTitle icon="plus">Add destination</AdminSectionTitle>
            <CardDescription>
              Website and social endpoints can be managed independently and connected to multiple streams.
            </CardDescription>
          </StickySideCardHeader>
          <StickySideCardBody>
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
          </StickySideCardBody>
        </StickySideCard>
      </SectionGrid>
    </AdminPage>
  );
}
