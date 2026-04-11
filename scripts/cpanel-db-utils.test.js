import { describe, expect, it } from "vitest";

describe("cPanel Prisma table helpers", () => {
  it("leaves canonical lowercase Prisma table names unchanged", async () => {
    const { buildPrismaTableCaseNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaTableCaseNormalizationPlan([
      "_prisma_migrations",
      "adminsession",
      "auditevent",
      "user",
    ]);

    expect(plan).toEqual({
      conflicts: [],
      renames: [],
    });
  });

  it("plans renames for legacy mixed-case Prisma tables", async () => {
    const { buildPrismaTableCaseNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaTableCaseNormalizationPlan([
      "_prisma_migrations",
      "AdminSession",
      "AuditEvent",
      "User",
    ]);

    expect(plan.conflicts).toEqual([]);
    expect(plan.renames).toEqual([
      { from: "User", to: "user" },
      { from: "AdminSession", to: "adminsession" },
      { from: "AuditEvent", to: "auditevent" },
    ]);
  });

  it("flags conflicting case variants for the same Prisma table", async () => {
    const { buildPrismaTableCaseNormalizationPlan } = await import("./cpanel-db-utils.js");
    const plan = buildPrismaTableCaseNormalizationPlan([
      "AdminSession",
      "User",
      "user",
    ]);

    expect(plan.renames).toEqual([
      { from: "AdminSession", to: "adminsession" },
    ]);
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0].canonicalName).toBe("user");
    expect([...plan.conflicts[0].variants].sort((left, right) => left.localeCompare(right))).toEqual(
      ["User", "user"].sort((left, right) => left.localeCompare(right)),
    );
  });
});
