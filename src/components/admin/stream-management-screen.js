"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";

import {
  Card,
  CardDescription,
  CardHeader,
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
  formatEnumLabel,
} from "@/components/admin/news-admin-ui";
import StreamFormCard from "@/components/admin/stream-form-card";

const TargetingCard = styled.section`
  background:
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.12), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(245, 249, 253, 0.97));
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 18px;
  box-shadow: 0 14px 32px rgba(17, 31, 55, 0.05);
  display: grid;
  gap: 0.9rem;
  padding: clamp(0.8rem, 2vw, 1rem);
`;

const TargetingLayout = styled.div`
  display: grid;
  gap: 0.85rem;

  @media (min-width: 980px) {
    align-items: start;
    grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  }
`;

const TargetingCopy = styled.div`
  display: grid;
  gap: 0.3rem;
`;

const TargetingEyebrow = styled.span`
  color: #0f5f79;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const TargetingTitle = styled.h2`
  color: #162744;
  font-size: 1rem;
  letter-spacing: -0.03em;
  margin: 0;
`;

const ScopeHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  justify-content: space-between;
`;

const ScopeRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const ScopeActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const ScopeActionButton = styled.button`
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(16, 32, 51, 0.09);
  border-radius: 999px;
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.74rem;
  font-weight: 800;
  min-height: 36px;
  padding: 0 0.78rem;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: rgba(15, 111, 141, 0.18);
    transform: translateY(-1px);
  }
`;

const ScopeCheckbox = styled.label`
  align-items: center;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, #0f6f8d 0%, #0d5f79 100%)"
      : "rgba(255, 255, 255, 0.92)"};
  border: 1px solid ${({ $active }) => ($active ? "transparent" : "rgba(16, 32, 51, 0.09)")};
  border-radius: 999px;
  box-shadow: ${({ $active }) =>
    $active ? "0 12px 24px rgba(15, 96, 121, 0.16)" : "0 8px 18px rgba(18, 34, 58, 0.04)"};
  color: ${({ $active }) => ($active ? "white" : "#22344f")};
  cursor: pointer;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 800;
  gap: 0.55rem;
  min-height: 40px;
  padding: 0 0.88rem;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    transform: translateY(-1px);
  }

  input {
    accent-color: white;
    margin: 0;
  }
`;

const ScopeCount = styled.span`
  align-items: center;
  background: ${({ $active }) =>
    $active ? "rgba(255, 255, 255, 0.16)" : "rgba(36, 75, 115, 0.08)"};
  border: 1px solid ${({ $active }) =>
    $active ? "rgba(255, 255, 255, 0.16)" : "rgba(36, 75, 115, 0.12)"};
  border-radius: 999px;
  color: inherit;
  display: inline-flex;
  font-size: 0.66rem;
  min-height: 22px;
  padding: 0 0.48rem;
`;

const TargetingNotes = styled.div`
  display: grid;
  gap: 0.55rem;
`;

const NoteCard = styled.div`
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: 14px;
  display: grid;
  gap: 0.22rem;
  padding: 0.78rem;
`;

const NoteLabel = styled.strong`
  color: #162744;
  font-size: 0.8rem;
`;

const NoteText = styled.p`
  color: rgba(72, 85, 108, 0.92);
  font-size: 0.77rem;
  line-height: 1.45;
  margin: 0;
`;

const StreamsGrid = styled(SectionGrid)`
  @media (min-width: 1080px) {
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
  }
`;

const StickyCard = styled(Card)`
  align-self: start;

  @media (min-width: 1080px) {
    position: sticky;
    top: 5.7rem;
  }
`;

function getTone(status) {
  return status === "ACTIVE" ? "success" : "warning";
}

export default function StreamManagementScreen({
  categoryOptions,
  destinationOptions,
  modeOptions,
  providerOptions,
  runNowAction,
  saveStreamAction,
  statusOptions,
  streams,
  templateOptions,
}) {
  const [selectedPlatforms, setSelectedPlatforms] = useState(() =>
    [...new Set(destinationOptions.map((destination) => destination.platform).filter(Boolean))].sort(),
  );

  const platformSummaries = useMemo(() => {
    const platformMap = new Map();

    for (const destination of destinationOptions) {
      if (!platformMap.has(destination.platform)) {
        platformMap.set(destination.platform, {
          destinationCount: 0,
          platform: destination.platform,
          streamCount: 0,
        });
      }

      platformMap.get(destination.platform).destinationCount += 1;
    }

    for (const stream of streams) {
      const platform = stream.destination?.platform;

      if (!platform) {
        continue;
      }

      if (!platformMap.has(platform)) {
        platformMap.set(platform, {
          destinationCount: 0,
          platform,
          streamCount: 0,
        });
      }

      platformMap.get(platform).streamCount += 1;
    }

    return [...platformMap.values()].sort((left, right) => left.platform.localeCompare(right.platform));
  }, [destinationOptions, streams]);

  const allPlatforms = useMemo(
    () => platformSummaries.map((platform) => platform.platform),
    [platformSummaries],
  );

  const selectedPlatformSet = useMemo(() => new Set(selectedPlatforms), [selectedPlatforms]);

  function togglePlatform(platform) {
    setSelectedPlatforms((currentPlatforms) =>
      currentPlatforms.includes(platform)
        ? currentPlatforms.filter((value) => value !== platform)
        : [...currentPlatforms, platform].sort(),
    );
  }

  const filteredDestinationOptions = useMemo(() => {
    return destinationOptions.filter((destination) => selectedPlatformSet.has(destination.platform));
  }, [destinationOptions, selectedPlatformSet]);

  const filteredStreams = useMemo(() => {
    return streams.filter((stream) => selectedPlatformSet.has(stream.destination?.platform));
  }, [selectedPlatformSet, streams]);

  const visibleTemplateOptions = useMemo(() => {
    return templateOptions.filter(
      (template) => !template.value || selectedPlatformSet.has(template.platform),
    );
  }, [selectedPlatformSet, templateOptions]);

  const selectedLabel =
    selectedPlatforms.length === allPlatforms.length
      ? "all configured platforms"
      : selectedPlatforms.length
        ? selectedPlatforms.map((platform) => formatEnumLabel(platform)).join(", ")
        : "no platforms";
  const scopeDescription = selectedPlatforms.length
    ? `Create or review streams for ${selectedLabel}. Each destination keeps using its own saved platform settings.`
    : "Select at least one target platform to create or review streams.";

  return (
    <>
      <TargetingCard>
        <TargetingLayout>
          <TargetingCopy>
            <TargetingEyebrow>Target platforms</TargetingEyebrow>
            <TargetingTitle>Choose the platforms you want this stream workflow to target.</TargetingTitle>
            <SmallText>{scopeDescription}</SmallText>
            <ScopeHeader>
              <ScopeRail>
                {platformSummaries.map((platform) => {
                  const isActive = selectedPlatformSet.has(platform.platform);

                  return (
                    <ScopeCheckbox $active={isActive} key={platform.platform}>
                      <input
                        checked={isActive}
                        onChange={() => togglePlatform(platform.platform)}
                        type="checkbox"
                      />
                      {formatEnumLabel(platform.platform)}
                      <ScopeCount $active={isActive}>{platform.streamCount}</ScopeCount>
                    </ScopeCheckbox>
                  );
                })}
              </ScopeRail>

              <ScopeActions>
                <ScopeActionButton onClick={() => setSelectedPlatforms(allPlatforms)} type="button">
                  Select all
                </ScopeActionButton>
                <ScopeActionButton onClick={() => setSelectedPlatforms([])} type="button">
                  Deselect all
                </ScopeActionButton>
              </ScopeActions>
            </ScopeHeader>
          </TargetingCopy>

          <TargetingNotes>
            <NoteCard>
              <NoteLabel>Active scope</NoteLabel>
              <NoteText>
                {selectedPlatforms.length
                  ? `${filteredDestinationOptions.length} destinations are available across ${selectedPlatforms.length} selected platform${selectedPlatforms.length === 1 ? "" : "s"}.`
                  : "No platforms are selected yet."}
              </NoteText>
            </NoteCard>
            <NoteCard>
              <NoteLabel>How settings apply</NoteLabel>
              <NoteText>
                Destination, template, and publishing behavior continue to use the platform-specific settings already saved for each target.
              </NoteText>
            </NoteCard>
          </TargetingNotes>
        </TargetingLayout>
      </TargetingCard>

      <StreamsGrid $wide>
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedPlatforms.length === allPlatforms.length
                ? "Configured streams"
                : selectedPlatforms.length === 1
                  ? `${formatEnumLabel(selectedPlatforms[0])} streams`
                  : "Selected platform streams"}
            </CardTitle>
            <CardDescription>
              {selectedPlatforms.length
                ? "Keep each stream small, readable, and tunable from a phone without losing control."
                : "Pick one or more platforms above to load matching streams."}
            </CardDescription>
          </CardHeader>
          <RecordStack>
            {filteredStreams.length ? (
              filteredStreams.map((stream) => (
                <RecordCard key={stream.id}>
                  <RecordHeader>
                    <RecordTitleBlock>
                      <RecordTitle>{stream.name}</RecordTitle>
                      <SmallText>
                        {stream.destination?.name || "Unknown destination"} via {stream.activeProvider?.label || "Unknown provider"}
                      </SmallText>
                    </RecordTitleBlock>
                    <RecordMeta>
                      <MetaPill>{formatEnumLabel(stream.destination?.platform || "UNKNOWN")}</MetaPill>
                      <MetaPill>{formatEnumLabel(stream.mode)}</MetaPill>
                      <StatusBadge $tone={getTone(stream.status)}>{stream.status}</StatusBadge>
                    </RecordMeta>
                  </RecordHeader>
                  <StreamFormCard
                    action={saveStreamAction}
                    categoryOptions={categoryOptions}
                    destinationOptions={filteredDestinationOptions}
                    modeOptions={modeOptions}
                    providerOptions={providerOptions}
                    runNowAction={runNowAction}
                    statusOptions={statusOptions}
                    stream={stream}
                    submitLabel="Save stream"
                    templateOptions={visibleTemplateOptions}
                  />
                </RecordCard>
              ))
            ) : selectedPlatforms.length ? (
              <SmallText>
                No streams are configured for the selected platforms yet. Tick another platform or create one from the panel on the right.
              </SmallText>
            ) : (
              <SmallText>
                No platforms are selected. Use the checkboxes above, or choose Select all to work across every configured target.
              </SmallText>
            )}
          </RecordStack>
        </Card>

        <StickyCard>
          <CardHeader>
            <CardTitle>
              {selectedPlatforms.length === allPlatforms.length
                ? "Add stream"
                : selectedPlatforms.length === 1
                  ? `Add ${formatEnumLabel(selectedPlatforms[0])} stream`
                  : "Add stream to selected platforms"}
            </CardTitle>
            <CardDescription>
              {selectedPlatforms.length === allPlatforms.length
                ? "Streams define the destination-specific fetch window, filtering rules, mode, and cadence."
                : selectedPlatforms.length
                  ? "This form is narrowed to the checked platforms so one stream setup stays focused on the targets you selected."
                  : "Select one or more platforms above before creating a stream."}
            </CardDescription>
          </CardHeader>
          {filteredDestinationOptions.length ? (
            <StreamFormCard
              action={saveStreamAction}
              categoryOptions={categoryOptions}
              destinationOptions={filteredDestinationOptions}
              modeOptions={modeOptions}
              providerOptions={providerOptions}
              submitLabel="Create stream"
              templateOptions={visibleTemplateOptions}
            />
          ) : (
            <SmallText>
              {selectedPlatforms.length
                ? `No destinations are configured for the selected platform${selectedPlatforms.length === 1 ? "" : "s"} yet. Add a destination first, then come back to create streams for it.`
                : "No platforms are selected yet. Choose at least one platform above before creating a stream."}
            </SmallText>
          )}
        </StickyCard>
      </StreamsGrid>
    </>
  );
}
