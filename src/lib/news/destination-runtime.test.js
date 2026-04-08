import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("destination runtime resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("treats stored destination credentials as publish-ready even when the saved status is stale", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { resolveDestinationRuntimeConnection } = await import("./destination-runtime");
    const encryptedToken = encryptSecretValue("stored-token");

    const resolved = resolveDestinationRuntimeConnection({
      connectionStatus: "DISCONNECTED",
      encryptedTokenCiphertext: encryptedToken.ciphertext,
      encryptedTokenIv: encryptedToken.iv,
      encryptedTokenTag: encryptedToken.tag,
      externalAccountId: "stale-external-id",
      platform: "FACEBOOK",
      settingsJson: {
        pageId: "999999999999999",
      },
      slug: "facebook-page",
    });

    expect(resolved).toMatchObject({
      accessToken: "stored-token",
      accountId: "stale-external-id",
      effectiveConnectionStatus: "CONNECTED",
      hasCompleteEnvCredentials: false,
      hasRuntimeCredentials: true,
      isReadyToPublish: true,
      metaAuthStrategy: "legacy-stored-token-fallback",
      usesEnvCredentials: false,
    });
  });

  it("derives a connected runtime state from stored Meta credentials", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { resolveDestinationRuntimeConnection } = await import("./destination-runtime");
    const encryptedToken = encryptSecretValue("stored-token");

    const resolved = resolveDestinationRuntimeConnection({
      connectionStatus: "DISCONNECTED",
      encryptedTokenCiphertext: encryptedToken.ciphertext,
      encryptedTokenIv: encryptedToken.iv,
      encryptedTokenTag: encryptedToken.tag,
      platform: "FACEBOOK",
      settingsJson: {
        pageId: "123456789012345",
      },
      slug: "facebook-page",
    });

    expect(resolved).toMatchObject({
      accessToken: "stored-token",
      accountId: "123456789012345",
      effectiveConnectionStatus: "CONNECTED",
      hasCompleteEnvCredentials: false,
      hasRuntimeCredentials: true,
      isReadyToPublish: true,
      metaAuthStrategy: "legacy-stored-token-fallback",
      usesEnvCredentials: false,
    });
  });

  it("uses stored override values when a destination was saved with them", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { resolveDestinationRuntimeConnection } = await import("./destination-runtime");
    const encryptedToken = encryptSecretValue("override-token");

    const resolved = resolveDestinationRuntimeConnection({
      connectionStatus: "CONNECTED",
      encryptedTokenCiphertext: encryptedToken.ciphertext,
      encryptedTokenIv: encryptedToken.iv,
      encryptedTokenTag: encryptedToken.tag,
      externalAccountId: "override-page-id",
      platform: "FACEBOOK",
      settingsJson: {
        pageId: "override-page-id",
        useDestinationCredentialOverrides: true,
      },
      slug: "facebook-page",
    });

    expect(resolved).toMatchObject({
      accessToken: "override-token",
      accountId: "override-page-id",
      metaAuthStrategy: "legacy-stored-token-fallback",
      pageId: "override-page-id",
      usesDestinationCredentialOverrides: true,
      usesEnvCredentials: false,
    });
  });

  it("marks unreadable stored destination tokens as an error without throwing", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { resolveDestinationRuntimeConnection } = await import("./destination-runtime");
    const encryptedToken = encryptSecretValue("legacy-token", "previous-encryption-key");

    const resolved = resolveDestinationRuntimeConnection({
      connectionStatus: "CONNECTED",
      encryptedTokenCiphertext: encryptedToken.ciphertext,
      encryptedTokenIv: encryptedToken.iv,
      encryptedTokenTag: encryptedToken.tag,
      externalAccountId: "page_1",
      platform: "FACEBOOK",
      settingsJson: {
        pageId: "page_1",
      },
      slug: "facebook-page",
    });

    expect(resolved).toMatchObject({
      accessToken: null,
      accountId: "page_1",
      credentialError: expect.stringContaining("could not be decrypted"),
      effectiveConnectionStatus: "ERROR",
      hasRuntimeCredentials: false,
      isReadyToPublish: false,
      metaAuthStrategy: null,
    });
  });

  it("falls back to META_USER_ACCESS_TOKEN when no destination token is stored", async () => {
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv({
        META_USER_ACCESS_TOKEN: "env-user-token",
      }),
    };

    vi.resetModules();

    const { resolveDestinationRuntimeConnection } = await import("./destination-runtime");

    const resolved = resolveDestinationRuntimeConnection({
      connectionStatus: "DISCONNECTED",
      externalAccountId: "env-page-id",
      platform: "FACEBOOK",
      settingsJson: {},
      slug: "facebook-page",
    });

    expect(resolved).toMatchObject({
      accessToken: null,
      accountId: "env-page-id",
      effectiveConnectionStatus: "CONNECTED",
      hasCompleteEnvCredentials: true,
      hasRuntimeCredentials: true,
      isReadyToPublish: true,
      metaAuthStrategy: "refreshable-user-derived",
      usesEnvCredentials: true,
    });
  });

  it("prefers the system-user strategy for facebook page automation when configured", async () => {
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv({
        META_SYSTEM_USER_ACCESS_TOKEN: "system-user-token",
        META_USER_ACCESS_TOKEN: "env-user-token",
      }),
    };

    vi.resetModules();

    const { resolveDestinationRuntimeConnection } = await import("./destination-runtime");

    const resolved = resolveDestinationRuntimeConnection({
      connectionStatus: "DISCONNECTED",
      externalAccountId: "env-page-id",
      platform: "FACEBOOK",
      settingsJson: {
        pageId: "env-page-id",
      },
      slug: "facebook-page",
    });

    expect(resolved).toMatchObject({
      accessToken: "system-user-token",
      accountId: "env-page-id",
      metaAuthStrategy: "system-user",
    });
  });
});
