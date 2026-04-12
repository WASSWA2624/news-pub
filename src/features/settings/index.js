/**
 * Feature services for NewsPub operational settings and runtime-health snapshots.
 */

import { resolvePrismaClient } from "@/lib/news/shared";
import { env } from "@/lib/env/server";
import { getConfigurationIssues } from "@/lib/validation/configuration";

const settingsSnapshotLimit = 200;

/**
 * Resolves the current assistive-AI runtime state for the admin settings
 * snapshot without making AI a hard prerequisite for NewsPub workflows.
 *
 * @returns {object} Runtime status and explanatory copy for the AI layer.
 */
function getAiRuntimeSnapshot() {
  if (!env.ai.enabled) {
    return {
      credentialsConfigured: Boolean(env.ai.openaiApiKey),
      enabled: false,
      model: env.ai.model,
      requestTimeoutMs: env.ai.requestTimeoutMs,
      runtimeMode: "Deterministic only",
      status: "DISABLED",
      summary:
        "AI optimization is intentionally disabled. NewsPub stays operational with deterministic formatting and manual editorial review.",
    };
  }

  if (!env.ai.openaiApiKey) {
    return {
      credentialsConfigured: false,
      enabled: true,
      model: env.ai.model,
      requestTimeoutMs: env.ai.requestTimeoutMs,
      runtimeMode: "Deterministic fallback only",
      status: "MISCONFIGURED",
      summary:
        "AI optimization is enabled in configuration but credentials are missing, so NewsPub will skip AI and keep deterministic handling active.",
    };
  }

  return {
    credentialsConfigured: true,
    enabled: true,
    model: env.ai.model,
    requestTimeoutMs: env.ai.requestTimeoutMs,
    runtimeMode: "Assistive AI with deterministic fallback",
    status: "READY",
    summary:
      "AI optimization is available as an assistive layer. NewsPub still falls back deterministically whenever AI is unhealthy or unavailable.",
  };
}

/**
 * Returns the admin settings snapshot, including bounded runtime toggles,
 * AI runtime state, and configuration compatibility findings.
 *
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Settings, runtime, and health data for the admin page.
 */
export async function getSettingsSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [
    locales,
    providerCount,
    destinationCount,
    streamCount,
    templateCount,
    destinations,
    streams,
    templates,
  ] = await Promise.all([
    db.locale.findMany({
      orderBy: [{ is_default: "desc" }, { code: "asc" }],
    }),
    db.newsProviderConfig.count(),
    db.destination.count(),
    db.publishingStream.count(),
    db.destinationTemplate.count(),
    db.destination.findMany({
      orderBy: [{ platform: "asc" }, { name: "asc" }],
      select: {
        id: true,
        kind: true,
        name: true,
        platform: true,
        slug: true,
      },
      take: settingsSnapshotLimit,
    }),
    db.publishingStream.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        activeProvider: {
          select: {
            id: true,
            provider_key: true,
            request_defaults_json: true,
          },
        },
        country_allowlist_json: true,
        default_template_id: true,
        defaultTemplate: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
        destination_id: true,
        destination: {
          select: {
            id: true,
            kind: true,
            name: true,
            platform: true,
            slug: true,
          },
        },
        id: true,
        language_allowlist_json: true,
        locale: true,
        max_posts_per_run: true,
        mode: true,
        name: true,
        settings_json: true,
        slug: true,
      },
      take: settingsSnapshotLimit,
    }),
    db.destinationTemplate.findMany({
      orderBy: [{ platform: "asc" }, { name: "asc" }],
      select: {
        id: true,
        is_default: true,
        name: true,
        platform: true,
      },
      take: settingsSnapshotLimit,
    }),
  ]);
  const streamsByTemplateId = streams.reduce((result, stream) => {
    if (!stream.default_template_id) {
      return result;
    }

    const templateStreams = result.get(stream.default_template_id) || [];

    templateStreams.push(stream);
    result.set(stream.default_template_id, templateStreams);

    return result;
  }, new Map());
  const templatesForValidation = templates.map((template) => ({
    ...template,
    streams: streamsByTemplateId.get(template.id) || [],
  }));
  const configurationIssues = getConfigurationIssues({
    destinations,
    streams,
    templates: templatesForValidation,
  });

  return {
    ai: getAiRuntimeSnapshot(),
    configurationIssues,
    locales,
    scheduler: env.scheduler,
    storage: {
      driver: env.media.driver,
      maxRemoteFileBytes: env.media.maxRemoteFileBytes,
      uploadAllowedMimeTypes: env.media.uploadAllowedMimeTypes,
    },
    summary: {
      configurationIssueCount: configurationIssues.length,
      destinationCount,
      providerCount,
      streamCount,
      templateCount,
    },
    toggles: env.observability,
  };
}
