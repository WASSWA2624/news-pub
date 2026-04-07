import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

function createSettingsPrisma() {
  return {
    destination: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    destinationTemplate: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    locale: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    newsProviderConfig: {
      count: vi.fn().mockResolvedValue(0),
    },
    publishingStream: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

describe("settings snapshots", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("reports deterministic-only runtime state when AI is disabled", async () => {
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
      AI_OPTIMIZATION_ENABLED: "false",
      OPENAI_API_KEY: "",
    };

    const { getSettingsSnapshot } = await import("./index");
    const snapshot = await getSettingsSnapshot(createSettingsPrisma());

    expect(snapshot.ai).toMatchObject({
      credentialsConfigured: false,
      enabled: false,
      runtimeMode: "Deterministic only",
      status: "DISABLED",
    });
    expect(snapshot.ai.summary).toContain("deterministic formatting");
  });

  it("reports a misconfigured AI runtime while keeping deterministic fallback active", async () => {
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
      AI_OPTIMIZATION_ENABLED: "true",
      OPENAI_API_KEY: "",
    };

    const { getSettingsSnapshot } = await import("./index");
    const snapshot = await getSettingsSnapshot(createSettingsPrisma());

    expect(snapshot.ai).toMatchObject({
      credentialsConfigured: false,
      enabled: true,
      runtimeMode: "Deterministic fallback only",
      status: "MISCONFIGURED",
    });
    expect(snapshot.ai.summary).toContain("skip AI");
  });

  it("reports the assistive AI runtime as ready when credentials are configured", async () => {
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
      AI_OPTIMIZATION_ENABLED: "true",
      OPENAI_API_KEY: "openai-key",
    };

    const { getSettingsSnapshot } = await import("./index");
    const snapshot = await getSettingsSnapshot(createSettingsPrisma());

    expect(snapshot.ai).toMatchObject({
      credentialsConfigured: true,
      enabled: true,
      runtimeMode: "Assistive AI with deterministic fallback",
      status: "READY",
    });
    expect(snapshot.ai.summary).toContain("falls back deterministically");
  });
});
