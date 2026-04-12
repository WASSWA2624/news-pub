import { describe, expect, it } from "vitest";

import verifyDbSnakeCaseModule from "./verify-db-snake-case";

const {
  findLegacySqlIdentifierMatches,
  runVerification,
} = verifyDbSnakeCaseModule;

describe("verify-db-snake-case", () => {
  it("detects stale legacy identifiers inside raw SQL template literals", () => {
    const matches = findLegacySqlIdentifierMatches([
      "const sql = `",
      "  SELECT p.\\`publishedAt\\`",
      "  FROM \\`posttranslation\\` AS p",
      "  WHERE p.\\`postId\\` = ?",
      "`;",
    ].join("\n"));

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalName: "post_translation",
          legacyName: "posttranslation",
          scope: "runtime_sql_table",
        }),
        expect.objectContaining({
          canonicalName: "post_translation.post_id",
          legacyName: "postId",
          scope: "runtime_sql_column",
        }),
        expect.objectContaining({
          canonicalName: "post.published_at",
          legacyName: "publishedAt",
          scope: "runtime_sql_column",
        }),
      ]),
    );
  });

  it("detects stale operational SQL identifiers in quoted query strings", () => {
    const matches = findLegacySqlIdentifierMatches(`
      connection.query(
        "SELECT \`email\`, \`isActive\`, \`passwordHash\` FROM \`user\` WHERE \`email\` = ? LIMIT 1",
      );
    `);

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalName: "user.is_active",
          legacyName: "isActive",
          scope: "runtime_sql_column",
        }),
        expect.objectContaining({
          canonicalName: "user.password_hash",
          legacyName: "passwordHash",
          scope: "runtime_sql_column",
        }),
      ]),
    );
  });

  it("ignores mapped Prisma field names when they are not inside SQL literals", () => {
    const matches = findLegacySqlIdentifierMatches(`
      const user = {
        isActive: true,
        passwordHash: "scrypt$123$abc",
      };
    `);

    expect(matches).toEqual([]);
  });

  it("passes against the current repository schema, migrations, and runtime SQL", () => {
    expect(runVerification()).toEqual([]);
  });
});
