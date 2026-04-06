import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("destination meta configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv({
        META_APP_ID: "1234567890",
        META_APP_SECRET: "meta-secret",
        META_ALLOWED_PAGE_IDS: "page_1",
        META_DESTINATION_CREDENTIALS_JSON: JSON.stringify({
          "meta-account": {
            accessToken: "env-user-token",
          },
        }),
      }),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("discovers connected Facebook pages and Instagram accounts from env-backed Meta credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ data: { is_valid: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [
                {
                  access_token: "page-access-token",
                  id: "page_1",
                  instagram_business_account: {
                    account_type: "BUSINESS",
                    id: "ig_1",
                    username: "example.business",
                  },
                  name: "Example Page",
                  tasks: ["ANALYZE", "CREATE_CONTENT"],
                  username: "example.page",
                },
                {
                  access_token: "page-access-token-2",
                  id: "page_2",
                  name: "Blocked Page",
                  tasks: ["CREATE_CONTENT"],
                  username: "blocked.page",
                },
              ],
            }),
        }),
    );

    const { getMetaDiscoverySnapshot } = await import("./meta-config");
    const snapshot = await getMetaDiscoverySnapshot();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(snapshot.errors).toEqual([]);
    expect(snapshot.pages).toMatchObject([
      {
        id: "page_1",
        name: "Example Page",
        sourceKey: "env:meta-account",
        tasks: ["ANALYZE", "CREATE_CONTENT"],
        username: "example.page",
      },
    ]);
    expect(snapshot.instagramAccounts).toMatchObject([
      {
        connectedPageId: "page_1",
        id: "ig_1",
        sourceKey: "env:meta-account",
        username: "example.business",
      },
    ]);
    expect(snapshot.allowedPageIds).toEqual(["page_1"]);
  });

  it("exposes safe env-backed credential defaults for the destination form without leaking tokens", async () => {
    const { getMetaDestinationFormConfig } = await import("./meta-config");
    const config = getMetaDestinationFormConfig();

    expect(config.credentialDefaultsBySlug).toMatchObject({
      "meta-account": {
        graphApiBaseUrl: "https://graph.facebook.com/v22.0",
        hasAccessToken: true,
        sourceLabel: "meta-account",
      },
    });
    expect(JSON.stringify(config)).not.toContain("env-user-token");
  });

  it("resolves discovered Instagram selections into save-ready destination settings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ data: { is_valid: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [
                {
                  access_token: "page-access-token",
                  connected_instagram_account: {
                    account_type: "CREATOR",
                    id: "ig_1",
                    username: "example.creator",
                  },
                  id: "page_1",
                  name: "Example Page",
                  tasks: ["CREATE_CONTENT"],
                  username: "example.page",
                },
              ],
            }),
        }),
    );

    const { resolveMetaDiscoverySelection } = await import("./meta-config");
    const selection = await resolveMetaDiscoverySelection({
      sourceKey: "env:meta-account",
      targetId: "ig_1",
      targetType: "INSTAGRAM_ACCOUNT",
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(selection).toMatchObject({
      accessToken: "page-access-token",
      accountHandle: "@example.creator",
      externalAccountId: "ig_1",
      settingsJsonPatch: {
        graphApiBaseUrl: "https://graph.facebook.com/v22.0",
        instagramUserId: "ig_1",
        pageId: "page_1",
      },
    });
  });
});
