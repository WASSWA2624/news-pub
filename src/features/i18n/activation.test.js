import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseEnv() {
  return {
    DEFAULT_LOCALE: "en",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    SUPPORTED_LOCALES: "en",
  };
}

const originalEnv = process.env;

describe("locale activation helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createBaseEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("syncs the registered locale catalog into persistence records", async () => {
    const prisma = {
      locale: {
        upsert: vi.fn().mockResolvedValue(null),
      },
    };
    const { getConfiguredLocaleRecords, syncLocaleRegistryToDatabase } = await import("./activation");

    expect(getConfiguredLocaleRecords()).toEqual([
      {
        code: "en",
        isActive: true,
        isDefault: true,
        name: "English",
      },
    ]);

    await syncLocaleRegistryToDatabase(prisma);

    expect(prisma.locale.upsert).toHaveBeenCalledWith({
      create: {
        code: "en",
        isActive: true,
        isDefault: true,
        name: "English",
      },
      update: {
        code: "en",
        isActive: true,
        isDefault: true,
        name: "English",
      },
      where: {
        code: "en",
      },
    });
  });
});
