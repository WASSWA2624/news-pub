import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createImagePlaceholderDataUrl,
  discoverRemoteImageUrl,
  extractRemoteImageUrlFromHtml,
  getRenderableImageUrl,
  isReservedFixtureImageUrl,
} from "./index";

describe("media placeholder helpers", () => {
  it("detects reserved fixture image hosts", () => {
    expect(isReservedFixtureImageUrl("https://fixtures.example/images/microscope-bench.jpg")).toBe(true);
    expect(isReservedFixtureImageUrl("https://media.equipblog.com/images/microscope-bench.jpg")).toBe(false);
  });

  it("creates a data uri placeholder", () => {
    expect(
      createImagePlaceholderDataUrl({
        alt: "Bench microscope prepared for laboratory inspection.",
        caption: "Fixture image metadata for baseline acceptance testing.",
      }),
    ).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
  });

  it("maps reserved fixture urls to a renderable placeholder", () => {
    const resolvedUrl = getRenderableImageUrl("https://fixtures.example/images/microscope-bench.jpg", {
      alt: "Bench microscope prepared for laboratory inspection.",
      caption: "Fixture image metadata for baseline acceptance testing.",
    });

    expect(resolvedUrl).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
  });

  it("preserves normal media urls", () => {
    expect(
      getRenderableImageUrl("https://media.equipblog.com/images/microscope-bench.jpg", {
        alt: "Bench microscope prepared for laboratory inspection.",
      }),
    ).toBe("https://media.equipblog.com/images/microscope-bench.jpg");
  });

  it("drops unsafe image urls instead of rendering them", () => {
    expect(getRenderableImageUrl("javascript:alert(1)")).toBe("");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts remote article images from meta tags regardless of attribute order", () => {
    const html = `
      <html>
        <head>
          <meta content="/images/story-cover.jpg" property="og:image" />
          <meta name="twitter:image" content="https://cdn.example.com/story-share.jpg" />
        </head>
      </html>
    `;

    expect(extractRemoteImageUrlFromHtml(html, "https://example.com/news/story")).toBe(
      "https://example.com/images/story-cover.jpg",
    );
  });

  it("extracts remote article images from JSON-LD when meta tags are missing", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "NewsArticle",
              "image": [
                {
                  "@type": "ImageObject",
                  "url": "https://cdn.example.com/jsonld-story.jpg"
                }
              ]
            }
          </script>
        </head>
      </html>
    `;

    expect(extractRemoteImageUrlFromHtml(html, "https://example.com/news/story")).toBe(
      "https://cdn.example.com/jsonld-story.jpg",
    );
  });

  it("discovers remote article images by fetching source html", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html>
          <head>
            <meta property="og:image" content="https://cdn.example.com/discovered-story.jpg" />
          </head>
        </html>
      `,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(discoverRemoteImageUrl("https://example.com/news/story")).resolves.toBe(
      "https://cdn.example.com/discovered-story.jpg",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/news/story",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "text/html,application/xhtml+xml",
        }),
        redirect: "follow",
      }),
    );
  });
});
