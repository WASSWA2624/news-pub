import { describe, expect, it } from "vitest";

import { formatFetchWindowInputValue } from "@/lib/news/fetch-window";
import {
  buildFetchWindowCapabilityDetails,
  createDefaultRunWindowState,
  createRunFetchWindowRequest,
} from "./stream-management-screen.helpers";

describe("stream management run-window helpers", () => {
  it("creates the default previous-24-hours-plus-next-30-minutes run window state for admin controls", () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const windowState = createDefaultRunWindowState(now);

    expect(windowState).toEqual({
      endInputValue: formatFetchWindowInputValue(new Date("2026-04-08T12:30:00.000Z")),
      startInputValue: formatFetchWindowInputValue(
        new Date(now.getTime() - 24 * 60 * 60 * 1000),
      ),
      writeCheckpointOnSuccess: false,
    });
  });

  it("converts manual run inputs into the api fetch-window payload", () => {
    expect(
      createRunFetchWindowRequest({
        endInputValue: "2026-04-08T12:00",
        startInputValue: "2026-04-07T12:00",
        writeCheckpointOnSuccess: true,
      }),
    ).toEqual({
      end: new Date("2026-04-08T12:00").toISOString(),
      start: new Date("2026-04-07T12:00").toISOString(),
      writeCheckpointOnSuccess: true,
    });
  });

  it("describes direct, relative, and local-only provider window mappings for selected streams", () => {
    const details = buildFetchWindowCapabilityDetails([
      {
        activeProvider: {
          label: "NewsData",
          providerKey: "newsdata",
          requestDefaultsJson: {
            endpoint: "latest",
          },
        },
        locale: "en",
        settingsJson: {
          providerFilters: {
            endpoint: "latest",
          },
        },
      },
      {
        activeProvider: {
          label: "NewsAPI",
          providerKey: "newsapi",
          requestDefaultsJson: {
            endpoint: "top-headlines",
          },
        },
        locale: "en",
        settingsJson: {
          providerFilters: {
            endpoint: "top-headlines",
          },
        },
      },
      {
        activeProvider: {
          label: "Mediastack",
          providerKey: "mediastack",
          requestDefaultsJson: {},
        },
        locale: "en",
        settingsJson: {
          providerFilters: {},
        },
      },
    ]);

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          badge: "Relative lookback",
          description: expect.stringContaining("next 30 minutes from now"),
          label: "NewsData | Latest",
          mode: "relative",
        }),
        expect.objectContaining({
          badge: "Local-only bounds",
          description: expect.stringContaining("next 30 minutes from now"),
          label: "NewsAPI | Top Headlines",
          mode: "local_only",
        }),
        expect.objectContaining({
          badge: "Direct date bounds",
          description: expect.stringContaining("next 30 minutes from now"),
          label: "Mediastack | Default",
          mode: "direct",
        }),
      ]),
    );
  });
});
