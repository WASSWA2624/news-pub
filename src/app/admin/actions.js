"use server";

/**
 * Server actions that power NewsPub admin forms, manual runs, editorial updates, and media uploads.
 */

import { deleteCategoryRecord, saveCategoryRecord } from "@/features/categories";
import { deleteDestinationRecord, saveDestinationRecord } from "@/features/destinations";
import { uploadMediaAsset } from "@/features/media";
import { saveTemplateRecord } from "@/features/templates";
import { getSettingsSnapshot } from "@/features/settings";
import { saveProviderRecord } from "@/features/providers";
import { createManualPostRecord, repostPostRecord, updatePostEditorialRecord } from "@/features/posts";
import { deleteStreamRecord, saveStreamRecord } from "@/features/streams";
import {
  getActionActorId,
  getFormBoolean,
  parseJsonFormField,
  parseRepeatedFormField,
  parseScopedFormFields,
  redirectWithActionError,
  redirectWithRevalidation,
  trimFormValue,
} from "@/lib/admin/action-utils";
import { requireAdminPageSession } from "@/lib/auth";
import { sanitizeProviderFieldValues } from "@/lib/news/provider-definitions";
import {
  retryPublishAttempt,
  runMultipleStreamFetches,
  runScheduledStreams,
  runStreamFetch,
} from "@/lib/news/workflows";

/**
 * Saves a provider definition from the admin providers form.
 *
 * @param {FormData} formData - Submitted provider form data.
 * @returns {Promise<never>} Always redirects back to the providers workspace.
 */
export async function saveProviderAction(formData) {
  const auth = await requireAdminPageSession("/admin/providers");
  const providerKey = trimFormValue(formData.get("providerKey")).toLowerCase();

  try {
    await saveProviderRecord(
      {
        baseUrl: formData.get("baseUrl"),
        description: formData.get("description"),
        isDefault: getFormBoolean(formData, "isDefault"),
        isEnabled: getFormBoolean(formData, "isEnabled"),
        isSelectable: getFormBoolean(formData, "isSelectable"),
        label: formData.get("label"),
        providerKey,
        requestDefaultsJson: sanitizeProviderFieldValues(
          providerKey,
          parseScopedFormFields(formData, "requestDefault."),
        ),
      },
      {
        actorId: getActionActorId(auth),
      },
    );
  } catch (error) {
    redirectWithActionError("/admin/providers", error, "Provider save failed.");
  }

  redirectWithRevalidation("/admin/providers");
}

/**
 * Saves a destination definition from the admin destinations form.
 *
 * @param {FormData} formData - Submitted destination form data.
 * @returns {Promise<never>} Always redirects back to the destinations workspace.
 */
export async function saveDestinationAction(formData) {
  const auth = await requireAdminPageSession("/admin/destinations");

  await saveDestinationRecord(
    {
      accountHandle: formData.get("accountHandle"),
      clearToken: getFormBoolean(formData, "clearToken"),
      connectionError: formData.get("connectionError"),
      connectionStatus: formData.get("connectionStatus"),
      externalAccountId: formData.get("externalAccountId"),
      graphApiBaseUrl: formData.get("graphApiBaseUrl"),
      instagramUserId: formData.get("instagramUserId"),
      kind: formData.get("kind"),
      metaDiscoverySourceKey: formData.get("metaDiscoverySourceKey"),
      metaDiscoveryTargetId: formData.get("metaDiscoveryTargetId"),
      metaDiscoveryTargetType: formData.get("metaDiscoveryTargetType"),
      name: formData.get("name"),
      pageId: formData.get("pageId"),
      platform: formData.get("platform"),
      profileId: formData.get("profileId"),
      socialGuardrails: {
        duplicateCooldownHours: formData.get("socialGuardrail.duplicateCooldownHours"),
        facebookMaxPostsPer24Hours: formData.get("socialGuardrail.facebookMaxPostsPer24Hours"),
        instagramMaxHashtags: formData.get("socialGuardrail.instagramMaxHashtags"),
        instagramMaxPostsPer24Hours: formData.get("socialGuardrail.instagramMaxPostsPer24Hours"),
        minPostIntervalMinutes: formData.get("socialGuardrail.minPostIntervalMinutes"),
      },
      settingsJson: parseJsonFormField(formData, "settingsJson", {}),
      slug: formData.get("slug"),
      token: formData.get("token"),
    },
    {
      actorId: getActionActorId(auth),
    },
  );

  redirectWithRevalidation("/admin/destinations");
}

/**
 * Deletes a destination and returns the admin UI to the destinations workspace.
 *
 * @param {FormData} formData - Submitted destination delete payload.
 * @returns {Promise<never>} Always redirects after completion.
 */
export async function deleteDestinationAction(formData) {
  const auth = await requireAdminPageSession("/admin/destinations");
  const destinationId = trimFormValue(formData.get("id"));

  try {
    if (destinationId) {
      await deleteDestinationRecord(destinationId, {
        actorId: getActionActorId(auth),
      });
    }
  } catch (error) {
    redirectWithActionError("/admin/destinations", error, "Destination deletion failed.");
  }

  redirectWithRevalidation("/admin/destinations");
}

/**
 * Saves a publishing stream from the admin streams form.
 *
 * @param {FormData} formData - Submitted stream form data.
 * @returns {Promise<never>} Always redirects back to the streams workspace.
 */
export async function saveStreamAction(formData) {
  const auth = await requireAdminPageSession("/admin/streams");

  try {
    await saveStreamRecord(
      {
        activeProviderId: formData.get("activeProviderId"),
        categoryIds: parseRepeatedFormField(formData, "categoryIds"),
        countryAllowlistJson: parseRepeatedFormField(formData, "countryAllowlistJson"),
        defaultTemplateId: formData.get("defaultTemplateId"),
        description: formData.get("description"),
        destinationId: formData.get("destinationId"),
        duplicateWindowHours: formData.get("duplicateWindowHours"),
        excludeKeywordsJson: formData.get("excludeKeywordsJson"),
        includeKeywordsJson: formData.get("includeKeywordsJson"),
        languageAllowlistJson: parseRepeatedFormField(formData, "languageAllowlistJson"),
        locale: formData.get("locale"),
        maxPostsPerRun: formData.get("maxPostsPerRun"),
        mode: formData.get("mode"),
        name: formData.get("name"),
        postLinkPlacement: formData.get("postLinkPlacement"),
        postLinkUrl: formData.get("postLinkUrl"),
        providerFilters: parseScopedFormFields(formData, "providerFilter."),
        retryBackoffMinutes: formData.get("retryBackoffMinutes"),
        retryLimit: formData.get("retryLimit"),
        scheduleIntervalMinutes: formData.get("scheduleIntervalMinutes"),
        slug: formData.get("slug"),
        status: formData.get("status"),
        timezone: formData.get("timezone"),
      },
      {
        actorId: getActionActorId(auth),
      },
    );
  } catch (error) {
    redirectWithActionError("/admin/streams", error, "Stream save failed.");
  }

  redirectWithRevalidation("/admin/streams");
}

/**
 * Deletes a publishing stream from the admin workspace.
 *
 * @param {FormData} formData - Submitted stream delete payload.
 * @returns {Promise<never>} Always redirects after completion.
 */
export async function deleteStreamAction(formData) {
  const auth = await requireAdminPageSession("/admin/streams");
  const streamId = trimFormValue(formData.get("id"));

  try {
    if (streamId) {
      await deleteStreamRecord(streamId, {
        actorId: getActionActorId(auth),
      });
    }
  } catch (error) {
    redirectWithActionError("/admin/streams", error, "Stream deletion failed.");
  }

  redirectWithRevalidation("/admin/streams");
}

/**
 * Runs a single publishing stream immediately from the admin workspace.
 *
 * @param {FormData} formData - Submitted run-now form data.
 * @returns {Promise<never>} Always redirects back to the streams workspace.
 */
export async function runStreamNowAction(formData) {
  const auth = await requireAdminPageSession("/admin/streams");
  const streamId = trimFormValue(formData.get("streamId"));

  if (streamId) {
    await runStreamFetch(
      streamId,
      {
        actorId: getActionActorId(auth),
        triggerType: "manual",
      },
    );
  }

  redirectWithRevalidation("/admin/streams");
}

/**
 * Runs the currently selected publishing streams from the admin workspace.
 *
 * @param {FormData} formData - Submitted batch run payload.
 * @returns {Promise<never>} Always redirects back to the streams workspace.
 */
export async function runSelectedStreamsAction(formData) {
  const auth = await requireAdminPageSession("/admin/streams");
  const streamIds = parseRepeatedFormField(formData, "streamIds");

  if (streamIds.length) {
    await runMultipleStreamFetches(
      streamIds,
      {
        actorId: getActionActorId(auth),
        triggerType: "manual",
      },
    );
  }

  redirectWithRevalidation("/admin/streams");
}

/**
 * Runs the scheduler pass manually from the admin dashboard.
 *
 * @returns {Promise<never>} Always redirects back to the dashboard.
 */
export async function runSchedulerAction() {
  await requireAdminPageSession("/admin");
  await runScheduledStreams();
  redirectWithRevalidation("/admin");
}

/**
 * Retries a failed publish attempt from the jobs screen.
 *
 * @param {FormData} formData - Submitted retry payload.
 * @returns {Promise<never>} Always redirects back to the chosen return path.
 */
export async function retryPublishAttemptAction(formData) {
  const auth = await requireAdminPageSession("/admin/jobs");
  const attemptId = trimFormValue(formData.get("attemptId"));
  const returnTo = trimFormValue(formData.get("returnTo")) || "/admin/jobs";

  if (attemptId) {
    await retryPublishAttempt(attemptId, {
      actorId: getActionActorId(auth),
    });
  }

  redirectWithRevalidation(returnTo);
}

/**
 * Reposts a published story from the editorial workspace.
 *
 * @param {FormData} formData - Submitted repost payload.
 * @returns {Promise<never>} Always redirects back to the chosen return path.
 */
export async function repostPostAction(formData) {
  const auth = await requireAdminPageSession("/admin");
  const postId = trimFormValue(formData.get("postId"));
  const articleMatchId = trimFormValue(formData.get("articleMatchId")) || null;
  const returnTo =
    trimFormValue(formData.get("returnTo")) || (postId ? `/admin/posts/${postId}` : "/admin/posts");

  if (postId) {
    await repostPostRecord(
      {
        articleMatchId,
        postId,
      },
      {
        actorId: getActionActorId(auth),
      },
    );
  }

  redirectWithRevalidation(returnTo);
}

/**
 * Saves a category from the admin categories form.
 *
 * @param {FormData} formData - Submitted category form data.
 * @returns {Promise<never>} Always redirects back to categories.
 */
export async function saveCategoryAction(formData) {
  const auth = await requireAdminPageSession("/admin/categories");

  await saveCategoryRecord(
    {
      description: formData.get("description"),
      id: trimFormValue(formData.get("id")) || undefined,
      name: formData.get("name"),
      slug: formData.get("slug"),
    },
    {
      actorId: getActionActorId(auth),
    },
  );

  redirectWithRevalidation("/admin/categories");
}

/**
 * Deletes a category from the admin categories workspace.
 *
 * @param {FormData} formData - Submitted category delete payload.
 * @returns {Promise<never>} Always redirects back to categories.
 */
export async function deleteCategoryAction(formData) {
  const auth = await requireAdminPageSession("/admin/categories");
  const categoryId = trimFormValue(formData.get("id"));

  if (categoryId) {
    await deleteCategoryRecord(categoryId, {
      actorId: getActionActorId(auth),
    });
  }

  redirectWithRevalidation("/admin/categories");
}

/**
 * Saves a template from the admin templates form.
 *
 * @param {FormData} formData - Submitted template form data.
 * @returns {Promise<never>} Always redirects back to templates.
 */
export async function saveTemplateAction(formData) {
  const auth = await requireAdminPageSession("/admin/templates");

  await saveTemplateRecord(
    {
      bodyTemplate: formData.get("bodyTemplate"),
      categoryId: trimFormValue(formData.get("categoryId")) || null,
      hashtagsTemplate: formData.get("hashtagsTemplate"),
      id: trimFormValue(formData.get("id")) || undefined,
      isDefault: getFormBoolean(formData, "isDefault"),
      locale: formData.get("locale"),
      name: formData.get("name"),
      platform: formData.get("platform"),
      summaryTemplate: formData.get("summaryTemplate"),
      titleTemplate: formData.get("titleTemplate"),
    },
    {
      actorId: getActionActorId(auth),
    },
  );

  redirectWithRevalidation("/admin/templates");
}

/**
 * Creates a manual post from the admin editor launch form.
 *
 * @param {FormData} formData - Submitted manual post form data.
 * @returns {Promise<never>} Always redirects to the newly created editor route.
 */
export async function createManualPostAction(formData) {
  const auth = await requireAdminPageSession("/admin/posts/new");
  const intent = trimFormValue(formData.get("intent")).toLowerCase();
  const record = await createManualPostRecord(
    {
      action: intent,
      categoryIds: formData.getAll("categoryIds").map((value) => trimFormValue(value)),
      contentMd: formData.get("contentMd"),
      publishAt: formData.get("publishAt"),
      slug: formData.get("slug"),
      sourceName: formData.get("sourceName"),
      sourceUrl: formData.get("sourceUrl"),
      status:
        intent === "publish"
          ? "PUBLISHED"
          : intent === "schedule"
            ? "SCHEDULED"
            : "DRAFT",
      streamId: formData.get("streamId"),
      summary: formData.get("summary"),
      title: formData.get("title"),
    },
    {
      actorId: getActionActorId(auth),
    },
  );

  redirectWithRevalidation(`/admin/posts/${record.postId}`);
}

/**
 * Saves editorial changes for an existing post editor session.
 *
 * @param {FormData} formData - Submitted editorial form data.
 * @returns {Promise<never>} Always redirects back to the post editor.
 */
export async function updatePostEditorAction(formData) {
  await requireAdminPageSession("/admin/posts");
  const intent = trimFormValue(formData.get("intent")).toLowerCase();
  const postId = trimFormValue(formData.get("postId"));

  await updatePostEditorialRecord({
    action: intent,
    articleMatchId: trimFormValue(formData.get("articleMatchId")) || null,
    categoryIds: formData.getAll("categoryIds").map((value) => trimFormValue(value)),
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

  redirectWithRevalidation(`/admin/posts/${postId}`);
}

/**
 * Uploads a media asset from the admin media library form.
 *
 * @param {FormData} formData - Submitted media upload form data.
 * @returns {Promise<never>} Always redirects back to the media library.
 */
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
        actorId: getActionActorId(auth),
      },
    );
  }

  redirectWithRevalidation("/admin/media");
}

/**
 * Refreshes the settings snapshot and returns to the admin settings workspace.
 *
 * @returns {Promise<never>} Always redirects back to settings.
 */
export async function refreshSettingsAction() {
  await requireAdminPageSession("/admin/settings");
  await getSettingsSnapshot();
  redirectWithRevalidation("/admin/settings");
}
