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

  it("persists a discovered Meta page selection as destination identity metadata without storing a token by default", async () => {
    process.env.META_USER_ACCESS_TOKEN = "env-user-token";

    vi.stubGlobal(
      "fetch",
      vi.fn()
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

    const { saveDestinationRecord } = await import("./index");
    const upsert = vi.fn(async ({ create }) => ({
      id: "destination_1",
      ...create,
    }));

    const record = await saveDestinationRecord(
      {
        connection_status: "CONNECTED",
        kind: "FACEBOOK_PAGE",
        metaDiscoverySourceKey: "env:meta-user-access-token",
        metaDiscoveryTargetId: "page_1",
        metaDiscoveryTargetType: "FACEBOOK_PAGE",
        name: "Example destination",
        platform: "FACEBOOK",
        settings_json: {},
        slug: "example-destination",
      },
      {},
      {
        auditEvent: {
          create: vi.fn(),
        },
        destination: {
          findUnique: vi.fn(async () => null),
          upsert,
        },
      },
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(record.external_account_id).toBe("page_1");
    expect(record.settings_json).toMatchObject({
      metaAuthStrategy: "refreshable-user-derived",
      metaCredentialSourceKey: "env:meta-user-access-token",
      pageId: "page_1",
    });
    expect(record.token_hint).toBeNull();
    expect(record.encrypted_token_ciphertext).toBeNull();
    expect(record.encrypted_token_iv).toBeNull();
    expect(record.encrypted_token_tag).toBeNull();
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
        connection_status: "CONNECTED",
        external_account_id: "override-page-id",
        kind: "FACEBOOK_PAGE",
        name: "Override destination",
        pageId: "override-page-id",
        platform: "FACEBOOK",
        settings_json: {
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
          findUnique: vi.fn(async () => null),
          upsert,
        },
      },
    );

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(record.external_account_id).toBe("override-page-id");
    expect(record.settings_json).toMatchObject({
      metaAuthStrategy: "legacy-stored-token-fallback",
      pageId: "override-page-id",
      useDestinationCredentialOverrides: true,
    });
    expect(
      decryptSecretValue({
        ciphertext: record.encrypted_token_ciphertext,
        iv: record.encrypted_token_iv,
        tag: record.encrypted_token_tag,
      }),
    ).toBe("override-token");
  });

  it("keeps the destination snapshot available when a stored token can no longer be decrypted", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { getDestinationManagementSnapshot } = await import("./index");
    const encryptedToken = encryptSecretValue("legacy-token", "previous-encryption-key");

    const snapshot = await getDestinationManagementSnapshot({
      destination: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            _count: {
              articleMatches: 0,
              publishAttempts: 0,
              streams: 0,
            },
            connection_error: null,
            connection_status: "CONNECTED",
            encrypted_token_ciphertext: encryptedToken.ciphertext,
            encrypted_token_iv: encryptedToken.iv,
            encrypted_token_tag: encryptedToken.tag,
            external_account_id: "page_1",
            id: "destination_legacy_1",
            kind: "FACEBOOK_PAGE",
            name: "Legacy Facebook Page",
            platform: "FACEBOOK",
            settings_json: {
              pageId: "page_1",
            },
            slug: "legacy-facebook-page",
            streams: [],
          },
        ]),
      },
    });

    expect(snapshot.destinations[0]).toMatchObject({
      connection_error: expect.stringContaining("could not be decrypted"),
      effectiveConnectionStatus: "ERROR",
      hasStoredToken: true,
      name: "Legacy Facebook Page",
    });
    expect(snapshot.destinations[0].validationIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "destination_stored_token_unreadable",
          severity: "error",
        }),
      ]),
    );
    expect(snapshot.summary).toMatchObject({
      connectedCount: 0,
      errorCount: 1,
      totalCount: 1,
    });
  });

  it("deletes destinations when they have no linked streams or publish history", async () => {
    const { deleteDestinationRecord } = await import("./index");
    const deleteMock = vi.fn(async ({ where }) => ({
      id: where.id,
      kind: "FACEBOOK_PAGE",
      platform: "FACEBOOK",
      slug: "delete-me",
    }));

    const record = await deleteDestinationRecord(
      "destination_3",
      {},
      {
        auditEvent: {
          create: vi.fn(),
        },
        destination: {
          delete: deleteMock,
          findUnique: vi.fn(async () => ({
            articleMatches: [],
            id: "destination_3",
            name: "Delete Me",
            publishAttempts: [],
            slug: "delete-me",
            streams: [],
          })),
        },
      },
    );

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(record).toMatchObject({
      id: "destination_3",
      slug: "delete-me",
    });
  });

  it("deletes destinations even when linked streams exist", async () => {
    const { deleteDestinationRecord } = await import("./index");
    const deleteMock = vi.fn(async ({ where }) => ({
      id: where.id,
      kind: "FACEBOOK_PAGE",
      platform: "FACEBOOK",
      slug: "active-destination",
    }));

    const record = await deleteDestinationRecord(
      "destination_4",
      {},
      {
        auditEvent: {
          create: vi.fn(),
        },
        destination: {
          delete: deleteMock,
          findUnique: vi.fn(async () => ({
            articleMatches: [],
            id: "destination_4",
            name: "Active Destination",
            publishAttempts: [],
            slug: "active-destination",
            streams: [{ id: "stream_1", name: "Main Stream" }],
          })),
        },
      },
    );

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(record).toMatchObject({
      id: "destination_4",
      slug: "active-destination",
    });
  });

  it("deletes destinations even when publishing history exists", async () => {
    const { deleteDestinationRecord } = await import("./index");
    const deleteMock = vi.fn(async ({ where }) => ({
      id: where.id,
      kind: "FACEBOOK_PAGE",
      platform: "FACEBOOK",
      slug: "historical-destination",
    }));

    const record = await deleteDestinationRecord(
      "destination_5",
      {},
      {
        auditEvent: {
          create: vi.fn(),
        },
        destination: {
          delete: deleteMock,
          findUnique: vi.fn(async () => ({
            articleMatches: [{ id: "match_1" }],
            id: "destination_5",
            name: "Historical Destination",
            publishAttempts: [],
            slug: "historical-destination",
            streams: [],
          })),
        },
      },
    );

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(record).toMatchObject({
      id: "destination_5",
      slug: "historical-destination",
    });
  });
});
