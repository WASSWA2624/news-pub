import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

function createBaseEnv() {
  return {
    DEFAULT_LOCALE: "en",
    SUPPORTED_LOCALES: "en",
    NEXT_PUBLIC_APP_URL: "https://example.com",
  };
}

const originalEnv = process.env;

describe("proxy locale routing", () => {
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

  it("redirects locale-prefixed admin pages back to /admin", async () => {
    const { proxy } = await import("./proxy");
    const response = proxy(
      new NextRequest("https://example.com/en/admin/posts/drafts?tab=review"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.com/admin/posts/drafts?tab=review",
    );
  });

  it("normalizes supported locale prefixes to lowercase", async () => {
    const { proxy } = await import("./proxy");
    const response = proxy(new NextRequest("https://example.com/EN/about?ref=nav"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/en/about?ref=nav");
  });

  it("redirects anonymous admin page requests to the login screen", async () => {
    const { proxy } = await import("./proxy");
    const response = proxy(new NextRequest("https://example.com/admin/posts/drafts"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.com/admin/login?next=%2Fadmin%2Fposts%2Fdrafts",
    );
  });

  it("returns 401 for anonymous protected admin APIs", async () => {
    const { proxy } = await import("./proxy");
    const response = proxy(new NextRequest("https://example.com/api/posts"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      message: "Admin authentication is required.",
      status: "auth_required",
      success: false,
    });
  });
});
