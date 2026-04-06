import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("destination feature validation", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects incompatible platform and kind combinations before saving", async () => {
    const { saveDestinationRecord } = await import("./index");

    await expect(
      saveDestinationRecord(
        {
          kind: "FACEBOOK_PAGE",
          name: "Website but Facebook",
          platform: "WEBSITE",
          slug: "website-but-facebook",
        },
        {},
        {},
      ),
    ).rejects.toMatchObject({
      status: "destination_validation_failed",
    });
  });

  it("persists a discovered Meta page selection as destination settings and an encrypted token", async () => {
    process.env.META_USER_ACCESS_TOKEN = "env-user-token";
    process.env.META_APP_ID = "1234567890";
    process.env.META_APP_SECRET = "meta-secret";

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
                  name: "Example Page",
                  tasks: ["CREATE_CONTENT", "MANAGE", "MODERATE"],
                  username: "example.page",
                },
              ],
            }),
        }),
    );

    const { decryptSecretValue } = await import("@/lib/security/secrets");
    const { saveDestinationRecord } = await import("./index");
    const upsert = vi.fn(async ({ create }) => ({
      id: "destination_1",
      ...create,
    }));

    const record = await saveDestinationRecord(
      {
        connectionStatus: "CONNECTED",
        kind: "FACEBOOK_PAGE",
        metaDiscoverySourceKey: "env:meta-user-access-token",
        metaDiscoveryTargetId: "page_1",
        metaDiscoveryTargetType: "FACEBOOK_PAGE",
        name: "Example destination",
        platform: "FACEBOOK",
        settingsJson: {},
        slug: "example-destination",
      },
      {},
      {
        auditEvent: {
          create: vi.fn(),
        },
        destination: {
          upsert,
        },
      },
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(record.externalAccountId).toBe("page_1");
    expect(record.settingsJson).toMatchObject({
      pageId: "page_1",
    });
    expect(record.tokenHint).toBe("oken");
    expect(
      decryptSecretValue({
        ciphertext: record.encryptedTokenCiphertext,
        iv: record.encryptedTokenIv,
        tag: record.encryptedTokenTag,
      }),
    ).toBe("page-access-token");
  });

  it("persists destination-specific Meta credential overrides when requested", async () => {
    const { decryptSecretValue } = await import("@/lib/security/secrets");
    const { saveDestinationRecord } = await import("./index");
    const upsert = vi.fn(async ({ create }) => ({
      id: "destination_2",
      ...create,
    }));

    const record = await saveDestinationRecord(
      {
        connectionStatus: "CONNECTED",
        externalAccountId: "override-page-id",
        kind: "FACEBOOK_PAGE",
        name: "Override destination",
        pageId: "override-page-id",
        platform: "FACEBOOK",
        settingsJson: {
          useDestinationCredentialOverrides: true,
        },
        slug: "override-destination",
        token: "override-token",
      },
      {},
      {
        auditEvent: {
          create: vi.fn(),
        },
        destination: {
          upsert,
        },
      },
    );

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(record.externalAccountId).toBe("override-page-id");
    expect(record.settingsJson).toMatchObject({
      pageId: "override-page-id",
      useDestinationCredentialOverrides: true,
    });
    expect(
      decryptSecretValue({
        ciphertext: record.encryptedTokenCiphertext,
        iv: record.encryptedTokenIv,
        tag: record.encryptedTokenTag,
      }),
    ).toBe("override-token");
  });
});
