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

  it("relies on stored destination credentials for Meta publishing", async () => {
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
      effectiveConnectionStatus: "DISCONNECTED",
      hasCompleteEnvCredentials: false,
      hasRuntimeCredentials: true,
      isReadyToPublish: false,
      usesEnvCredentials: false,
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
      pageId: "override-page-id",
      usesDestinationCredentialOverrides: false,
      usesEnvCredentials: false,
    });
  });
});
