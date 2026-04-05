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

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(`${fetch.mock.calls[0][0]}`).toContain("/123456/photos");
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

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(`${fetch.mock.calls[1][0]}`).toContain("/123456/feed");
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

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(`${fetch.mock.calls[0][0]}`).toContain("/789012/media");
    expect(`${fetch.mock.calls[1][0]}`).toContain("/789012/media_publish");
    expect(result).toMatchObject({
      remoteId: "ig_media_1",
      responseJson: expect.objectContaining({
        channel: "instagram_media_publish",
      }),
    });
  });
});
