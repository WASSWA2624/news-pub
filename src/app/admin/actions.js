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
import {
  MULTI_VALUE_EMPTY_SENTINEL,
  sanitizeProviderFieldValues,
} from "@/lib/news/provider-definitions";
import { retryPublishAttempt, runScheduledStreams, runStreamFetch } from "@/lib/news/workflows";

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

function parseRepeatedField(formData, key) {
  return formData
    .getAll(key)
    .map((value) => trimText(value))
    .filter((value) => value && value !== MULTI_VALUE_EMPTY_SENTINEL);
}

function parseScopedFields(formData, prefix) {
  const groupedEntries = new Map();

  for (const [rawKey, rawValue] of formData.entries()) {
    if (!rawKey.startsWith(prefix)) {
      continue;
    }

    const key = trimText(rawKey.slice(prefix.length));
    const value = trimText(rawValue);

    if (!key) {
      continue;
    }

    if (!groupedEntries.has(key)) {
      groupedEntries.set(key, []);
    }

    groupedEntries.get(key).push(value);
  }

  return [...groupedEntries.entries()].reduce((result, [key, values]) => {
    const hadSentinel = values.includes(MULTI_VALUE_EMPTY_SENTINEL);
    const cleanedValues = values.filter(
      (value) => value && value !== MULTI_VALUE_EMPTY_SENTINEL,
    );

    result[key] = values.length > 1 || hadSentinel ? cleanedValues : cleanedValues[0] || "";

    return result;
  }, {});
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
  const providerKey = trimText(formData.get("providerKey")).toLowerCase();

  await saveProviderRecord(
    {
      baseUrl: formData.get("baseUrl"),
      description: formData.get("description"),
      isDefault: getBoolean(formData, "isDefault"),
      isEnabled: getBoolean(formData, "isEnabled"),
      isSelectable: getBoolean(formData, "isSelectable"),
      label: formData.get("label"),
      providerKey,
      requestDefaultsJson: sanitizeProviderFieldValues(
        providerKey,
        parseScopedFields(formData, "requestDefault."),
      ),
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
      categoryIds: parseRepeatedField(formData, "categoryIds"),
      countryAllowlistJson: parseRepeatedField(formData, "countryAllowlistJson"),
      defaultTemplateId: formData.get("defaultTemplateId"),
      description: formData.get("description"),
      destinationId: formData.get("destinationId"),
      duplicateWindowHours: formData.get("duplicateWindowHours"),
      excludeKeywordsJson: formData.get("excludeKeywordsJson"),
      includeKeywordsJson: formData.get("includeKeywordsJson"),
      languageAllowlistJson: parseRepeatedField(formData, "languageAllowlistJson"),
      locale: formData.get("locale"),
      maxPostsPerRun: formData.get("maxPostsPerRun"),
      mode: formData.get("mode"),
      name: formData.get("name"),
      providerFilters: parseScopedFields(formData, "providerFilter."),
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

export async function runSelectedStreamsAction(formData) {
  const auth = await requireAdminPageSession("/admin/streams");
  const streamIds = parseRepeatedField(formData, "streamIds");

  for (const streamId of streamIds) {
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

export async function retryPublishAttemptAction(formData) {
  const auth = await requireAdminPageSession("/admin/jobs");
  const attemptId = trimText(formData.get("attemptId"));
  const returnTo = trimText(formData.get("returnTo")) || "/admin/jobs";

  if (attemptId) {
    await retryPublishAttempt(attemptId, {
      actorId: getActorId(auth),
    });
  }

  redirectToPath(returnTo);
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
