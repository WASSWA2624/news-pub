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
  const provider_key = trimFormValue(formData.get("provider_key")).toLowerCase();

  try {
    await saveProviderRecord(
      {
        base_url: formData.get("base_url"),
        description: formData.get("description"),
        is_default: getFormBoolean(formData, "is_default"),
        is_enabled: getFormBoolean(formData, "is_enabled"),
        is_selectable: getFormBoolean(formData, "is_selectable"),
        label: formData.get("label"),
        provider_key,
        request_defaults_json: sanitizeProviderFieldValues(
          provider_key,
          parseScopedFormFields(formData, "requestDefault."),
        ),
      },
      {
        actor_id: getActionActorId(auth),
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
      account_handle: formData.get("account_handle"),
      clearToken: getFormBoolean(formData, "clearToken"),
      connection_error: formData.get("connection_error"),
      connection_status: formData.get("connection_status"),
      external_account_id: formData.get("external_account_id"),
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
      settings_json: parseJsonFormField(formData, "settings_json", {}),
      slug: formData.get("slug"),
      token: formData.get("token"),
    },
    {
      actor_id: getActionActorId(auth),
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
  const destination_id = trimFormValue(formData.get("id"));

  try {
    if (destination_id) {
      await deleteDestinationRecord(destination_id, {
        actor_id: getActionActorId(auth),
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
        active_provider_id: formData.get("active_provider_id"),
        categoryIds: parseRepeatedFormField(formData, "categoryIds"),
        country_allowlist_json: parseRepeatedFormField(formData, "country_allowlist_json"),
        default_template_id: formData.get("default_template_id"),
        description: formData.get("description"),
        destination_id: formData.get("destination_id"),
        duplicate_window_hours: formData.get("duplicate_window_hours"),
        exclude_keywords_json: formData.get("exclude_keywords_json"),
        include_keywords_json: formData.get("include_keywords_json"),
        language_allowlist_json: parseRepeatedFormField(formData, "language_allowlist_json"),
        locale: formData.get("locale"),
        max_posts_per_run: formData.get("max_posts_per_run"),
        mode: formData.get("mode"),
        name: formData.get("name"),
        postLinkPlacement: formData.get("postLinkPlacement"),
        postLinkUrl: formData.get("postLinkUrl"),
        providerFilters: parseScopedFormFields(formData, "providerFilter."),
        retry_backoff_minutes: formData.get("retry_backoff_minutes"),
        retry_limit: formData.get("retry_limit"),
        schedule_interval_minutes: formData.get("schedule_interval_minutes"),
        slug: formData.get("slug"),
        status: formData.get("status"),
        timezone: formData.get("timezone"),
      },
      {
        actor_id: getActionActorId(auth),
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
  const stream_id = trimFormValue(formData.get("id"));

  try {
    if (stream_id) {
      await deleteStreamRecord(stream_id, {
        actor_id: getActionActorId(auth),
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
  const stream_id = trimFormValue(formData.get("stream_id"));

  if (stream_id) {
    await runStreamFetch(
      stream_id,
      {
        actor_id: getActionActorId(auth),
        trigger_type: "manual",
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
        actor_id: getActionActorId(auth),
        trigger_type: "manual",
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
      actor_id: getActionActorId(auth),
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
  const post_id = trimFormValue(formData.get("post_id"));
  const article_match_id = trimFormValue(formData.get("article_match_id")) || null;
  const returnTo =
    trimFormValue(formData.get("returnTo")) || (post_id ? `/admin/posts/${post_id}` : "/admin/posts");

  if (post_id) {
    await repostPostRecord(
      {
        article_match_id,
        post_id,
      },
      {
        actor_id: getActionActorId(auth),
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
      actor_id: getActionActorId(auth),
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
  const category_id = trimFormValue(formData.get("id"));

  if (category_id) {
    await deleteCategoryRecord(category_id, {
      actor_id: getActionActorId(auth),
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
      body_template: formData.get("body_template"),
      category_id: trimFormValue(formData.get("category_id")) || null,
      hashtags_template: formData.get("hashtags_template"),
      id: trimFormValue(formData.get("id")) || undefined,
      is_default: getFormBoolean(formData, "is_default"),
      locale: formData.get("locale"),
      name: formData.get("name"),
      platform: formData.get("platform"),
      summary_template: formData.get("summary_template"),
      title_template: formData.get("title_template"),
    },
    {
      actor_id: getActionActorId(auth),
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
      content_md: formData.get("content_md"),
      publishAt: formData.get("publishAt"),
      slug: formData.get("slug"),
      source_name: formData.get("source_name"),
      source_url: formData.get("source_url"),
      status:
        intent === "publish"
          ? "PUBLISHED"
          : intent === "schedule"
            ? "SCHEDULED"
            : "DRAFT",
      stream_id: formData.get("stream_id"),
      summary: formData.get("summary"),
      title: formData.get("title"),
    },
    {
      actor_id: getActionActorId(auth),
    },
  );

  redirectWithRevalidation(`/admin/posts/${record.post_id}`);
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
  const post_id = trimFormValue(formData.get("post_id"));

  await updatePostEditorialRecord({
    action: intent,
    article_match_id: trimFormValue(formData.get("article_match_id")) || null,
    categoryIds: formData.getAll("categoryIds").map((value) => trimFormValue(value)),
    content_md: formData.get("content_md"),
    editorial_stage: formData.get("editorial_stage"),
    locale: formData.get("locale"),
    post_id,
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

  redirectWithRevalidation(`/admin/posts/${post_id}`);
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
        attribution_text: formData.get("attribution_text"),
        buffer: Buffer.from(await file.arrayBuffer()),
        caption: formData.get("caption"),
        file_name: file.name || "upload",
        mime_type: file.type || "application/octet-stream",
        source_url: formData.get("source_url"),
      },
      {
        actor_id: getActionActorId(auth),
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
