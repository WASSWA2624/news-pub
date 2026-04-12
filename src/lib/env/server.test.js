import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("server environment module", () => {
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

  it("loads the validated config at import time", async () => {
    const { env } = await import("./server");

    expect(env.auth.adminSeed.email).toBe("admin@example.com");
    expect(env.contact.whatsappAdvertUrl).toBe("https://wa.me/256783230321");
    expect(env.media.driver).toBe("local");
    expect(env.scheduler.initialBackfillHours).toBe(24);
  });

  it("fails fast at import time when configuration is invalid", async () => {
    delete process.env.REVALIDATE_SECRET;

    await expect(import("./server")).rejects.toThrow(/REVALIDATE_SECRET/);
  });
});
