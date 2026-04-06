import { describe, expect, it } from "vitest";

import {
  getDestinationValidationIssues,
  getStreamValidationIssues,
  getTemplateValidationIssues,
} from "./configuration";

describe("configuration validation", () => {
  it("flags mismatched destination platform and kind pairs", () => {
    expect(
      getDestinationValidationIssues({
        kind: "FACEBOOK_PAGE",
        platform: "WEBSITE",
      }),
    ).toMatchObject([
      {
        code: "destination_kind_platform_mismatch",
      },
    ]);
  });

  it("flags auto-publish streams that target non-publishable destinations", () => {
    expect(
      getStreamValidationIssues({
        destination: {
          kind: "INSTAGRAM_PERSONAL",
          platform: "INSTAGRAM",
        },
        mode: "AUTO_PUBLISH",
      }),
    ).toMatchObject([
      {
        code: "stream_mode_destination_mismatch",
      },
    ]);
  });

  it("flags auto-publish streams that target facebook profiles", () => {
    expect(
      getStreamValidationIssues({
        destination: {
          kind: "FACEBOOK_PROFILE",
          platform: "FACEBOOK",
        },
        mode: "AUTO_PUBLISH",
      }),
    ).toMatchObject([
      {
        code: "stream_mode_destination_mismatch",
      },
    ]);
  });

  it('flags NewsAPI "Everything" streams that do not provide a query or domain scope', () => {
    expect(
      getStreamValidationIssues({
        locale: "en",
        providerDefaults: {
          endpoint: "top-headlines",
        },
        providerFilters: {
          domains: "",
          endpoint: "everything",
          q: "",
        },
        providerKey: "newsapi",
      }),
    ).toMatchObject([
      {
        code: "stream_provider_newsapi_everything_requires_scope",
      },
    ]);
  });

  it("flags templates whose linked streams use different platforms", () => {
    expect(
      getTemplateValidationIssues({
        platform: "WEBSITE",
        streams: [
          {
            destination: {
              platform: "WEBSITE",
            },
          },
          {
            destination: {
              platform: "FACEBOOK",
            },
          },
        ],
      }),
    ).toMatchObject([
      {
        code: "template_linked_stream_platforms_mismatch",
      },
    ]);
  });
});
