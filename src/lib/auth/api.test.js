import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("auth api helpers", () => {
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

  it.each([
    ["user_not_found", "No admin account exists for that email address."],
    ["invalid_password", "The password is incorrect."],
    ["user_inactive", "This admin account is inactive."],
    ["role_not_allowed", "This account does not have admin access."],
  ])("returns a specific login error message for %s", async (status, message) => {
    vi.doMock("./index", () => ({
      authenticateAdminCredentials: vi.fn(async () => ({
        status,
        success: false,
      })),
      buildLoginSuccessPayload: vi.fn(),
      buildLogoutSuccessPayload: vi.fn(),
      invalidateAdminSession: vi.fn(),
      validateRequestAdminSession: vi.fn(),
    }));

    const { createLoginResponse } = await import("./api");
    const response = await createLoginResponse({
      email: "admin@example.com",
      password: "wrong-password",
      userAgent: "Vitest Browser",
    });

    await expect(response.json()).resolves.toEqual({
      message,
      status,
      success: false,
    });
    expect(response.status).toBe(401);
  });
});
