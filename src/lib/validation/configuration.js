/**
 * NewsPub configuration validation helpers for destinations, streams, and templates.
 *
 * These checks keep admin-managed platform combinations aligned before fetch or
 * publish workflows depend on them.
 */
import { getProviderRequestValidationIssues } from "@/lib/news/provider-definitions";

function normalizeEnumValue(value) {
  return `${value ?? ""}`.trim().toUpperCase();
}

function formatEnumValue(value) {
  return normalizeEnumValue(value)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createIssue(code, message) {
  return {
    code,
    message,
    severity: "error",
  };
}

export const destinationPlatformValues = Object.freeze(["WEBSITE", "FACEBOOK", "INSTAGRAM"]);

export const destinationKindValues = Object.freeze([
  "WEBSITE",
  "FACEBOOK_PROFILE",
  "FACEBOOK_PAGE",
  "INSTAGRAM_PERSONAL",
  "INSTAGRAM_BUSINESS",
]);

export const streamModeValues = Object.freeze(["AUTO_PUBLISH", "REVIEW_REQUIRED"]);

const destinationKindsByPlatform = Object.freeze({
  FACEBOOK: Object.freeze(["FACEBOOK_PROFILE", "FACEBOOK_PAGE"]),
  INSTAGRAM: Object.freeze(["INSTAGRAM_PERSONAL", "INSTAGRAM_BUSINESS"]),
  WEBSITE: Object.freeze(["WEBSITE"]),
});

const destinationPlatformByKind = Object.freeze(
  Object.entries(destinationKindsByPlatform).reduce((mapping, [platform, kinds]) => {
    for (const kind of kinds) {
      mapping[kind] = platform;
    }

    return mapping;
  }, {}),
);

const autoPublishCapableDestinationKinds = new Set([
  "WEBSITE",
  "FACEBOOK_PAGE",
  "INSTAGRAM_BUSINESS",
]);

/** Returns the canonical destination platform for a given destination kind. */
export function getDestinationPlatformForKind(kind) {
  return destinationPlatformByKind[normalizeEnumValue(kind)] || null;
}

/** Lists the destination kinds that are valid for the provided platform. */
export function getAllowedDestinationKinds(platform) {
  return destinationKindsByPlatform[normalizeEnumValue(platform)] || [];
}

/** Checks whether a destination kind can be used with the selected platform. */
export function isDestinationKindCompatible(platform, kind) {
  const normalizedPlatform = normalizeEnumValue(platform);
  const normalizedKind = normalizeEnumValue(kind);

  if (!normalizedPlatform || !normalizedKind) {
    return true;
  }

  return getDestinationPlatformForKind(normalizedKind) === normalizedPlatform;
}

/** Identifies destination kinds that can run in `AUTO_PUBLISH` mode. */
export function isDestinationKindAutoPublishCapable(kind) {
  return autoPublishCapableDestinationKinds.has(normalizeEnumValue(kind));
}

/** Validates one destination record against the NewsPub platform matrix. */
export function getDestinationValidationIssues(destination = {}) {
  const platform = normalizeEnumValue(destination.platform);
  const kind = normalizeEnumValue(destination.kind);
  const issues = [];

  if (platform && !destinationPlatformValues.includes(platform)) {
    issues.push(
      createIssue(
        "destination_platform_invalid",
        `"${destination.platform}" is not a supported destination platform.`,
      ),
    );
  }

  if (kind && !destinationKindValues.includes(kind)) {
    issues.push(
      createIssue(
        "destination_kind_invalid",
        `"${destination.kind}" is not a supported destination kind.`,
      ),
    );
  }

  if (
    platform
    && destinationPlatformValues.includes(platform)
    && kind
    && destinationKindValues.includes(kind)
    && !isDestinationKindCompatible(platform, kind)
  ) {
    issues.push(
      createIssue(
        "destination_kind_platform_mismatch",
        `${formatEnumValue(kind)} is only compatible with ${formatEnumValue(
          getDestinationPlatformForKind(kind),
        )} destinations, not ${formatEnumValue(platform)}.`,
      ),
    );
  }

  return issues;
}

/** Validates stream settings that depend on the selected destination, template, and provider filters. */
export function getStreamValidationIssues({
  countryAllowlistJson,
  destination,
  languageAllowlistJson,
  locale,
  mode,
  providerDefaults,
  providerFilters,
  providerKey,
  template,
} = {}) {
  const issues = [];
  const normalizedMode = normalizeEnumValue(mode);
  const destinationIssues = getDestinationValidationIssues(destination);
  const normalizedDestinationPlatform = normalizeEnumValue(destination?.platform);
  const normalizedTemplatePlatform = normalizeEnumValue(template?.platform);

  if (destinationIssues.length) {
    for (const issue of destinationIssues) {
      issues.push(
        createIssue(
          `stream_destination_${issue.code}`,
          `The selected destination is incompatible: ${issue.message}`,
        ),
      );
    }
  }

  if (
    normalizedDestinationPlatform
    && normalizedTemplatePlatform
    && normalizedDestinationPlatform !== normalizedTemplatePlatform
  ) {
    issues.push(
      createIssue(
        "stream_template_platform_mismatch",
        `${formatEnumValue(template?.name || normalizedTemplatePlatform)} uses the ${formatEnumValue(
          normalizedTemplatePlatform,
        )} platform, but the selected destination publishes to ${formatEnumValue(
          normalizedDestinationPlatform,
        )}.`,
      ),
    );
  }

  if (
    normalizedMode === "AUTO_PUBLISH"
    && destination?.kind
    && !isDestinationKindAutoPublishCapable(destination.kind)
  ) {
    issues.push(
      createIssue(
        "stream_mode_destination_mismatch",
        `${formatEnumValue(
          destination.kind,
        )} destinations cannot auto-publish. Switch the stream to Review Required or use a publish-capable destination.`,
      ),
    );
  }

  if (providerKey) {
    for (const issue of getProviderRequestValidationIssues(providerKey, {
      countryAllowlistJson,
      languageAllowlistJson,
      locale,
      providerDefaults,
      providerFilters,
    })) {
      issues.push(
        createIssue(
          `stream_${issue.code}`,
          issue.message,
        ),
      );
    }
  }

  return issues;
}

/** Validates one destination template against any linked stream relationships. */
export function getTemplateValidationIssues({ platform, streams = [] } = {}) {
  const issues = [];
  const normalizedPlatform = normalizeEnumValue(platform);
  const linkedDestinationPlatforms = [
    ...new Set(
      (streams || [])
        .map((stream) => normalizeEnumValue(stream?.destination?.platform))
        .filter(Boolean),
    ),
  ];

  if (normalizedPlatform && !destinationPlatformValues.includes(normalizedPlatform)) {
    issues.push(
      createIssue(
        "template_platform_invalid",
        `"${platform}" is not a supported template platform.`,
      ),
    );
  }

  if (linkedDestinationPlatforms.length > 1) {
    issues.push(
      createIssue(
        "template_linked_stream_platforms_mismatch",
        `Linked streams already span multiple destination platforms: ${linkedDestinationPlatforms
          .map(formatEnumValue)
          .join(", ")}. Reassign those streams before saving this template.`,
      ),
    );
  } else if (
    linkedDestinationPlatforms.length === 1
    && normalizedPlatform
    && normalizedPlatform !== linkedDestinationPlatforms[0]
  ) {
    issues.push(
      createIssue(
        "template_linked_stream_platform_mismatch",
        `This template is linked to ${formatEnumValue(
          linkedDestinationPlatforms[0],
        )} streams, so its platform must stay ${formatEnumValue(linkedDestinationPlatforms[0])}.`,
      ),
    );
  }

  return issues;
}

/** Aggregates configuration issues across the admin-managed NewsPub setup. */
export function getConfigurationIssues({ destinations = [], streams = [], templates = [] } = {}) {
  const templateById = new Map((templates || []).map((template) => [template.id, template]));
  const destinationById = new Map((destinations || []).map((destination) => [destination.id, destination]));
  const issues = [];

  for (const destination of destinations || []) {
    for (const issue of getDestinationValidationIssues(destination)) {
      issues.push({
        ...issue,
        entityId: destination.id,
        entityLabel: destination.name || destination.slug || "Destination",
        entityType: "destination",
        location: "/admin/destinations",
      });
    }
  }

  for (const stream of streams || []) {
    const destination = stream.destination || destinationById.get(stream.destinationId) || null;
    const template = stream.defaultTemplate || templateById.get(stream.defaultTemplateId) || null;

    for (const issue of getStreamValidationIssues({
      countryAllowlistJson: stream.countryAllowlistJson,
      destination,
      languageAllowlistJson: stream.languageAllowlistJson,
      locale: stream.locale,
      mode: stream.mode,
      providerDefaults: stream.activeProvider?.requestDefaultsJson,
      providerFilters: stream.settingsJson?.providerFilters,
      providerKey: stream.activeProvider?.providerKey,
      template,
    })) {
      issues.push({
        ...issue,
        entityId: stream.id,
        entityLabel: stream.name || stream.slug || "Stream",
        entityType: "stream",
        location: "/admin/streams",
      });
    }
  }

  for (const template of templates || []) {
    for (const issue of getTemplateValidationIssues(template)) {
      issues.push({
        ...issue,
        entityId: template.id,
        entityLabel: template.name || "Template",
        entityType: "template",
        location: "/admin/templates",
      });
    }
  }

  return issues;
}
