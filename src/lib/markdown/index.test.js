import { describe, expect, it } from "vitest";

import {
  buildHtmlFromStructuredArticle,
  buildMarkdownFromStructuredArticle,
} from "./index";

describe("markdown rendering", () => {
  it("strips unsafe manual and reference URLs from rendered artifacts", () => {
    const article = {
      excerpt: "Microscope excerpt",
      sections: [
        {
          id: "manuals_and_technical_documents",
          items: [
            {
              title: "Unsafe manual",
              url: "javascript:alert(1)",
            },
            {
              title: "Safe manual",
              url: "https://example.com/manual.pdf",
            },
          ],
          kind: "manuals",
          title: "Manuals",
        },
        {
          id: "references",
          items: [
            {
              title: "Unsafe reference",
              url: "javascript:alert(1)",
            },
            {
              title: "Safe reference",
              url: "https://example.com/reference",
            },
          ],
          kind: "references",
          title: "References",
        },
      ],
      title: "Microscope",
    };

    const markdown = buildMarkdownFromStructuredArticle(article);
    const html = buildHtmlFromStructuredArticle(article);

    expect(markdown).not.toContain("javascript:");
    expect(markdown).toContain("[Safe manual](https://example.com/manual.pdf)");
    expect(markdown).toContain("Unsafe reference");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://example.com/manual.pdf"');
    expect(html).toContain(">Unsafe reference<");
  });

  it("renders image-gallery and manual intros in markdown and html output", () => {
    const article = {
      excerpt: "Endoscopy excerpt",
      sections: [
        {
          id: "operation_visual_guide",
          images: [
            {
              alt: "Endoscopy tower",
              caption: "Tower overview",
              url: "https://example.com/endoscopy-tower.jpg",
            },
          ],
          intro: "These visuals support the operating workflow.",
          kind: "image_gallery",
          title: "Operation visual guide",
        },
        {
          id: "manuals_and_technical_documents",
          intro: "Consult these documents for model-specific detail.",
          items: [
            {
              title: "Processor manual",
              url: "https://example.com/processor-manual.pdf",
            },
          ],
          kind: "manuals",
          title: "Manuals",
        },
      ],
      title: "Endoscopy machine",
    };

    const markdown = buildMarkdownFromStructuredArticle(article);
    const html = buildHtmlFromStructuredArticle(article);

    expect(markdown).toContain("These visuals support the operating workflow.");
    expect(markdown).toContain("Consult these documents for model-specific detail.");
    expect(html).toContain("<p>These visuals support the operating workflow.</p>");
    expect(html).toContain("<p>Consult these documents for model-specific detail.</p>");
  });

  it("renders image galleries from sourceUrl fallback fields", () => {
    const article = {
      excerpt: "Microscope excerpt",
      sections: [
        {
          id: "featured_image",
          images: [
            {
              alt: "Bench microscope",
              caption: "Prepared for inspection",
              sourceUrl: "https://fixtures.example/images/microscope-bench.jpg",
            },
          ],
          kind: "image_gallery",
          title: "Featured image",
        },
      ],
      title: "Microscope",
    };

    const markdown = buildMarkdownFromStructuredArticle(article);
    const html = buildHtmlFromStructuredArticle(article);

    expect(markdown).not.toContain("(undefined)");
    expect(markdown).toContain("![Bench microscope](data:image/svg+xml;charset=UTF-8,");
    expect(html).not.toContain('src="undefined"');
    expect(html).toContain('src="data:image/svg+xml;charset=UTF-8,');
  });
});
