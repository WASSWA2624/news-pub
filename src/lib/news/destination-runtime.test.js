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

  it("prefers env-backed Meta destination credentials over stored values", async () => {
    process.env.META_DESTINATION_CREDENTIALS_JSON = JSON.stringify({
      "facebook-page": {
        accessToken: "env-token",
        pageId: "123456789012345",
      },
    });

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
      accessToken: "env-token",
      accountId: "123456789012345",
      effectiveConnectionStatus: "CONNECTED",
      hasRuntimeCredentials: true,
      isReadyToPublish: true,
      usesEnvCredentials: true,
    });
  });

  it("does not bypass a disconnected destination when env config only overrides the account id", async () => {
    process.env.META_DESTINATION_CREDENTIALS_JSON = JSON.stringify({
      "facebook-page": {
        pageId: "123456789012345",
      },
    });

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
      settingsJson: {},
      slug: "facebook-page",
    });

    expect(resolved).toMatchObject({
      accessToken: "stored-token",
      accountId: "123456789012345",
      effectiveConnectionStatus: "DISCONNECTED",
      hasCompleteEnvCredentials: false,
      hasRuntimeCredentials: true,
      isReadyToPublish: false,
      usesEnvCredentials: true,
    });
  });

  it("keeps stored tokens gated behind the persisted connection status", async () => {
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
      effectiveConnectionStatus: "DISCONNECTED",
      hasCompleteEnvCredentials: false,
      hasRuntimeCredentials: true,
      isReadyToPublish: false,
      usesEnvCredentials: false,
    });
  });
});
