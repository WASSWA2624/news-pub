import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { MULTI_VALUE_EMPTY_SENTINEL } from "@/lib/news/provider-definitions";

/**
 * Normalizes a form field into a trimmed string.
 *
 * @param {FormDataEntryValue | null | undefined} value - Raw form value.
 * @returns {string} The trimmed string value or an empty string.
 */
export function trimFormValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads a checkbox-style boolean from form data.
 *
 * @param {FormData} formData - Submitted form data.
 * @param {string} key - Field name to read.
 * @returns {boolean} Whether the checkbox-style field is enabled.
 */
export function getFormBoolean(formData, key) {
  return formData.get(key) === "on";
}

/**
 * Parses a JSON object field from form data and falls back safely on invalid input.
 *
 * @param {FormData} formData - Submitted form data.
 * @param {string} key - Field name to read.
 * @param {object} [fallbackValue={}] - Safe fallback when parsing fails.
 * @returns {object} The parsed JSON object or the fallback value.
 */
export function parseJsonFormField(formData, key, fallbackValue = {}) {
  const rawValue = trimFormValue(formData.get(key));

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
}

/**
 * Collects repeated form values while removing empty sentinel entries.
 *
 * @param {FormData} formData - Submitted form data.
 * @param {string} key - Field name to read.
 * @returns {string[]} Cleaned repeated values.
 */
export function parseRepeatedFormField(formData, key) {
  return formData
    .getAll(key)
    .map((value) => trimFormValue(value))
    .filter((value) => value && value !== MULTI_VALUE_EMPTY_SENTINEL);
}

/**
 * Collects prefixed form fields into an object keyed by the suffix after the prefix.
 *
 * @param {FormData} formData - Submitted form data.
 * @param {string} prefix - Prefix used to group fields.
 * @returns {Record<string, string | string[]>} Scoped field values keyed by their suffix.
 */
export function parseScopedFormFields(formData, prefix) {
  const groupedEntries = new Map();

  for (const [rawKey, rawValue] of formData.entries()) {
    if (!rawKey.startsWith(prefix)) {
      continue;
    }

    const key = trimFormValue(rawKey.slice(prefix.length));
    const value = trimFormValue(rawValue);

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

/**
 * Resolves the signed-in admin id used for audit and workflow logging.
 *
 * @param {object|null|undefined} auth - Auth result returned by admin session helpers.
 * @returns {string|null} The actor id or `null` when unavailable.
 */
export function getActionActorId(auth) {
  return auth?.user?.id || null;
}

/**
 * Revalidates a path and redirects the current server action to it.
 *
 * @param {string} pathname - Path to revalidate and redirect to.
 * @returns {never} This helper always redirects.
 */
export function redirectWithRevalidation(pathname) {
  revalidatePath(pathname);
  redirect(pathname);
}

/**
 * Revalidates a path and redirects back with a normalized `error` query string.
 *
 * @param {string} pathname - Base return path for the failing action.
 * @param {unknown} error - Action failure to normalize for the UI.
 * @param {string} fallbackMessage - Safe message shown when the error is unknown.
 * @returns {never} This helper always redirects.
 */
export function redirectWithActionError(pathname, error, fallbackMessage) {
  const message =
    error instanceof Error && trimFormValue(error.message)
      ? trimFormValue(error.message)
      : fallbackMessage;

  revalidatePath(pathname);
  redirect(`${pathname}?error=${encodeURIComponent(message)}`);
}
