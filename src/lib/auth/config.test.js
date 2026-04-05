import { describe, expect, it } from "vitest";

import {
  buildAdminLoginHref,
  isAdminLoginPath,
  isProtectedAdminApiPath,
  isProtectedAdminPagePath,
  normalizeAdminRedirectTarget,
} from "./config";

describe("auth route config", () => {
  it("identifies protected admin pages without treating login as protected", () => {
    expect(isProtectedAdminPagePath("/admin")).toBe(true);
    expect(isProtectedAdminPagePath("/admin/posts/drafts")).toBe(true);
    expect(isProtectedAdminPagePath("/admin/login")).toBe(false);
    expect(isAdminLoginPath("/admin/login")).toBe(true);
    expect(isProtectedAdminPagePath("/en/blog")).toBe(false);
  });

  it("identifies which API routes require an admin session", () => {
    expect(isProtectedAdminApiPath("/api/auth/login")).toBe(false);
    expect(isProtectedAdminApiPath("/api/auth/logout")).toBe(true);
    expect(isProtectedAdminApiPath("/api/categories")).toBe(true);
    expect(isProtectedAdminApiPath("/api/localization")).toBe(true);
    expect(isProtectedAdminApiPath("/api/posts")).toBe(true);
    expect(isProtectedAdminApiPath("/api/posts/cmg123")).toBe(true);
    expect(isProtectedAdminApiPath("/api/posts/slug/defibrillator")).toBe(false);
    expect(isProtectedAdminApiPath("/api/comments")).toBe(false);
    expect(isProtectedAdminApiPath("/api/comments/cmg123")).toBe(true);
  });

  it("sanitizes requested admin redirects", () => {
    expect(normalizeAdminRedirectTarget("/admin/posts/drafts")).toBe("/admin/posts/drafts");
    expect(normalizeAdminRedirectTarget("/admin/login")).toBe("/admin");
    expect(normalizeAdminRedirectTarget("https://example.com/admin")).toBe("/admin");
    expect(normalizeAdminRedirectTarget("//evil.example")).toBe("/admin");
    expect(normalizeAdminRedirectTarget(undefined)).toBe("/admin");
  });

  it("builds a safe login redirect URL", () => {
    expect(buildAdminLoginHref("/admin/posts/drafts")).toBe(
      "/admin/login?next=%2Fadmin%2Fposts%2Fdrafts",
    );
  });
});
