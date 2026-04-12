import { describe, expect, it } from "vitest";

describe("cPanel Prisma naming helpers", () => {
  it("parses snake_case table and column names from Prisma maps", async () => {
    const { parsePrismaSchemaNamingMetadata } = await import("./cpanel-db-utils.js");
    const metadata = parsePrismaSchemaNamingMetadata(`
model AdminSession {
  id        String   @id
  userId    String   @map("user_id")
  createdAt DateTime @map("created_at")

  @@map("admin_session")
}
`);

    expect(metadata.tables).toEqual([
      {
        canonicalName: "admin_session",
        columns: [
          {
            canonicalName: "id",
            fieldName: "id",
            legacyNames: [],
          },
          {
            canonicalName: "user_id",
            fieldName: "userId",
            legacyNames: ["userId"],
          },
          {
            canonicalName: "created_at",
            fieldName: "createdAt",
            legacyNames: ["createdAt"],
          },
        ],
        legacyNames: ["adminsession"],
        modelName: "AdminSession",
      },
    ]);
  });

  it("leaves canonical snake_case Prisma table names unchanged", async () => {
    const { buildPrismaTableNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaTableNormalizationPlan([
      "_prisma_migrations",
      "admin_session",
      "audit_event",
      "User",
    ], {
      tables: [
        { canonicalName: "_prisma_migrations", legacyNames: [] },
        { canonicalName: "admin_session", legacyNames: ["adminsession"] },
        { canonicalName: "audit_event", legacyNames: ["auditevent"] },
        { canonicalName: "user", legacyNames: [] },
      ],
    });

    expect(plan).toEqual({
      conflicts: [],
      renames: [{ from: "User", to: "user" }],
    });
  });

  it("plans renames for legacy compressed Prisma table names", async () => {
    const { buildPrismaTableNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaTableNormalizationPlan([
      "_prisma_migrations",
      "adminsession",
      "auditevent",
      "User",
    ], {
      tables: [
        { canonicalName: "_prisma_migrations", legacyNames: [] },
        { canonicalName: "admin_session", legacyNames: ["adminsession"] },
        { canonicalName: "audit_event", legacyNames: ["auditevent"] },
        { canonicalName: "user", legacyNames: [] },
      ],
    });

    expect(plan.conflicts).toEqual([]);
    expect(plan.renames).toEqual([
      { from: "adminsession", to: "admin_session" },
      { from: "auditevent", to: "audit_event" },
      { from: "User", to: "user" },
    ]);
  });

  it("flags conflicting variants for the same Prisma table", async () => {
    const { buildPrismaTableNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaTableNormalizationPlan([
      "admin_session",
      "adminsession",
      "User",
      "user",
    ], {
      tables: [
        { canonicalName: "admin_session", legacyNames: ["adminsession"] },
        { canonicalName: "user", legacyNames: [] },
      ],
    });

    expect(plan.renames).toEqual([]);
    expect(plan.conflicts).toHaveLength(2);
    expect(plan.conflicts[0].canonicalName).toBe("admin_session");
    expect(plan.conflicts[0].variants).toEqual(["admin_session", "adminsession"]);
    expect(plan.conflicts[1].canonicalName).toBe("user");
    expect(plan.conflicts[1].variants).toEqual(["user", "User"]);
  });

  it("plans column renames from legacy camelCase fields to snake_case columns", async () => {
    const { buildPrismaColumnNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaColumnNormalizationPlan(
      ["id", "userId", "createdAt"],
      [
        { canonicalName: "id", legacyNames: [] },
        { canonicalName: "user_id", legacyNames: ["userId"] },
        { canonicalName: "created_at", legacyNames: ["createdAt"] },
      ],
    );

    expect(plan).toEqual({
      conflicts: [],
      renames: [
        { from: "userId", to: "user_id" },
        { from: "createdAt", to: "created_at" },
      ],
    });
  });

  it("flags conflicting variants for the same Prisma column", async () => {
    const { buildPrismaColumnNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaColumnNormalizationPlan(
      ["created_at", "createdAt"],
      [{ canonicalName: "created_at", legacyNames: ["createdAt"] }],
    );

    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0]).toEqual({
      canonicalName: "created_at",
      variants: ["created_at", "createdAt"],
    });
  });
});
