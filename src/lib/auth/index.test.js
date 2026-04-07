import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("auth helpers", () => {
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

  it("creates scrypt password hashes that verify correctly", async () => {
    const { createPasswordHash, verifyPassword } = await import("./index");
    const hash = createPasswordHash("strong-password");

    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(verifyPassword("strong-password", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
    expect(verifyPassword("strong-password", "invalid-format")).toBe(false);
  }, 15000);

  it("normalizes emails and hashes session tokens deterministically", async () => {
    const { hashSessionToken, normalizeEmail } = await import("./index");

    expect(normalizeEmail(" Admin@Example.com ")).toBe("admin@example.com");
    expect(hashSessionToken("session-token")).toBe(hashSessionToken("session-token"));
    expect(hashSessionToken("session-token")).not.toBe(hashSessionToken("other-token"));
  });
});
