import { describe, expect, it, vi } from "vitest";

describe("default admin account helpers", () => {
  it("accepts a valid seeded default admin account", async () => {
    const { assertDefaultAdminAccountSeeded } = await import("./default-admin-account.js");
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          email: "admin@example.test",
          id: "user_1",
          isActive: true,
          passwordHash: "scrypt$32768$8$1$abc$def",
          role: "SUPER_ADMIN",
        }),
      },
    };

    await expect(
      assertDefaultAdminAccountSeeded(prisma, {
        ADMIN_SEED_EMAIL: "admin@example.test",
      }),
    ).resolves.toMatchObject({
      email: "admin@example.test",
      role: "SUPER_ADMIN",
    });
  });

  it("fails when the seeded default admin account is missing", async () => {
    const { assertDefaultAdminAccountSeeded } = await import("./default-admin-account.js");
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      assertDefaultAdminAccountSeeded(prisma, {
        ADMIN_SEED_EMAIL: "admin@example.test",
      }),
    ).rejects.toThrow("Default admin account admin@example.test was not found after seeding.");
  });

  it("fails when the seeded admin account is not publish-ready for login", async () => {
    const { assertDefaultAdminAccountSeeded } = await import("./default-admin-account.js");
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          email: "admin@example.test",
          id: "user_1",
          isActive: false,
          passwordHash: "",
          role: "EDITOR",
        }),
      },
    };

    await expect(
      assertDefaultAdminAccountSeeded(prisma, {
        ADMIN_SEED_EMAIL: "admin@example.test",
      }),
    ).rejects.toThrow("Default admin account admin@example.test is invalid after seeding:");
  });
});
