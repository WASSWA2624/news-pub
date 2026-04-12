import { describe, expect, it } from "vitest";

import {
  createDefaultFetchWindowPreview,
  isArticleInsideFetchWindow,
  mergeExecutionFetchWindows,
  resolveExecutionFetchWindow,
  serializeFetchWindow,
} from "./fetch-window";

describe("fetch window helpers", () => {
  it("creates the default previous-24-hours-plus-next-30-minutes preview window", () => {
    const preview = createDefaultFetchWindowPreview({
      now: new Date("2026-04-07T12:00:00.000Z"),
    });

    expect(preview).toEqual({
      defaultWindowForwardMinutes: 30,
      defaultWindowHours: 24,
      end: new Date("2026-04-07T12:30:00.000Z"),
      start: new Date("2026-04-06T12:00:00.000Z"),
    });
  });

  it("uses explicit boundaries without advancing checkpoints by default", () => {
    const fetchWindow = resolveExecutionFetchWindow({
      checkpoint: {
        last_successful_fetch_at: new Date("2026-04-01T00:00:00.000Z"),
      },
      now: new Date("2026-04-07T12:00:00.000Z"),
      requestedWindow: {
        end: "2026-04-06T18:00:00.000Z",
        start: "2026-04-05T06:00:00.000Z",
      },
    });

    expect(fetchWindow).toMatchObject({
      source: "explicit",
      usesExplicitBoundaries: true,
      usesProviderCheckpoint: false,
      writeCheckpointOnSuccess: false,
    });
    expect(serializeFetchWindow(fetchWindow)).toEqual({
      end: "2026-04-06T18:00:00.000Z",
      source: "explicit",
      start: "2026-04-05T06:00:00.000Z",
      usesExplicitBoundaries: true,
      usesProviderCheckpoint: false,
      writeCheckpointOnSuccess: false,
    });
  });

  it("uses the forward buffer on automatic default and checkpoint windows", () => {
    const now = new Date("2026-04-07T12:00:00.000Z");

    expect(
      resolveExecutionFetchWindow({
        now,
      }),
    ).toMatchObject({
      end: new Date("2026-04-07T12:30:00.000Z"),
      source: "default",
      start: new Date("2026-04-06T12:00:00.000Z"),
    });

    expect(
      resolveExecutionFetchWindow({
        checkpoint: {
          last_successful_fetch_at: new Date("2026-04-07T09:15:00.000Z"),
        },
        now,
      }),
    ).toMatchObject({
      end: new Date("2026-04-07T12:30:00.000Z"),
      source: "checkpoint",
      start: new Date("2026-04-07T09:15:00.000Z"),
    });
  });

  it("widens several stream windows into one shared request envelope", () => {
    const mergedWindow = mergeExecutionFetchWindows([
      resolveExecutionFetchWindow({
        checkpoint: {
          last_successful_fetch_at: new Date("2026-04-05T00:00:00.000Z"),
        },
        now: new Date("2026-04-07T12:00:00.000Z"),
      }),
      resolveExecutionFetchWindow({
        now: new Date("2026-04-07T12:00:00.000Z"),
        requestedWindow: {
          end: "2026-04-07T12:00:00.000Z",
          start: "2026-04-06T06:00:00.000Z",
        },
      }),
    ]);

    expect(mergedWindow).toMatchObject({
      end: new Date("2026-04-07T12:30:00.000Z"),
      source: "merged_explicit",
      start: new Date("2026-04-05T00:00:00.000Z"),
      usesExplicitBoundaries: true,
      usesProviderCheckpoint: true,
      writeCheckpointOnSuccess: false,
    });
  });

  it("filters stale articles but keeps timestamp-less items eligible for local fan-out", () => {
    const fetchWindow = resolveExecutionFetchWindow({
      now: new Date("2026-04-07T12:00:00.000Z"),
      requestedWindow: {
        end: "2026-04-07T12:00:00.000Z",
        start: "2026-04-07T00:00:00.000Z",
      },
    });

    expect(
      isArticleInsideFetchWindow(
        {
          published_at: "2026-04-07T05:00:00.000Z",
        },
        fetchWindow,
      ),
    ).toBe(true);
    expect(
      isArticleInsideFetchWindow(
        {
          published_at: "2026-04-06T23:59:59.000Z",
        },
        fetchWindow,
      ),
    ).toBe(false);
    expect(
      isArticleInsideFetchWindow(
        {
          published_at: null,
        },
        fetchWindow,
      ),
    ).toBe(true);
  });
});
