import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("news publishers", () => {
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
  });

  it("publishes facebook page posts with photo payloads when media is available", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { publishExternalDestination } = await import("./publishers");
    const encryptedToken = encryptSecretValue("facebook-token");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: "photo_1", post_id: "page_post_1" }),
      })),
    );

    const result = await publishExternalDestination({
      destination: {
        encryptedTokenCiphertext: encryptedToken.ciphertext,
        encryptedTokenIv: encryptedToken.iv,
        encryptedTokenTag: encryptedToken.tag,
        externalAccountId: "123456",
        kind: "FACEBOOK_PAGE",
        platform: "FACEBOOK",
        settingsJson: {},
      },
      payload: {
        canonicalUrl: "https://example.com/en/news/breaking-story",
        mediaUrl: "https://cdn.example.com/story.jpg",
        sourceReference: "Source: Example Source - https://example.com/story",
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(`${fetch.mock.calls[0][0]}`).toContain("/123456");
    expect(`${fetch.mock.calls[1][0]}`).toContain("/123456/photos");
    expect(result).toMatchObject({
      remoteId: "page_post_1",
      responseJson: expect.objectContaining({
        channel: "facebook_photo",
      }),
    });
  });

  it("falls back to the facebook feed endpoint when photo publication fails", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { publishExternalDestination } = await import("./publishers");
    const encryptedToken = encryptSecretValue("facebook-token");

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "123456", name: "Example Page" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ error: { message: "Image rejected" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "feed_post_1" }),
        }),
    );

    const result = await publishExternalDestination({
      destination: {
        encryptedTokenCiphertext: encryptedToken.ciphertext,
        encryptedTokenIv: encryptedToken.iv,
        encryptedTokenTag: encryptedToken.tag,
        externalAccountId: "123456",
        kind: "FACEBOOK_PAGE",
        platform: "FACEBOOK",
        settingsJson: {},
      },
      payload: {
        canonicalUrl: "https://example.com/en/news/breaking-story",
        mediaUrl: "https://cdn.example.com/story.jpg",
        sourceReference: "Source: Example Source - https://example.com/story",
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(`${fetch.mock.calls[2][0]}`).toContain("/123456/feed");
    expect(result).toMatchObject({
      remoteId: "feed_post_1",
      responseJson: expect.objectContaining({
        channel: "facebook_feed_fallback",
      }),
    });
  });

  it("publishes instagram business posts through the media container flow", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { publishExternalDestination } = await import("./publishers");
    const encryptedToken = encryptSecretValue("instagram-token");

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              account_type: "BUSINESS",
              id: "789012",
              username: "example.business",
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "container_1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "ig_media_1" }),
        }),
    );

    const result = await publishExternalDestination({
      destination: {
        encryptedTokenCiphertext: encryptedToken.ciphertext,
        encryptedTokenIv: encryptedToken.iv,
        encryptedTokenTag: encryptedToken.tag,
        externalAccountId: "789012",
        kind: "INSTAGRAM_BUSINESS",
        platform: "INSTAGRAM",
        settingsJson: {},
      },
      payload: {
        canonicalUrl: "https://example.com/en/news/breaking-story",
        hashtags: "#breaking #technology",
        mediaUrl: "https://cdn.example.com/story.jpg",
        sourceReference: "Source: Example Source - https://example.com/story",
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(`${fetch.mock.calls[1][0]}`).toContain("/789012/media");
    expect(`${fetch.mock.calls[2][0]}`).toContain("/789012/media_publish");
    expect(result).toMatchObject({
      remoteId: "ig_media_1",
      responseJson: expect.objectContaining({
        channel: "instagram_media_publish",
      }),
    });
  });

  it("resolves Meta destination credentials from environment variables and adds app secret proof", async () => {
    process.env = {
      ...process.env,
      META_APP_ID: "1234567890",
      META_APP_SECRET: "meta-secret",
      META_DESTINATION_CREDENTIALS_JSON: JSON.stringify({
        "facebook-page": {
          accessToken: "env-facebook-token",
          pageId: "123456789012345",
        },
      }),
    };

    vi.resetModules();

    const { publishExternalDestination } = await import("./publishers");

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
          text: async () => JSON.stringify({ id: "123456789012345", name: "Env Page" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "feed_post_1" }),
        }),
    );

    const result = await publishExternalDestination({
      destination: {
        externalAccountId: "stale-page-id",
        kind: "FACEBOOK_PAGE",
        platform: "FACEBOOK",
        settingsJson: {},
        slug: "facebook-page",
      },
      payload: {
        canonicalUrl: "https://example.com/en/news/breaking-story",
        mediaUrl: null,
        sourceReference: "Source: Example Source - https://example.com/story",
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(`${fetch.mock.calls[0][0]}`).toContain("/debug_token");
    expect(`${fetch.mock.calls[1][0]}`).toContain("/123456789012345");
    expect(`${fetch.mock.calls[2][0]}`).toContain("/123456789012345/feed");
    expect(`${fetch.mock.calls[2][1].body}`).toContain("appsecret_proof=");
    expect(result).toMatchObject({
      remoteId: "feed_post_1",
      responseJson: expect.objectContaining({
        channel: "facebook_feed",
        targetId: "123456789012345",
      }),
    });
  });

  it("rejects facebook profile destinations before attempting to publish", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { publishExternalDestination } = await import("./publishers");
    const encryptedToken = encryptSecretValue("facebook-token");

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      publishExternalDestination({
        destination: {
          encryptedTokenCiphertext: encryptedToken.ciphertext,
          encryptedTokenIv: encryptedToken.iv,
          encryptedTokenTag: encryptedToken.tag,
          externalAccountId: "me",
          kind: "FACEBOOK_PROFILE",
          platform: "FACEBOOK",
          settingsJson: {
            profileId: "me",
          },
        },
        payload: {
          canonicalUrl: "https://example.com/en/news/breaking-story",
          sourceReference: "Source: Example Source - https://example.com/story",
          summary: "Breaking story summary",
          title: "Breaking story",
        },
      }),
    ).rejects.toMatchObject({
      status: "facebook_profile_not_supported",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects instagram destinations that are not professional accounts", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { publishExternalDestination } = await import("./publishers");
    const encryptedToken = encryptSecretValue("instagram-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            account_type: "PERSONAL",
            id: "789012",
            username: "example.personal",
          }),
      }),
    );

    await expect(
      publishExternalDestination({
        destination: {
          encryptedTokenCiphertext: encryptedToken.ciphertext,
          encryptedTokenIv: encryptedToken.iv,
          encryptedTokenTag: encryptedToken.tag,
          externalAccountId: "789012",
          kind: "INSTAGRAM_BUSINESS",
          platform: "INSTAGRAM",
          settingsJson: {},
        },
        payload: {
          canonicalUrl: "https://example.com/en/news/breaking-story",
          hashtags: "#breaking #technology",
          mediaUrl: "https://cdn.example.com/story.jpg",
          sourceReference: "Source: Example Source - https://example.com/story",
          summary: "Breaking story summary",
          title: "Breaking story",
        },
      }),
    ).rejects.toMatchObject({
      status: "instagram_professional_account_required",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(`${fetch.mock.calls[0][0]}`).toContain("/789012");
  });
});
