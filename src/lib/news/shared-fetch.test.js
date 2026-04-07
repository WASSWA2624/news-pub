import { describe, expect, it } from "vitest";

import { planSharedFetchGroups, serializeSharedFetchGroup } from "./shared-fetch";

function createExecution({
  fetchWindow,
  providerDefaults = {},
  providerFilters = {},
  providerKey = "newsdata",
  streamId,
} = {}) {
  return {
    checkpoint: null,
    fetchRun: {
      id: `fetch_run_${streamId}`,
    },
    fetchWindow,
    stream: {
      activeProvider: {
        providerKey,
        requestDefaultsJson: providerDefaults,
      },
      countryAllowlistJson: [],
      id: streamId,
      languageAllowlistJson: [],
      locale: "en",
      settingsJson: {
        providerFilters,
      },
    },
  };
}

describe("shared fetch planner", () => {
  it("merges compatible stream windows and safe union filters into one shared group", () => {
    const groups = planSharedFetchGroups([
      createExecution({
        fetchWindow: {
          end: new Date("2026-04-07T10:00:00.000Z"),
          start: new Date("2026-04-07T02:00:00.000Z"),
          usesExplicitBoundaries: false,
          usesProviderCheckpoint: true,
          writeCheckpointOnSuccess: true,
        },
        providerDefaults: {
          endpoint: "latest",
          language: ["en"],
        },
        providerFilters: {
          category: ["business"],
        },
        streamId: "stream_1",
      }),
      createExecution({
        fetchWindow: {
          end: new Date("2026-04-07T12:00:00.000Z"),
          start: new Date("2026-04-07T04:00:00.000Z"),
          usesExplicitBoundaries: false,
          usesProviderCheckpoint: true,
          writeCheckpointOnSuccess: true,
        },
        providerDefaults: {
          endpoint: "latest",
          language: ["en"],
        },
        providerFilters: {
          category: ["technology"],
        },
        streamId: "stream_2",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      endpoint: "latest",
      executionMode: "shared_batch",
      providerKey: "newsdata",
      sharedRequestValues: {
        category: ["business", "technology"],
        endpoint: "latest",
        language: ["en"],
      },
      streamIds: ["stream_1", "stream_2"],
    });
    expect(groups[0].sharedFetchWindow).toMatchObject({
      end: new Date("2026-04-07T12:00:00.000Z"),
      start: new Date("2026-04-07T02:00:00.000Z"),
    });
    expect(serializeSharedFetchGroup(groups[0])).toMatchObject({
      executionMode: "shared_batch",
      providerKey: "newsdata",
      streamIds: ["stream_1", "stream_2"],
      window: {
        end: "2026-04-07T12:00:00.000Z",
        start: "2026-04-07T02:00:00.000Z",
      },
    });
  });

  it("splits streams when endpoint shape or restrictive request fields would underfetch", () => {
    const endpointGroups = planSharedFetchGroups([
      createExecution({
        fetchWindow: {
          end: new Date("2026-04-07T12:00:00.000Z"),
          start: new Date("2026-04-07T10:00:00.000Z"),
        },
        providerDefaults: {
          endpoint: "latest",
        },
        streamId: "stream_latest",
      }),
      createExecution({
        fetchWindow: {
          end: new Date("2026-04-07T12:00:00.000Z"),
          start: new Date("2026-04-07T10:00:00.000Z"),
        },
        providerDefaults: {
          endpoint: "archive",
        },
        streamId: "stream_archive",
      }),
    ]);

    expect(endpointGroups).toHaveLength(2);
    expect(endpointGroups.every((group) => group.partitionReasonCodes.includes("provider_endpoint_shape_mismatch"))).toBe(true);

    const constrainedGroups = planSharedFetchGroups([
      createExecution({
        fetchWindow: {
          end: new Date("2026-04-07T12:00:00.000Z"),
          start: new Date("2026-04-07T10:00:00.000Z"),
        },
        providerDefaults: {
          endpoint: "everything",
          language: "en",
        },
        providerFilters: {
          q: "climate",
        },
        providerKey: "newsapi",
        streamId: "stream_climate",
      }),
      createExecution({
        fetchWindow: {
          end: new Date("2026-04-07T12:00:00.000Z"),
          start: new Date("2026-04-07T10:00:00.000Z"),
        },
        providerDefaults: {
          endpoint: "everything",
          language: "en",
        },
        providerFilters: {
          q: "markets",
        },
        providerKey: "newsapi",
        streamId: "stream_markets",
      }),
    ]);

    expect(constrainedGroups).toHaveLength(2);
    expect(
      constrainedGroups.every((group) =>
        group.partitionReasonCodes.includes("provider_request_constraint_mismatch"),
      ),
    ).toBe(true);
  });
});
