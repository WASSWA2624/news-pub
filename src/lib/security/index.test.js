import { describe, expect, it } from "vitest";

import {
  sanitizeExternalUrl,
  sanitizeHtmlFragment,
  sanitizeMediaUrl,
  sanitizeStructuredContentJson,
} from "./index";

describe("security sanitizers", () => {
  it("accepts only safe external and media URLs", () => {
    expect(sanitizeExternalUrl("https://example.com/manual.pdf")).toBe(
      "https://example.com/manual.pdf",
    );
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeExternalUrl("/en/blog/microscope")).toBeNull();

    expect(sanitizeMediaUrl("/uploads/media/microscope.webp")).toBe(
      "/uploads/media/microscope.webp",
    );
    expect(sanitizeMediaUrl("data:image/svg+xml;charset=UTF-8,<svg></svg>")).toBe(
      "data:image/svg+xml;charset=UTF-8,<svg></svg>",
    );
    expect(sanitizeMediaUrl("javascript:alert(1)")).toBeNull();
  });

  it("removes dangerous tags, handlers, and URLs from HTML fragments", () => {
    const sanitized = sanitizeHtmlFragment(`
      <article>
        <script>alert("xss")</script>
        <a href="javascript:alert('xss')" onclick="alert('xss')">Bad link</a>
        <a href="https://example.com/reference">Safe link</a>
        <img src="/uploads/media/microscope.webp" onerror="alert('xss')" />
      </article>
    `);

    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick=");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).toContain('href="https://example.com/reference"');
    expect(sanitized).toContain('src="/uploads/media/microscope.webp"');
  });

  it("sanitizes stored structured-content URLs before rendering", () => {
    const sanitized = sanitizeStructuredContentJson({
      sections: [
        {
          id: "featured_image",
          images: [
            {
              alt: "Unsafe image",
              url: "javascript:alert(1)",
            },
            {
              alt: "Safe image",
              url: "https://cdn.example.com/microscope.webp",
            },
          ],
          kind: "image_gallery",
          title: "Featured image",
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
    });

    expect(sanitized.sections[0].images).toEqual([
      {
        alt: "Safe image",
        url: "https://cdn.example.com/microscope.webp",
      },
    ]);
    expect(sanitized.sections[1].items).toEqual([
      {
        title: "Unsafe reference",
        url: null,
      },
      {
        title: "Safe reference",
        url: "https://example.com/reference",
      },
    ]);
  });

  it("preserves gallery images saved with sourceUrl or publicUrl", () => {
    const sanitized = sanitizeStructuredContentJson({
      sections: [
        {
          id: "components_visual_guide",
          images: [
            {
              alt: "Source image",
              sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b6/Flexible_endoscope.jpg",
            },
            {
              alt: "Public image",
              publicUrl: "https://cdn.example.com/endoscopy/components.jpg",
            },
          ],
          kind: "image_gallery",
          title: "Components visual guide",
        },
      ],
    });

    expect(sanitized.sections[0].images).toEqual([
      {
        alt: "Source image",
        sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b6/Flexible_endoscope.jpg",
        url: "https://upload.wikimedia.org/wikipedia/commons/b/b6/Flexible_endoscope.jpg",
      },
      {
        alt: "Public image",
        publicUrl: "https://cdn.example.com/endoscopy/components.jpg",
        url: "https://cdn.example.com/endoscopy/components.jpg",
      },
    ]);
  });
});
