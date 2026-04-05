"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteCategoryRecord, saveCategoryRecord } from "@/features/categories";
import { saveDestinationRecord } from "@/features/destinations";
import { uploadMediaAsset } from "@/features/media";
import { saveTemplateRecord } from "@/features/templates";
import { getSettingsSnapshot } from "@/features/settings";
import { saveProviderRecord } from "@/features/providers";
import { updatePostEditorialRecord } from "@/features/posts";
import { saveStreamRecord } from "@/features/streams";
import { requireAdminPageSession } from "@/lib/auth";
import { runScheduledStreams, runStreamFetch } from "@/lib/news/workflows";

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData, key) {
  return formData.get(key) === "on";
}

function parseJsonField(formData, key, fallbackValue = {}) {
  const rawValue = trimText(formData.get(key));

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
}

function redirectToPath(pathname) {
  revalidatePath(pathname);
  redirect(pathname);
}

function getActorId(auth) {
  return auth?.user?.id || null;
}

export async function saveProviderAction(formData) {
  const auth = await requireAdminPageSession("/admin/providers");

  await saveProviderRecord(
    {
      baseUrl: formData.get("baseUrl"),
      description: formData.get("description"),
      isDefault: getBoolean(formData, "isDefault"),
      isEnabled: getBoolean(formData, "isEnabled"),
      isSelectable: getBoolean(formData, "isSelectable"),
      label: formData.get("label"),
      providerKey: formData.get("providerKey"),
      requestDefaultsJson: parseJsonField(formData, "requestDefaultsJson", {}),
    },
    {
      actorId: getActorId(auth),
    },
  );

  redirectToPath("/admin/providers");
}

export async function saveDestinationAction(formData) {
  const auth = await requireAdminPageSession("/admin/destinations");

  await saveDestinationRecord(
    {
      accountHandle: formData.get("accountHandle"),
      clearToken: getBoolean(formData, "clearToken"),
      connectionError: formData.get("connectionError"),
      connectionStatus: formData.get("connectionStatus"),
      externalAccountId: formData.get("externalAccountId"),
      kind: formData.get("kind"),
      name: formData.get("name"),
      platform: formData.get("platform"),
      settingsJson: parseJsonField(formData, "settingsJson", {}),
      slug: formData.get("slug"),
      token: formData.get("token"),
    },
    {
      actorId: getActorId(auth),
    },
  );

  redirectToPath("/admin/destinations");
}

export async function saveStreamAction(formData) {
  const auth = await requireAdminPageSession("/admin/streams");

  await saveStreamRecord(
    {
      activeProviderId: formData.get("activeProviderId"),
      categoryIds: formData.getAll("categoryIds").map((value) => trimText(value)),
      defaultTemplateId: formData.get("defaultTemplateId"),
      description: formData.get("description"),
      destinationId: formData.get("destinationId"),
      duplicateWindowHours: formData.get("duplicateWindowHours"),
      excludeKeywordsJson: formData.get("excludeKeywordsJson"),
      includeKeywordsJson: formData.get("includeKeywordsJson"),
      locale: formData.get("locale"),
      maxPostsPerRun: formData.get("maxPostsPerRun"),
      mode: formData.get("mode"),
      name: formData.get("name"),
      retryBackoffMinutes: formData.get("retryBackoffMinutes"),
      retryLimit: formData.get("retryLimit"),
      scheduleExpression: formData.get("scheduleExpression"),
      scheduleIntervalMinutes: formData.get("scheduleIntervalMinutes"),
      slug: formData.get("slug"),
      status: formData.get("status"),
      timezone: formData.get("timezone"),
    },
    {
      actorId: getActorId(auth),
    },
  );

  redirectToPath("/admin/streams");
}

export async function runStreamNowAction(formData) {
  const auth = await requireAdminPageSession("/admin/streams");
  const streamId = trimText(formData.get("streamId"));

  if (streamId) {
    await runStreamFetch(
      streamId,
      {
        actorId: getActorId(auth),
        triggerType: "manual",
      },
    );
  }

  redirectToPath("/admin/streams");
}

export async function runSchedulerAction() {
  await requireAdminPageSession("/admin");
  await runScheduledStreams();
  redirectToPath("/admin");
}

export async function saveCategoryAction(formData) {
  const auth = await requireAdminPageSession("/admin/categories");

  await saveCategoryRecord(
    {
      description: formData.get("description"),
      id: trimText(formData.get("id")) || undefined,
      name: formData.get("name"),
      slug: formData.get("slug"),
    },
    {
      actorId: getActorId(auth),
    },
  );

  redirectToPath("/admin/categories");
}

export async function deleteCategoryAction(formData) {
  const auth = await requireAdminPageSession("/admin/categories");
  const categoryId = trimText(formData.get("id"));

  if (categoryId) {
    await deleteCategoryRecord(categoryId, {
      actorId: getActorId(auth),
    });
  }

  redirectToPath("/admin/categories");
}

export async function saveTemplateAction(formData) {
  const auth = await requireAdminPageSession("/admin/templates");

  await saveTemplateRecord(
    {
      bodyTemplate: formData.get("bodyTemplate"),
      categoryId: trimText(formData.get("categoryId")) || null,
      hashtagsTemplate: formData.get("hashtagsTemplate"),
      id: trimText(formData.get("id")) || undefined,
      isDefault: getBoolean(formData, "isDefault"),
      locale: formData.get("locale"),
      name: formData.get("name"),
      platform: formData.get("platform"),
      summaryTemplate: formData.get("summaryTemplate"),
      titleTemplate: formData.get("titleTemplate"),
    },
    {
      actorId: getActorId(auth),
    },
  );

  redirectToPath("/admin/templates");
}

export async function updatePostEditorAction(formData) {
  await requireAdminPageSession("/admin/posts");
  const intent = trimText(formData.get("intent")).toLowerCase();
  const postId = trimText(formData.get("postId"));

  await updatePostEditorialRecord({
    action: intent,
    articleMatchId: trimText(formData.get("articleMatchId")) || null,
    categoryIds: formData.getAll("categoryIds").map((value) => trimText(value)),
    contentMd: formData.get("contentMd"),
    editorialStage: formData.get("editorialStage"),
    locale: formData.get("locale"),
    postId,
    publishAt: formData.get("publishAt"),
    slug: formData.get("slug"),
    status:
      intent === "publish"
        ? "PUBLISHED"
        : intent === "schedule"
          ? "SCHEDULED"
          : intent === "archive"
            ? "ARCHIVED"
            : formData.get("status"),
    summary: formData.get("summary"),
    title: formData.get("title"),
  });

  redirectToPath(`/admin/posts/${postId}`);
}

export async function uploadMediaAction(formData) {
  const auth = await requireAdminPageSession("/admin/media");
  const file = formData.get("file");

  if (file && typeof file.arrayBuffer === "function") {
    await uploadMediaAsset(
      {
        alt: formData.get("alt"),
        attributionText: formData.get("attributionText"),
        buffer: Buffer.from(await file.arrayBuffer()),
        caption: formData.get("caption"),
        fileName: file.name || "upload",
        mimeType: file.type || "application/octet-stream",
        sourceUrl: formData.get("sourceUrl"),
      },
      {
        actorId: getActorId(auth),
      },
    );
  }

  redirectToPath("/admin/media");
}

export async function refreshSettingsAction() {
  await requireAdminPageSession("/admin/settings");
  await getSettingsSnapshot();
  redirectToPath("/admin/settings");
}
