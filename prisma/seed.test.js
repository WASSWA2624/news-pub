import { createRequire } from "node:module";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const seed = require("./seed.js");

const originalEnv = process.env;

describe("prisma baseline seed definitions", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AI_PROVIDER_DEFAULT: "openai",
      AI_MODEL_DEFAULT: "gpt-5.4",
      AI_PROVIDER_FALLBACK: "openai",
      AI_MODEL_FALLBACK: "gpt-5.4-mini",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("covers the required prompt layers", () => {
    expect(seed.PROMPT_TEMPLATES.map((template) => template.purpose)).toEqual([
      "system_instruction",
      "data_grounding",
      "output_json_structure",
      "article_formatting",
      "safety_boundaries",
    ]);

    expect(seed.PROMPT_TEMPLATES.every((template) => template.isActive && template.version === 1)).toBe(
      true,
    );
    expect(seed.RELEASE_ONE_DISCLAIMER.length).toBeGreaterThan(100);
  });

  it("captures the approved source-tier order", () => {
    expect(
      seed.SOURCE_CONFIGS.map((sourceConfig) => ({
        priority: sourceConfig.priority,
        sourceType: sourceConfig.sourceType,
      })),
    ).toEqual([
      { priority: 1, sourceType: "OFFICIAL_MANUFACTURER_WEBSITE" },
      { priority: 2, sourceType: "OFFICIAL_PRODUCT_PAGE" },
      { priority: 3, sourceType: "OFFICIAL_MANUAL" },
      { priority: 4, sourceType: "OFFICIAL_DISTRIBUTOR_DOCUMENTATION" },
      { priority: 5, sourceType: "TRUSTED_BIOMEDICAL_REFERENCE" },
      { priority: 6, sourceType: "TRUSTED_PROFESSIONAL_SOCIETY" },
      { priority: 7, sourceType: "REPUTABLE_EDUCATIONAL_INSTITUTION" },
      { priority: 8, sourceType: "APPROVED_SEARCH_RESULT" },
    ]);
  });

  it("maps provider configs from the environment contract", () => {
    expect(seed.getProviderConfigs()).toEqual([
      {
        id: "provider_cfg_default_generation",
        provider: "openai",
        model: "gpt-5.4",
        purpose: "draft_generation",
        apiKeyEnvName: "OPENAI_API_KEY",
        isDefault: true,
        isEnabled: true,
      },
      {
        id: "provider_cfg_fallback_generation",
        provider: "openai",
        model: "gpt-5.4-mini",
        purpose: "draft_generation_fallback",
        apiKeyEnvName: "OPENAI_API_KEY",
        isDefault: false,
        isEnabled: true,
      },
    ]);
  });

  it("creates salted password hashes for admin seeding", () => {
    const firstHash = seed.createPasswordHash("strong-password");
    const secondHash = seed.createPasswordHash("strong-password");

    expect(firstHash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(secondHash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(firstHash).not.toBe(secondHash);
  });
});
