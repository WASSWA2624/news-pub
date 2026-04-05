import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("destination feature validation", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects incompatible platform and kind combinations before saving", async () => {
    const { saveDestinationRecord } = await import("./index");

    await expect(
      saveDestinationRecord(
        {
          kind: "FACEBOOK_PAGE",
          name: "Website but Facebook",
          platform: "WEBSITE",
          slug: "website-but-facebook",
        },
        {},
        {},
      ),
    ).rejects.toMatchObject({
      status: "destination_validation_failed",
    });
  });
});
