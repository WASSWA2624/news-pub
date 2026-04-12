import { describe, expect, it } from "vitest";

import { publicPageUtils } from "./public-page-utils";

describe("public page utils", () => {
  it("removes stored header, category, and source-attribution sections from story body html", () => {
    const html = [
      "<article>",
      "<header><h1>Breaking story</h1><p>Summary</p></header>",
      "<section><h2>Story</h2><p>Body copy.</p></section>",
      "<section><h2>Categories</h2><p>Technology</p></section>",
      "<section><h2>Source Attribution</h2><p>Source: Example Source</p></section>",
      "</article>",
    ].join("");

    expect(publicPageUtils.trimStoryContentHtml(html)).toBe("<article><section><p>Body copy.</p></section></article>");
  });

  it("suppresses source-attribution notes when the value only repeats the visible source block", () => {
    expect(
      publicPageUtils.buildSourceAttributionNote("Source: Example Source - https://example.com/story", {
        source_name: "Example Source",
        source_url: "https://example.com/story",
      }),
    ).toBe("");
  });

  it("preserves source-attribution notes that add context beyond the source name and url", () => {
    expect(
      publicPageUtils.buildSourceAttributionNote("Original reporting provided by Example Source and local bureau updates.", {
        source_name: "Example Source",
        source_url: "https://example.com/story",
      }),
    ).toBe("Original reporting provided by Example Source and local bureau updates.");
  });
});
