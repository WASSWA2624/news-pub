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

  it("formats polished Facebook messages from the rendered body, canonical CTA, and source attribution", async () => {
    const { buildFacebookMessage } = await import("./publishers");

    const message = buildFacebookMessage({
      body: [
        "Breaking story",
        "",
        "Lead paragraph from the rendered template body.",
        "",
        "Read more: https://example.com/en/news/breaking-story",
        "",
        "Source: Example Source - https://example.com/story",
      ].join("\n"),
      canonicalUrl: "https://example.com/en/news/breaking-story",
      sourceReference: "Source: Example Source - https://example.com/story",
      summary: "Breaking story summary",
      title: "Breaking story",
    });

    expect(message).toBe(
      [
        "【Breaking story】",
        "Lead paragraph from the rendered template body.",
        "Read more: https://example.com/en/news/breaking-story",
        "Source: Example Source - https://example.com/story",
      ].join("\n\n"),
    );
  });

  it("places the optional stream link directly below the Facebook title when requested", async () => {
    const { buildFacebookMessage } = await import("./publishers");

    const message = buildFacebookMessage({
      body: "Rendered body copy from the template.",
      canonicalUrl: "https://example.com/en/news/breaking-story",
      extraLinkPlacement: "BELOW_TITLE",
      extraLinkUrl: "https://example.com/promo",
      sourceReference: "Source: Example Source - https://example.com/story",
      summary: "Breaking story summary",
      title: "Breaking story",
    });

    expect(message).toBe(
      [
        "【Breaking story】",
        "https://example.com/promo",
        "Rendered body copy from the template.",
        "Read more: https://example.com/en/news/breaking-story",
        "Source: Example Source - https://example.com/story",
      ].join("\n\n"),
    );
  });

  it("places the optional stream link at the end of the Facebook message when requested", async () => {
    const { buildFacebookMessage } = await import("./publishers");

    const message = buildFacebookMessage({
      body: "Rendered body copy from the template.",
      canonicalUrl: "https://example.com/en/news/breaking-story",
      extraLinkPlacement: "END",
      extraLinkUrl: "https://example.com/promo",
      sourceReference: "Source: Example Source - https://example.com/story",
      summary: "Breaking story summary",
      title: "Breaking story",
    });

    expect(message).toBe(
      [
        "【Breaking story】",
        "Rendered body copy from the template.",
        "Read more: https://example.com/en/news/breaking-story",
        "https://example.com/promo",
        "Source: Example Source - https://example.com/story",
      ].join("\n\n"),
    );
  });

  it("resolves RANDOM Facebook link placement at publish time", async () => {
    const { buildFacebookMessage } = await import("./publishers");

    vi.spyOn(Math, "random").mockReturnValue(0.1);

    const message = buildFacebookMessage({
      body: "Rendered body copy from the template.",
      canonicalUrl: "https://example.com/en/news/breaking-story",
      extraLinkPlacement: "RANDOM",
      extraLinkUrl: "https://example.com/promo",
      sourceReference: "Source: Example Source - https://example.com/story",
      summary: "Breaking story summary",
      title: "Breaking story",
    });

    expect(message).toContain("【Breaking story】\n\nhttps://example.com/promo");
  });

  it("avoids duplicate blank sections and repeated Facebook link sections", async () => {
    const { buildFacebookMessage } = await import("./publishers");

    const message = buildFacebookMessage({
      body: "\n\nBreaking story summary\n\n",
      canonicalUrl: "https://example.com/en/news/breaking-story",
      extraLinkPlacement: "END",
      extraLinkUrl: "https://example.com/en/news/breaking-story",
      sourceReference: "Source: Example Source - https://example.com/story",
      summary: "Breaking story summary",
      title: "Breaking story",
    });

    expect(message).toBe(
      [
        "【Breaking story】",
        "Breaking story summary",
        "Read more: https://example.com/en/news/breaking-story",
        "Source: Example Source - https://example.com/story",
      ].join("\n\n"),
    );
    expect(message).not.toContain("\n\n\n");
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

  it("converts relative facebook media paths into absolute app urls before publishing", async () => {
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
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "photo_1", post_id: "page_post_1" }),
        }),
    );

    await publishExternalDestination({
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
        mediaUrl: "/uploads/media/story.jpg",
        sourceReference: "Source: Example Source - https://example.com/story",
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].body.get("url")).toBe("https://example.com/uploads/media/story.jpg");
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

  it("publishes using stored destination credentials without app-secret validation", async () => {
    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { publishExternalDestination } = await import("./publishers");
    const encryptedToken = encryptSecretValue("env-facebook-token");
    vi.stubGlobal(
      "fetch",
      vi.fn()
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
        encryptedTokenCiphertext: encryptedToken.ciphertext,
        encryptedTokenIv: encryptedToken.iv,
        encryptedTokenTag: encryptedToken.tag,
        externalAccountId: "123456789012345",
        kind: "FACEBOOK_PAGE",
        platform: "FACEBOOK",
        settingsJson: {},
      },
      payload: {
        canonicalUrl: "https://example.com/en/news/breaking-story",
        mediaUrl: null,
        sourceReference: "Source: Example Source - https://example.com/story",
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(`${fetch.mock.calls[0][0]}`).toContain("/123456789012345");
    expect(`${fetch.mock.calls[1][0]}`).toContain("/123456789012345/feed");
    expect(result).toMatchObject({
      remoteId: "feed_post_1",
      responseJson: expect.objectContaining({
        channel: "facebook_feed",
        targetId: "123456789012345",
      }),
    });
  });

  it("publishes facebook feed posts from localhost without sending an unreachable link", async () => {
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    };

    vi.resetModules();

    const { encryptSecretValue } = await import("@/lib/security/secrets");
    const { publishExternalDestination } = await import("./publishers");
    const encryptedToken = encryptSecretValue("facebook-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: "123456789012345", name: "Local Page" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: "feed_post_local_1" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await publishExternalDestination({
      destination: {
        encryptedTokenCiphertext: encryptedToken.ciphertext,
        encryptedTokenIv: encryptedToken.iv,
        encryptedTokenTag: encryptedToken.tag,
        externalAccountId: "123456789012345",
        kind: "FACEBOOK_PAGE",
        platform: "FACEBOOK",
        settingsJson: {},
      },
      payload: {
        canonicalUrl: "http://localhost:3000/en/news/breaking-story",
        mediaUrl: "/uploads/media/story.jpg",
        sourceReference: "Source: Example Source - https://example.com/story",
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(`${fetchMock.mock.calls[1][0]}`).toContain("/123456789012345/feed");
    expect(fetchMock.mock.calls[1][1].body.get("link")).toBeNull();
    expect(fetchMock.mock.calls[1][1].body.get("message")).toContain(
      "http://localhost:3000/en/news/breaking-story",
    );
    expect(result).toMatchObject({
      remoteId: "feed_post_local_1",
      responseJson: expect.objectContaining({
        channel: "facebook_feed",
        targetId: "123456789012345",
      }),
    });
  });

  it("falls back to META_USER_ACCESS_TOKEN when the destination token is missing", async () => {
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv({
        META_USER_ACCESS_TOKEN: "env-user-token",
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
          text: async () =>
            JSON.stringify({
              data: [
                {
                  access_token: "fresh-page-token",
                  id: "123456789012345",
                  name: "Env Page",
                  tasks: ["CREATE_CONTENT", "MANAGE", "MODERATE"],
                  username: "env.page",
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "123456789012345", name: "Env Page" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "feed_post_env_1" }),
        }),
    );

    const result = await publishExternalDestination({
      destination: {
        connectionStatus: "DISCONNECTED",
        externalAccountId: "123456789012345",
        kind: "FACEBOOK_PAGE",
        platform: "FACEBOOK",
        settingsJson: {},
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
    expect(fetch.mock.calls[0][0].searchParams.get("access_token")).toBe("env-user-token");
    expect(fetch.mock.calls[2][1].body.get("access_token")).toBe("fresh-page-token");
    expect(result).toMatchObject({
      remoteId: "feed_post_env_1",
      responseJson: expect.objectContaining({
        channel: "facebook_feed",
        targetId: "123456789012345",
      }),
    });
    expect(JSON.stringify(result.responseJson)).not.toContain("fresh-page-token");
  });

  it("publishes facebook page posts with META_SYSTEM_USER_ACCESS_TOKEN and no stored destination token", async () => {
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv({
        META_SYSTEM_USER_ACCESS_TOKEN: "system-user-token",
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
          text: async () => JSON.stringify({ id: "123456789012345", name: "System Page" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "feed_post_system_1" }),
        }),
    );

    const result = await publishExternalDestination({
      destination: {
        externalAccountId: "123456789012345",
        kind: "FACEBOOK_PAGE",
        platform: "FACEBOOK",
        settingsJson: {
          pageId: "123456789012345",
        },
      },
      payload: {
        canonicalUrl: "https://example.com/en/news/breaking-story",
        sourceReference: "Source: Example Source - https://example.com/story",
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0].searchParams.get("access_token")).toBe("system-user-token");
    expect(fetch.mock.calls[1][1].body.get("access_token")).toBe("system-user-token");
    expect(result.remoteId).toBe("feed_post_system_1");
  });

  it("re-resolves facebook credentials after a token-expired verify failure and retries once", async () => {
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv({
        META_USER_ACCESS_TOKEN: "env-user-token",
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
          text: async () =>
            JSON.stringify({
              data: [
                {
                  access_token: "stale-page-token",
                  id: "123456789012345",
                  name: "Env Page",
                  tasks: ["CREATE_CONTENT", "MANAGE", "MODERATE"],
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ error: { code: 190, message: "Invalid OAuth 2.0 Access Token" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [
                {
                  access_token: "fresh-page-token",
                  id: "123456789012345",
                  name: "Env Page",
                  tasks: ["CREATE_CONTENT", "MANAGE", "MODERATE"],
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "123456789012345", name: "Env Page" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: "feed_post_retry_1" }),
        }),
    );

    const result = await publishExternalDestination({
      destination: {
        externalAccountId: "123456789012345",
        id: "destination_retry_1",
        kind: "FACEBOOK_PAGE",
        platform: "FACEBOOK",
        settingsJson: {
          metaCredentialSourceKey: "env:meta-user-access-token",
          pageId: "123456789012345",
        },
      },
      payload: {
        canonicalUrl: "https://example.com/en/news/breaking-story",
        sourceReference: "Source: Example Source - https://example.com/story",
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    });

    expect(fetch).toHaveBeenCalledTimes(5);
    expect(fetch.mock.calls[4][1].body.get("access_token")).toBe("fresh-page-token");
    expect(result.remoteId).toBe("feed_post_retry_1");
  });

  it("returns a precise actionable error when facebook credential refresh is impossible", async () => {
    const { publishExternalDestination } = await import("./publishers");

    await expect(
      publishExternalDestination({
        destination: {
          externalAccountId: "123456789012345",
          kind: "FACEBOOK_PAGE",
          platform: "FACEBOOK",
          settingsJson: {
            pageId: "123456789012345",
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
      status: "destination_meta_env_missing",
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
