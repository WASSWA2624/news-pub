import { describe, expect, it } from "vitest";

describe("cPanel Prisma table helpers", () => {
  it("leaves canonical Prisma table names unchanged", async () => {
    const { buildPrismaTableCaseNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaTableCaseNormalizationPlan([
      "_prisma_migrations",
      "AdminSession",
      "AuditEvent",
      "User",
    ]);

    expect(plan).toEqual({
      conflicts: [],
      renames: [],
    });
  });

  it("plans renames for lowercase imported Prisma tables", async () => {
    const { buildPrismaTableCaseNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaTableCaseNormalizationPlan([
      "_prisma_migrations",
      "adminsession",
      "auditevent",
      "user",
    ]);

    expect(plan.conflicts).toEqual([]);
    expect(plan.renames).toEqual([
      { from: "user", to: "User" },
      { from: "adminsession", to: "AdminSession" },
      { from: "auditevent", to: "AuditEvent" },
    ]);
  });

  it("flags conflicting case variants for the same Prisma table", async () => {
    const { buildPrismaTableCaseNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaTableCaseNormalizationPlan([
      "AdminSession",
      "User",
      "user",
    ]);

    expect(plan.renames).toEqual([]);
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0].canonicalName).toBe("User");
    expect([...plan.conflicts[0].variants].sort((left, right) => left.localeCompare(right))).toEqual(
      ["User", "user"].sort((left, right) => left.localeCompare(right)),
    );
  });
});
