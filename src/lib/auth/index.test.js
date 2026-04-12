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
    vi.restoreAllMocks();
    vi.resetModules();
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

  it("returns a user_not_found login status before password validation", async () => {
    const prisma = {
      auditEvent: {
        create: vi.fn(async () => ({})),
      },
      user: {
        findUnique: vi.fn(async () => null),
      },
    };

    vi.doMock("@/lib/prisma", () => ({
      getPrismaClient: () => prisma,
    }));

    const { authenticateAdminCredentials } = await import("./index");

    await expect(
      authenticateAdminCredentials({
        email: " Missing@Example.com ",
        password: "any-password",
      }),
    ).resolves.toEqual({
      status: "user_not_found",
      success: false,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: "missing@example.com",
      },
    });
    expect(prisma.auditEvent.create).toHaveBeenCalledWith({
      data: {
        action: "AUTH_LOGIN_FAILED",
        actor_id: null,
        entity_id: "missing@example.com",
        entity_type: "auth_identity",
        payload_json: {
          reason: "user_not_found",
        },
      },
    });
  });

  it("returns an invalid_password login status when the admin email exists", async () => {
    const prisma = {
      auditEvent: {
        create: vi.fn(async () => ({})),
      },
      user: {
        findUnique: vi.fn(async () => ({
          email: "admin@example.com",
          id: "user_1",
          is_active: true,
          name: "NewsPub Admin",
          password_hash: "invalid-format",
          role: "SUPER_ADMIN",
        })),
      },
    };

    vi.doMock("@/lib/prisma", () => ({
      getPrismaClient: () => prisma,
    }));

    const { authenticateAdminCredentials } = await import("./index");

    await expect(
      authenticateAdminCredentials({
        email: "admin@example.com",
        password: "wrong-password",
      }),
    ).resolves.toEqual({
      status: "invalid_password",
      success: false,
    });

    expect(prisma.auditEvent.create).toHaveBeenCalledWith({
      data: {
        action: "AUTH_LOGIN_FAILED",
        actor_id: null,
        entity_id: "admin@example.com",
        entity_type: "auth_identity",
        payload_json: {
          reason: "invalid_password",
        },
      },
    });
  });
});
