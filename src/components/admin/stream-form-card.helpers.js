/**
 * Pure reset helpers used by the NewsPub stream form.
 */

import { getProviderExecutionLimits } from "@/lib/news/provider-definitions";

function cloneResetValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneResetValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneResetValue(entry)]),
    );
  }

  return value;
}

function normalizePositiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(`${value ?? ""}`, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

/**
 * Returns a reset-safe max-posts value that respects the selected provider's
 * execution limits when they exist.
 *
 * @param {string} providerKey - Selected provider key.
 * @param {string|number} maxPostsPerRun - Candidate max posts value.
 * @param {number} [fallbackValue=5] - Value used when input is empty/invalid.
 * @returns {string} Reset-safe max posts value.
 */
export function resolveResettableMaxPostsPerRun(providerKey, maxPostsPerRun, fallbackValue = 5) {
  const normalizedValue = normalizePositiveInteger(maxPostsPerRun, fallbackValue);
  const providerExecutionLimits = getProviderExecutionLimits(providerKey);
  const maxPostsLimit = providerExecutionLimits.maxPostsPerRun || null;

  if (!maxPostsLimit) {
    return `${normalizedValue}`;
  }

  if (normalizedValue < maxPostsLimit.min) {
    return `${maxPostsLimit.min}`;
  }

  if (normalizedValue > maxPostsLimit.max) {
    return `${maxPostsLimit.max}`;
  }

  return `${normalizedValue}`;
}

/**
 * Creates the stable reset seed captured when the stream form first mounts.
 *
 * @param {object} values - Initial controlled-state values for the form.
 * @returns {object} Cloned seed safe to reuse for reset actions.
 */
export function createStreamFormResetSeed(values = {}) {
  return {
    activeProviderId: `${values.activeProviderId || ""}`,
    defaultTemplateId: `${values.defaultTemplateId || ""}`,
    destinationId: `${values.destinationId || ""}`,
    maxPostsPerRun: resolveResettableMaxPostsPerRun(values.providerKey, values.maxPostsPerRun),
    mode: `${values.mode || ""}`,
    modeWasEdited: Boolean(values.modeWasEdited),
    name: `${values.name || ""}`,
    nameWasEdited: Boolean(values.nameWasEdited),
    postLinkPlacement: `${values.postLinkPlacement || "RANDOM"}`,
    providerFormValues: cloneResetValue(values.providerFormValues || {}),
    runWindowState: cloneResetValue(values.runWindowState || {}),
    slug: `${values.slug || ""}`,
    slugWasEdited: Boolean(values.slugWasEdited),
    status: `${values.status || ""}`,
  };
}

/**
 * Applies a reset seed to the stream form's controlled-state setters.
 *
 * @param {object} seed - Seed created by createStreamFormResetSeed.
 * @param {object} setters - State setters from the form component.
 * @returns {object} The normalized seed that was applied.
 */
export function applyStreamFormResetSeed(seed = {}, setters = {}) {
  const normalizedSeed = createStreamFormResetSeed(seed);

  setters.setName?.(normalizedSeed.name);
  setters.setSlug?.(normalizedSeed.slug);
  setters.setActiveProviderId?.(normalizedSeed.activeProviderId);
  setters.setDestinationId?.(normalizedSeed.destinationId);
  setters.setDefaultTemplateId?.(normalizedSeed.defaultTemplateId);
  setters.setMode?.(normalizedSeed.mode);
  setters.setStatus?.(normalizedSeed.status);
  setters.setMaxPostsPerRun?.(normalizedSeed.maxPostsPerRun);
  setters.setPostLinkPlacement?.(normalizedSeed.postLinkPlacement);
  setters.setProviderFormValues?.(cloneResetValue(normalizedSeed.providerFormValues));
  setters.setRunWindowState?.(cloneResetValue(normalizedSeed.runWindowState));
  setters.setNameWasEdited?.(normalizedSeed.nameWasEdited);
  setters.setSlugWasEdited?.(normalizedSeed.slugWasEdited);
  setters.setModeWasEdited?.(normalizedSeed.modeWasEdited);

  return normalizedSeed;
}
