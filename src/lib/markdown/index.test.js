import { describe, expect, it } from "vitest";

import {
  buildHtmlFromStructuredArticle,
  buildMarkdownFromStructuredArticle,
} from "./index";

describe("markdown rendering", () => {
  it("strips unsafe reference URLs from rendered artifacts", () => {
    const article = {
      excerpt: "Story excerpt",
      sections: [
        {
          id: "source_attribution",
          items: [
            {
              title: "Unsafe source",
              url: "javascript:alert(1)",
            },
            {
              title: "Safe source",
              url: "https://example.com/story",
            },
          ],
          kind: "references",
          title: "Source Attribution",
        },
      ],
      title: "Breaking story",
    };

    const markdown = buildMarkdownFromStructuredArticle(article);
    const html = buildHtmlFromStructuredArticle(article);

    expect(markdown).not.toContain("javascript:");
    expect(markdown).toContain("[Safe source](https://example.com/story)");
    expect(markdown).toContain("Unsafe source");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://example.com/story"');
    expect(html).toContain(">Unsafe source<");
  });

  it("renders image-gallery and reference intros in markdown and html output", () => {
    const article = {
      excerpt: "Story excerpt",
      sections: [
        {
          id: "featured_visual",
          images: [
            {
              alt: "Breaking story image",
              caption: "Lead image",
              url: "https://example.com/story.jpg",
            },
          ],
          intro: "These visuals support the published report.",
          kind: "image_gallery",
          title: "Featured Visual",
        },
        {
          id: "source_attribution",
          intro: "Original sourcing is retained for publication compliance.",
          items: [
            {
              title: "Example Source",
              url: "https://example.com/story",
            },
          ],
          kind: "references",
          title: "Source Attribution",
        },
      ],
      title: "Breaking story",
    };

    const markdown = buildMarkdownFromStructuredArticle(article);
    const html = buildHtmlFromStructuredArticle(article);

    expect(markdown).toContain("These visuals support the published report.");
    expect(markdown).toContain("Original sourcing is retained for publication compliance.");
    expect(html).toContain("<p>These visuals support the published report.</p>");
    expect(html).toContain("<p>Original sourcing is retained for publication compliance.</p>");
  });

  it("renders image galleries from sourceUrl fallback fields", () => {
    const article = {
      excerpt: "Story excerpt",
      sections: [
        {
          id: "featured_image",
          images: [
            {
              alt: "Story image",
              caption: "Prepared for publication",
              sourceUrl: "https://fixtures.example/images/story-image.jpg",
            },
          ],
          kind: "image_gallery",
          title: "Featured Image",
        },
      ],
      title: "Breaking story",
    };

    const markdown = buildMarkdownFromStructuredArticle(article);
    const html = buildHtmlFromStructuredArticle(article);

    expect(markdown).not.toContain("(undefined)");
    expect(markdown).toContain("![Story image](data:image/svg+xml;charset=UTF-8,");
    expect(html).not.toContain('src="undefined"');
    expect(html).toContain('src="data:image/svg+xml;charset=UTF-8,');
  });
});
