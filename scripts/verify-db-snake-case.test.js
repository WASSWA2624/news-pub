import { describe, expect, it } from "vitest";
import path from "node:path";

import verifyDbSnakeCaseModule from "./verify-db-snake-case";

const {
  collectRuntimeQueryFiles,
  findLegacyQueryIdentifierMatches,
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

  it("detects stale camelCase Prisma query identifiers in repository code", () => {
    const matches = findLegacyQueryIdentifierMatches(`
      const stream = await db.publishingStream.findUnique({
        where: {
          streamId_providerConfigId: {
            providerConfigId: "provider_1",
            streamId: "stream_1",
          },
        },
        select: {
          scheduleIntervalMinutes: true,
        },
      });
    `);

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalName: "publishing_stream.schedule_interval_minutes",
          legacyName: "scheduleIntervalMinutes",
          scope: "runtime_query_field",
        }),
        expect.objectContaining({
          canonicalName: "provider_fetch_checkpoint.stream_id_provider_config_id",
          legacyName: "streamId_providerConfigId",
          scope: "runtime_query_composite",
        }),
        expect.objectContaining({
          canonicalName: "provider_fetch_checkpoint.provider_config_id",
          legacyName: "providerConfigId",
          scope: "runtime_query_field",
        }),
      ]),
    );
  });

  it("ignores snake_case Prisma field identifiers when they are already compliant", () => {
    const matches = findLegacySqlIdentifierMatches(`
      const user = {
        is_active: true,
        password_hash: "scrypt$123$abc",
      };
    `);

    expect(matches).toEqual([]);
  });

  it("ignores provider payload fields that only match external API contracts", () => {
    const matches = findLegacyQueryIdentifierMatches(`
      const article = {
        publishedAt: "2026-04-05T00:00:00Z",
        urlToImage: "https://example.com/image.jpg",
      };

      return article.publishedAt;
    `);

    expect(matches).toEqual([]);
  });

  it("scans Prisma-side runtime files when checking DB-facing query identifiers", () => {
    expect(
      collectRuntimeQueryFiles().some((filePath) =>
        filePath.endsWith(path.join("prisma", "defaults.js")),
      ),
    ).toBe(true);
  });

  it("passes against the current repository schema, migrations, and runtime SQL", () => {
    expect(runVerification()).toEqual([]);
  });
});
