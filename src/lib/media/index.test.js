import { describe, expect, it } from "vitest";

import {
  createImagePlaceholderDataUrl,
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
});
