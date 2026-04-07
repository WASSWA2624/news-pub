import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("admin actions", () => {
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

  it("saves provider records with sanitized scoped defaults and redirects", async () => {
    const revalidatePath = vi.fn();
    const redirect = vi.fn(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const saveProviderRecord = vi.fn().mockResolvedValue({});
    const sanitizeProviderFieldValues = vi.fn().mockReturnValue({
      category: "technology",
    });

    vi.doMock("next/cache", () => ({
      revalidatePath,
    }));
    vi.doMock("next/navigation", () => ({
      redirect,
    }));
    vi.doMock("@/features/providers", () => ({
      saveProviderRecord,
    }));
    vi.doMock("@/lib/auth", () => ({
      requireAdminPageSession: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/news/provider-definitions", () => ({
      MULTI_VALUE_EMPTY_SENTINEL: "__empty__",
      sanitizeProviderFieldValues,
    }));
    vi.doMock("@/features/categories", () => ({ deleteCategoryRecord: vi.fn(), saveCategoryRecord: vi.fn() }));
    vi.doMock("@/features/destinations", () => ({ deleteDestinationRecord: vi.fn(), saveDestinationRecord: vi.fn() }));
    vi.doMock("@/features/media", () => ({ uploadMediaAsset: vi.fn() }));
    vi.doMock("@/features/templates", () => ({ saveTemplateRecord: vi.fn() }));
    vi.doMock("@/features/settings", () => ({ getSettingsSnapshot: vi.fn() }));
    vi.doMock("@/features/posts", () => ({
      createManualPostRecord: vi.fn(),
      repostPostRecord: vi.fn(),
      updatePostEditorialRecord: vi.fn(),
    }));
    vi.doMock("@/features/streams", () => ({ deleteStreamRecord: vi.fn(), saveStreamRecord: vi.fn() }));
    vi.doMock("@/lib/news/workflows", () => ({
      retryPublishAttempt: vi.fn(),
      runScheduledStreams: vi.fn(),
      runStreamFetch: vi.fn(),
    }));

    const { saveProviderAction } = await import("./actions");
    const formData = new FormData();
    formData.set("providerKey", "newsapi");
    formData.set("label", "News API");
    formData.set("requestDefault.category", "technology");

    await expect(saveProviderAction(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(sanitizeProviderFieldValues).toHaveBeenCalledWith("newsapi", {
      category: "technology",
    });
    expect(saveProviderRecord).toHaveBeenCalledWith(
      {
        baseUrl: null,
        description: null,
        isDefault: false,
        isEnabled: false,
        isSelectable: false,
        label: "News API",
        providerKey: "newsapi",
        requestDefaultsJson: {
          category: "technology",
        },
      },
      {
        actorId: "admin_1",
      },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/providers");
    expect(redirect).toHaveBeenCalledWith("/admin/providers");
  });

  it("redirects stream deletion failures back with an encoded error message", async () => {
    const revalidatePath = vi.fn();
    const redirect = vi.fn(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const deleteStreamRecord = vi.fn().mockRejectedValue(new Error("Stream is still referenced."));

    vi.doMock("next/cache", () => ({
      revalidatePath,
    }));
    vi.doMock("next/navigation", () => ({
      redirect,
    }));
    vi.doMock("@/lib/auth", () => ({
      requireAdminPageSession: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/features/streams", () => ({
      deleteStreamRecord,
      saveStreamRecord: vi.fn(),
    }));
    vi.doMock("@/features/categories", () => ({ deleteCategoryRecord: vi.fn(), saveCategoryRecord: vi.fn() }));
    vi.doMock("@/features/destinations", () => ({ deleteDestinationRecord: vi.fn(), saveDestinationRecord: vi.fn() }));
    vi.doMock("@/features/media", () => ({ uploadMediaAsset: vi.fn() }));
    vi.doMock("@/features/templates", () => ({ saveTemplateRecord: vi.fn() }));
    vi.doMock("@/features/settings", () => ({ getSettingsSnapshot: vi.fn() }));
    vi.doMock("@/features/providers", () => ({ saveProviderRecord: vi.fn() }));
    vi.doMock("@/features/posts", () => ({
      createManualPostRecord: vi.fn(),
      repostPostRecord: vi.fn(),
      updatePostEditorialRecord: vi.fn(),
    }));
    vi.doMock("@/lib/news/provider-definitions", () => ({
      MULTI_VALUE_EMPTY_SENTINEL: "__empty__",
      sanitizeProviderFieldValues: vi.fn(),
    }));
    vi.doMock("@/lib/news/workflows", () => ({
      retryPublishAttempt: vi.fn(),
      runScheduledStreams: vi.fn(),
      runStreamFetch: vi.fn(),
    }));

    const { deleteStreamAction } = await import("./actions");
    const formData = new FormData();
    formData.set("id", "stream_1");

    await expect(deleteStreamAction(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(deleteStreamRecord).toHaveBeenCalledWith("stream_1", {
      actorId: "admin_1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/streams");
    expect(redirect).toHaveBeenCalledWith("/admin/streams?error=Stream%20is%20still%20referenced.");
  });

  it("retries failed publish attempts with the current admin id", async () => {
    const revalidatePath = vi.fn();
    const redirect = vi.fn(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const retryPublishAttempt = vi.fn().mockResolvedValue({});

    vi.doMock("next/cache", () => ({
      revalidatePath,
    }));
    vi.doMock("next/navigation", () => ({
      redirect,
    }));
    vi.doMock("@/lib/auth", () => ({
      requireAdminPageSession: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/news/workflows", () => ({
      retryPublishAttempt,
      runScheduledStreams: vi.fn(),
      runStreamFetch: vi.fn(),
    }));
    vi.doMock("@/features/categories", () => ({ deleteCategoryRecord: vi.fn(), saveCategoryRecord: vi.fn() }));
    vi.doMock("@/features/destinations", () => ({ deleteDestinationRecord: vi.fn(), saveDestinationRecord: vi.fn() }));
    vi.doMock("@/features/media", () => ({ uploadMediaAsset: vi.fn() }));
    vi.doMock("@/features/templates", () => ({ saveTemplateRecord: vi.fn() }));
    vi.doMock("@/features/settings", () => ({ getSettingsSnapshot: vi.fn() }));
    vi.doMock("@/features/providers", () => ({ saveProviderRecord: vi.fn() }));
    vi.doMock("@/features/posts", () => ({
      createManualPostRecord: vi.fn(),
      repostPostRecord: vi.fn(),
      updatePostEditorialRecord: vi.fn(),
    }));
    vi.doMock("@/features/streams", () => ({ deleteStreamRecord: vi.fn(), saveStreamRecord: vi.fn() }));
    vi.doMock("@/lib/news/provider-definitions", () => ({
      MULTI_VALUE_EMPTY_SENTINEL: "__empty__",
      sanitizeProviderFieldValues: vi.fn(),
    }));

    const { retryPublishAttemptAction } = await import("./actions");
    const formData = new FormData();
    formData.set("attemptId", "attempt_1");
    formData.set("returnTo", "/admin/jobs?tab=failed");

    await expect(retryPublishAttemptAction(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(retryPublishAttempt).toHaveBeenCalledWith("attempt_1", {
      actorId: "admin_1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/jobs?tab=failed");
    expect(redirect).toHaveBeenCalledWith("/admin/jobs?tab=failed");
  });

  it("uploads media buffers and metadata before redirecting back to the library", async () => {
    const revalidatePath = vi.fn();
    const redirect = vi.fn(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const uploadMediaAsset = vi.fn().mockResolvedValue({});

    vi.doMock("next/cache", () => ({
      revalidatePath,
    }));
    vi.doMock("next/navigation", () => ({
      redirect,
    }));
    vi.doMock("@/lib/auth", () => ({
      requireAdminPageSession: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/features/media", () => ({
      uploadMediaAsset,
    }));
    vi.doMock("@/features/categories", () => ({ deleteCategoryRecord: vi.fn(), saveCategoryRecord: vi.fn() }));
    vi.doMock("@/features/destinations", () => ({ deleteDestinationRecord: vi.fn(), saveDestinationRecord: vi.fn() }));
    vi.doMock("@/features/templates", () => ({ saveTemplateRecord: vi.fn() }));
    vi.doMock("@/features/settings", () => ({ getSettingsSnapshot: vi.fn() }));
    vi.doMock("@/features/providers", () => ({ saveProviderRecord: vi.fn() }));
    vi.doMock("@/features/posts", () => ({
      createManualPostRecord: vi.fn(),
      repostPostRecord: vi.fn(),
      updatePostEditorialRecord: vi.fn(),
    }));
    vi.doMock("@/features/streams", () => ({ deleteStreamRecord: vi.fn(), saveStreamRecord: vi.fn() }));
    vi.doMock("@/lib/news/provider-definitions", () => ({
      MULTI_VALUE_EMPTY_SENTINEL: "__empty__",
      sanitizeProviderFieldValues: vi.fn(),
    }));
    vi.doMock("@/lib/news/workflows", () => ({
      retryPublishAttempt: vi.fn(),
      runScheduledStreams: vi.fn(),
      runStreamFetch: vi.fn(),
    }));

    const { uploadMediaAction } = await import("./actions");
    const file = new File([new Uint8Array([1, 2, 3, 4])], "story-image.png", {
      type: "image/png",
    });
    const formData = new FormData();
    formData.set("file", file);
    formData.set("alt", "Story image");
    formData.set("caption", "Front page image");
    formData.set("attributionText", "Photo desk");
    formData.set("sourceUrl", "https://example.com/image");

    await expect(uploadMediaAction(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(uploadMediaAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        alt: "Story image",
        attributionText: "Photo desk",
        caption: "Front page image",
        fileName: "story-image.png",
        mimeType: "image/png",
        sourceUrl: "https://example.com/image",
      }),
      {
        actorId: "admin_1",
      },
    );
    expect(uploadMediaAsset.mock.calls[0][0].buffer).toBeInstanceOf(Buffer);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/media");
    expect(redirect).toHaveBeenCalledWith("/admin/media");
  });
});
