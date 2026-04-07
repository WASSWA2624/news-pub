import { resolvePrismaClient } from "@/lib/news/shared";
import { env } from "@/lib/env/server";
import { getConfigurationIssues } from "@/lib/validation/configuration";

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
  const [locales, providerCount, destinations, streams, templates] = await Promise.all([
    db.locale.findMany({
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    }),
    db.newsProviderConfig.count(),
    db.destination.findMany({
      orderBy: [{ platform: "asc" }, { name: "asc" }],
      select: {
        id: true,
        kind: true,
        name: true,
        platform: true,
        slug: true,
      },
    }),
    db.publishingStream.findMany({
      include: {
        defaultTemplate: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
        destination: {
          select: {
            id: true,
            kind: true,
            name: true,
            platform: true,
            slug: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    }),
    db.destinationTemplate.findMany({
      include: {
        streams: {
          include: {
            destination: {
              select: {
                id: true,
                kind: true,
                name: true,
                platform: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: [{ platform: "asc" }, { name: "asc" }],
    }),
  ]);
  const configurationIssues = getConfigurationIssues({
    destinations,
    streams,
    templates,
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
      destinationCount: destinations.length,
      providerCount,
      streamCount: streams.length,
    },
    toggles: env.observability,
  };
}
