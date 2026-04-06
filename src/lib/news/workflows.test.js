import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("news workflow image resolution", () => {
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

  it("preserves provider image urls when one is already available", async () => {
    const { resolveFetchedArticleImageUrl } = await import("./workflows");

    await expect(
      resolveFetchedArticleImageUrl({
        imageUrl: "https://cdn.example.com/story.jpg",
        sourceUrl: "https://example.com/news/story",
      }),
    ).resolves.toBe("https://cdn.example.com/story.jpg");
  });

  it("falls back to source-page discovery when providers omit image urls", async () => {
    const discoverRemoteImageUrl = vi.fn().mockResolvedValue("https://cdn.example.com/discovered-story.jpg");

    vi.doMock("@/lib/media", async () => ({
      ...(await vi.importActual("@/lib/media")),
      discoverRemoteImageUrl,
    }));

    const { resolveFetchedArticleImageUrl } = await import("./workflows");

    await expect(
      resolveFetchedArticleImageUrl({
        imageUrl: null,
        sourceUrl: "https://example.com/news/story",
      }),
    ).resolves.toBe("https://cdn.example.com/discovered-story.jpg");
    expect(discoverRemoteImageUrl).toHaveBeenCalledWith("https://example.com/news/story");
  });
});

describe("social publishing guardrails", () => {
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

  it("blocks recently duplicated social stories for the same destination", async () => {
    const { applySocialPublishingGuardrails } = await import("./workflows");

    await expect(
      applySocialPublishingGuardrails({
        db: {
          publishAttempt: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: "attempt_1",
                payloadJson: {
                  canonicalUrl: "https://example.com/en/news/breaking-story",
                  destinationKind: "FACEBOOK_PAGE",
                  hashtags: "#news",
                  platform: "FACEBOOK",
                  summary: "Breaking story summary",
                  title: "Breaking story",
                },
                publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
              },
            ]),
          },
        },
        destination: {
          id: "destination_1",
          platform: "FACEBOOK",
        },
        payload: {
          canonicalUrl: "https://example.com/en/news/breaking-story",
          destinationKind: "FACEBOOK_PAGE",
          hashtags: "#news",
          platform: "FACEBOOK",
          sourceReference: "Source: Example Source - https://example.com/story",
          summary: "Breaking story summary",
          title: "Breaking story",
        },
      }),
    ).rejects.toMatchObject({
      status: "destination_policy_guardrail_blocked",
    });
  });

  it("trims Instagram hashtags to the configured safe maximum", async () => {
    const { applySocialPublishingGuardrails } = await import("./workflows");

    await expect(
      applySocialPublishingGuardrails({
        db: {
          publishAttempt: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        },
        destination: {
          id: "destination_1",
          platform: "INSTAGRAM",
        },
        payload: {
          canonicalUrl: "https://example.com/en/news/visual-story",
          destinationKind: "INSTAGRAM_BUSINESS",
          hashtags: "#one #two #three #four #five #six #seven #eight #nine",
          platform: "INSTAGRAM",
          sourceReference: "Source: Example Source - https://example.com/story",
          summary: "Visual story summary",
          title: "Visual story",
        },
      }),
    ).resolves.toMatchObject({
      adjustments: {
        instagramHashtagsTrimmedTo: 8,
      },
      payload: expect.objectContaining({
        hashtags: "#one #two #three #four #five #six #seven #eight",
      }),
    });
  });
});
