import { SourceType } from "@prisma/client";
import { z } from "zod";

import { sanitizeExternalUrl, sanitizeMediaUrl } from "@/lib/security";

const RELEASE_1_LOCALE = "en";

export const researchSourcePriority = Object.freeze([
  SourceType.OFFICIAL_MANUFACTURER_WEBSITE,
  SourceType.OFFICIAL_PRODUCT_PAGE,
  SourceType.OFFICIAL_MANUAL,
  SourceType.OFFICIAL_DISTRIBUTOR_DOCUMENTATION,
  SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
  SourceType.TRUSTED_PROFESSIONAL_SOCIETY,
  SourceType.REPUTABLE_EDUCATIONAL_INSTITUTION,
  SourceType.APPROVED_SEARCH_RESULT,
]);

const sourceTypeSchema = z.enum(researchSourcePriority);

const officialManufacturerSourceTypes = new Set([SourceType.OFFICIAL_MANUFACTURER_WEBSITE]);
const officialModelSourceTypes = new Set([
  SourceType.OFFICIAL_PRODUCT_PAGE,
  SourceType.OFFICIAL_MANUAL,
]);
const distributorSourceTypes = new Set([SourceType.OFFICIAL_DISTRIBUTOR_DOCUMENTATION]);
const biomedicalOrEducationalSourceTypes = new Set([
  SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
  SourceType.REPUTABLE_EDUCATIONAL_INSTITUTION,
]);

const severityWeights = Object.freeze({
  CRITICAL: 4,
  HIGH: 3,
  LOW: 1,
  MEDIUM: 2,
  UNKNOWN: 0,
});

export const researchSourceTypeLabels = Object.freeze({
  [SourceType.APPROVED_SEARCH_RESULT]: "Approved search result",
  [SourceType.OFFICIAL_DISTRIBUTOR_DOCUMENTATION]: "Official distributor documentation",
  [SourceType.OFFICIAL_MANUAL]: "Official manual or service document",
  [SourceType.OFFICIAL_MANUFACTURER_WEBSITE]: "Official manufacturer website",
  [SourceType.OFFICIAL_PRODUCT_PAGE]: "Official product page",
  [SourceType.REPUTABLE_EDUCATIONAL_INSTITUTION]: "Reputable educational institution",
  [SourceType.TRUSTED_BIOMEDICAL_REFERENCE]: "Trusted biomedical reference",
  [SourceType.TRUSTED_PROFESSIONAL_SOCIETY]: "Trusted professional society",
});

export const defaultResearchSourceConfigs = Object.freeze([
  Object.freeze({
    allowedDomainsJson: [],
    isEnabled: true,
    name: "Official Manufacturer Websites",
    notes:
      "Highest-priority tier. Validate against manufacturer-owned domains discovered for the canonical equipment or manufacturer record.",
    priority: 1,
    sourceType: SourceType.OFFICIAL_MANUFACTURER_WEBSITE,
  }),
  Object.freeze({
    allowedDomainsJson: [],
    isEnabled: true,
    name: "Official Product Pages",
    notes:
      "Use official product-detail pages that are hosted on manufacturer-controlled domains and tied to the target equipment type.",
    priority: 2,
    sourceType: SourceType.OFFICIAL_PRODUCT_PAGE,
  }),
  Object.freeze({
    allowedDomainsJson: [],
    isEnabled: true,
    name: "Official Manuals And Service Documents",
    notes:
      "Accept official manuals, brochures, IFUs, and service documentation that can be linked back to the manufacturer or product owner.",
    priority: 3,
    sourceType: SourceType.OFFICIAL_MANUAL,
  }),
  Object.freeze({
    allowedDomainsJson: [],
    isEnabled: true,
    name: "Official Distributor Documentation",
    notes:
      "Distributor and procurement documentation is allowed when the distributor relationship can be verified for the target device or manufacturer.",
    priority: 4,
    sourceType: SourceType.OFFICIAL_DISTRIBUTOR_DOCUMENTATION,
  }),
  Object.freeze({
    allowedDomainsJson: ["who.int", "nih.gov", "ncbi.nlm.nih.gov", "medlineplus.gov", "fda.gov"],
    isEnabled: true,
    name: "Trusted Biomedical References",
    notes:
      "Use biomedical and public-health references to corroborate terminology, safety guidance, and educational context.",
    priority: 5,
    sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
  }),
  Object.freeze({
    allowedDomainsJson: ["aami.org", "ifmbe.org"],
    isEnabled: true,
    name: "Trusted Professional Societies",
    notes:
      "Society guidance can support terminology and practice context when it does not contradict higher-priority official sources.",
    priority: 6,
    sourceType: SourceType.TRUSTED_PROFESSIONAL_SOCIETY,
  }),
  Object.freeze({
    allowedDomainsJson: ["*.edu", "*.ac.uk", "*.ac.ug"],
    isEnabled: true,
    name: "Reputable Educational Institutions",
    notes:
      "Educational institutions can be used for explanatory context and training support when the content remains clearly source-grounded.",
    priority: 7,
    sourceType: SourceType.REPUTABLE_EDUCATIONAL_INSTITUTION,
  }),
  Object.freeze({
    allowedDomainsJson: [],
    isEnabled: true,
    name: "Approved Search Results",
    notes:
      "Use approved search integrations to discover candidates, then validate each result against the enabled source-tier rules before storage.",
    priority: 8,
    sourceType: SourceType.APPROVED_SEARCH_RESULT,
  }),
]);

const defaultSourceConfigByType = new Map(
  defaultResearchSourceConfigs.map((config) => [config.sourceType, config]),
);

const sourceReliabilityByType = Object.freeze({
  [SourceType.APPROVED_SEARCH_RESULT]: {
    marker: "Search-discovered lead",
    tier: "tier_4_discovery_only",
  },
  [SourceType.OFFICIAL_DISTRIBUTOR_DOCUMENTATION]: {
    marker: "Distributor corroboration",
    tier: "tier_2_verified_partner",
  },
  [SourceType.OFFICIAL_MANUAL]: {
    marker: "Official document evidence",
    tier: "tier_1_official",
  },
  [SourceType.OFFICIAL_MANUFACTURER_WEBSITE]: {
    marker: "Official primary source",
    tier: "tier_1_official",
  },
  [SourceType.OFFICIAL_PRODUCT_PAGE]: {
    marker: "Official product evidence",
    tier: "tier_1_official",
  },
  [SourceType.REPUTABLE_EDUCATIONAL_INSTITUTION]: {
    marker: "Educational corroboration",
    tier: "tier_3_contextual",
  },
  [SourceType.TRUSTED_BIOMEDICAL_REFERENCE]: {
    marker: "Biomedical corroboration",
    tier: "tier_2_trusted_reference",
  },
  [SourceType.TRUSTED_PROFESSIONAL_SOCIETY]: {
    marker: "Professional society corroboration",
    tier: "tier_2_trusted_reference",
  },
});

export const saveSourceConfigurationsSchema = z
  .object({
    configs: z
      .array(
        z
          .object({
            allowedDomains: z.array(z.string().trim().min(1)).default([]),
            isEnabled: z.boolean(),
            notes: z.string().trim().optional(),
            sourceType: sourceTypeSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .superRefine((value, context) => {
    const duplicateTypes = value.configs.filter(
      (config, index) =>
        value.configs.findIndex((item) => item.sourceType === config.sourceType) !== index,
    );

    if (duplicateTypes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate source types are not allowed: ${[
          ...new Set(duplicateTypes.map((config) => config.sourceType)),
        ].join(", ")}.`,
        path: ["configs"],
      });
    }
  });

export const saveManufacturerRecordSchema = z
  .object({
    aliases: z.array(z.string().trim().min(1)).default([]),
    branchCountries: z.array(z.string().trim().min(1)).default([]),
    headquartersCountry: z.string().trim().optional(),
    manufacturerId: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1),
    primaryDomain: z.string().trim().min(1),
  })
  .strict();

export class ResearchDataError extends Error {
  constructor(message, { status = "invalid_research_data", statusCode = 400 } = {}) {
    super(message);
    this.name = "ResearchDataError";
    this.status = status;
    this.statusCode = statusCode;
  }
}

function trimToUndefined(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

function collapseWhitespace(value) {
  const trimmed = trimToUndefined(value);

  return trimmed ? trimmed.replace(/\s+/g, " ") : undefined;
}

function stripAccents(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeTextKey(value) {
  const collapsed = collapseWhitespace(value);

  if (!collapsed) {
    return "";
  }

  return stripAccents(collapsed)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function createSlug(value) {
  const normalized = normalizeTextKey(value);

  return normalized.replace(/\s+/g, "-") || "item";
}

function createStableHash(value) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return Math.abs(hash >>> 0).toString(36);
}

function normalizeTimestamp(value, now = new Date()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return now.toISOString();
}

function compareAlphabetical(left, right) {
  return left.localeCompare(right, undefined, {
    sensitivity: "base",
  });
}

function dedupeStrings(values) {
  const items = [];
  const seen = new Set();

  for (const value of values || []) {
    const normalized = collapseWhitespace(value);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push(normalized);
  }

  return items.sort(compareAlphabetical);
}

function normalizeCountryList(values) {
  return dedupeStrings(values);
}

export function normalizeManufacturerName(value) {
  return normalizeTextKey(value);
}

export function normalizeManufacturerAlias(value) {
  return normalizeTextKey(value);
}

export function normalizeModelName(value) {
  return normalizeTextKey(value);
}

export function normalizeFaultTitle(value) {
  return normalizeTextKey(value);
}

export function normalizeDomain(value) {
  const trimmed = trimToUndefined(value);

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("*.")) {
    const wildcardTarget = normalizeDomain(trimmed.slice(2));

    return wildcardTarget ? `*.${wildcardTarget}` : undefined;
  }

  let hostname = trimmed.toLowerCase();

  try {
    hostname = new URL(trimmed).hostname.toLowerCase();
  } catch {
    try {
      hostname = new URL(`https://${trimmed}`).hostname.toLowerCase();
    } catch {
      hostname = trimmed.split("/")[0].toLowerCase();
    }
  }

  hostname = hostname.replace(/:\d+$/, "").replace(/\.$/, "");

  if (hostname.startsWith("www.")) {
    hostname = hostname.slice(4);
  }

  return hostname || undefined;
}

function normalizeAllowedDomainPatterns(values) {
  const normalizedPatterns = dedupeStrings(values).map((value) => normalizeDomain(value));

  return normalizedPatterns.filter(Boolean).sort(compareAlphabetical);
}

function matchesAllowedDomain(domain, allowedDomains) {
  if (!allowedDomains.length) {
    return true;
  }

  if (!domain) {
    return false;
  }

  return allowedDomains.some((pattern) => {
    if (!pattern.startsWith("*.")) {
      return domain === pattern;
    }

    const suffix = pattern.slice(2);

    return domain === suffix || domain.endsWith(`.${suffix}`);
  });
}

function compareByPriorityThenTitle(left, right) {
  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }

  return compareAlphabetical(left.title || "", right.title || "");
}

function compareManufacturerCandidates(left, right) {
  const domainComparison = compareAlphabetical(left.primaryDomain || "", right.primaryDomain || "");

  if (domainComparison !== 0) {
    return domainComparison;
  }

  const nameComparison = compareAlphabetical(left.normalizedName, right.normalizedName);

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return compareAlphabetical(left.name, right.name);
}

function compareModelCandidates(left, right) {
  const manufacturerDomainComparison = compareAlphabetical(
    left.manufacturerPrimaryDomain || "",
    right.manufacturerPrimaryDomain || "",
  );

  if (manufacturerDomainComparison !== 0) {
    return manufacturerDomainComparison;
  }

  const manufacturerNameComparison = compareAlphabetical(
    left.manufacturerNormalizedName,
    right.manufacturerNormalizedName,
  );

  if (manufacturerNameComparison !== 0) {
    return manufacturerNameComparison;
  }

  const modelNameComparison = compareAlphabetical(left.normalizedName, right.normalizedName);

  if (modelNameComparison !== 0) {
    return modelNameComparison;
  }

  return compareAlphabetical(left.name, right.name);
}

function normalizeFaultSeverity(value) {
  const normalized = normalizeTextKey(value);

  if (!normalized) {
    return "UNKNOWN";
  }

  if (normalized.includes("critical")) {
    return "CRITICAL";
  }

  if (normalized.includes("high") || normalized.includes("severe")) {
    return "HIGH";
  }

  if (normalized.includes("medium") || normalized.includes("moderate")) {
    return "MEDIUM";
  }

  if (normalized.includes("low") || normalized.includes("minor")) {
    return "LOW";
  }

  return "UNKNOWN";
}

function compareFaults(left, right) {
  if (left.evidenceCount !== right.evidenceCount) {
    return right.evidenceCount - left.evidenceCount;
  }

  if (severityWeights[left.severity] !== severityWeights[right.severity]) {
    return severityWeights[right.severity] - severityWeights[left.severity];
  }

  return compareAlphabetical(left.normalizedTitle, right.normalizedTitle);
}

function getDefaultSourceConfig(sourceType) {
  return defaultSourceConfigByType.get(sourceType) || null;
}

function resolveSourceConfigs(sourceConfigs) {
  const mergedConfigs = researchSourcePriority.map((sourceType) => {
    const override = (sourceConfigs || []).find((config) => config?.sourceType === sourceType);
    const fallback = getDefaultSourceConfig(sourceType);
    const allowedDomains = normalizeAllowedDomainPatterns(
      override?.allowedDomains ?? override?.allowedDomainsJson ?? fallback?.allowedDomainsJson ?? [],
    );

    return {
      allowedDomainsJson: allowedDomains,
      isEnabled: override?.isEnabled ?? fallback?.isEnabled ?? true,
      name: collapseWhitespace(override?.name) || fallback?.name || researchSourceTypeLabels[sourceType],
      notes: collapseWhitespace(override?.notes) || fallback?.notes || "",
      priority: fallback?.priority ?? override?.priority ?? researchSourcePriority.indexOf(sourceType) + 1,
      sourceType,
    };
  });

  return mergedConfigs.sort((left, right) => left.priority - right.priority);
}

function createSourceConfigMap(sourceConfigs) {
  return new Map(sourceConfigs.map((config) => [config.sourceType, config]));
}

function createSourceId(seed, existingIds) {
  const baseId = `src_${createStableHash(seed)}`;

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;

  while (existingIds.has(`${baseId}_${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}_${suffix}`;
}

function createSourceReferenceSeed(candidate, sourceDomain, sourceType) {
  return [
    sourceType,
    sourceDomain || "",
    collapseWhitespace(candidate.url) || "",
    collapseWhitespace(candidate.title) || "",
  ].join("|");
}

function getSourceAdapterMetadata(sourceType) {
  const defaultConfig = getDefaultSourceConfig(sourceType);
  const reliability = sourceReliabilityByType[sourceType];

  if (!defaultConfig || !reliability) {
    return null;
  }

  return {
    label: researchSourceTypeLabels[sourceType],
    priority: defaultConfig.priority,
    reliabilityMarker: reliability.marker,
    reliabilityTier: reliability.tier,
    sourceType,
  };
}

function normalizeInlineSourceCandidate(
  candidate,
  { defaultSourceType, existingIds, now, sourceConfigMap, warnings },
) {
  const sourceType = candidate?.sourceType || defaultSourceType;

  if (!sourceType || !researchSourcePriority.includes(sourceType)) {
    warnings.push(`Skipped an unsupported source candidate for "${candidate?.title || "untitled"}".`);
    return null;
  }

  const adapter = getSourceAdapterMetadata(sourceType);
  const sourceConfig = sourceConfigMap.get(sourceType) || getDefaultSourceConfig(sourceType);

  if (!adapter || !sourceConfig) {
    warnings.push(`Skipped source type "${sourceType}" because it is not configured.`);
    return null;
  }

  if (!sourceConfig.isEnabled) {
    warnings.push(`Skipped source type "${sourceType}" because the tier is disabled in source configuration.`);
    return null;
  }

  const rawUrl = trimToUndefined(candidate.url || candidate.sourceUrl);
  const url = sanitizeExternalUrl(rawUrl);
  const sourceDomain = normalizeDomain(candidate.sourceDomain || url || rawUrl);
  const allowedDomains = normalizeAllowedDomainPatterns(
    sourceConfig.allowedDomainsJson || sourceConfig.allowedDomains || [],
  );

  if (!rawUrl) {
    warnings.push(
      `Skipped source "${candidate?.title || sourceDomain || sourceType}" because a canonical URL is required.`,
    );
    return null;
  }

  if (!url) {
    warnings.push(
      `Skipped source "${candidate?.title || sourceDomain || sourceType}" because it must use an http or https URL.`,
    );
    return null;
  }

  if (!matchesAllowedDomain(sourceDomain, allowedDomains)) {
    warnings.push(
      `Skipped source "${candidate?.title || sourceDomain || sourceType}" because "${sourceDomain || "unknown"}" is not allowed for ${sourceType}.`,
    );
    return null;
  }

  const title = collapseWhitespace(candidate.title) || sourceDomain || adapter.label;
  const sourceId = trimToUndefined(candidate.id) || createSourceId(
    createSourceReferenceSeed(candidate, sourceDomain, sourceType),
    existingIds,
  );

  return {
    accessStatus: collapseWhitespace(candidate.accessStatus) || "available",
    excerpt: collapseWhitespace(candidate.excerpt) || undefined,
    fileType: collapseWhitespace(candidate.fileType) || undefined,
    id: sourceId,
    language: collapseWhitespace(candidate.language) || undefined,
    lastCheckedAt: normalizeTimestamp(candidate.lastCheckedAt, now),
    notes: collapseWhitespace(candidate.notes) || undefined,
    priority: adapter.priority,
    reliabilityMarker: adapter.reliabilityMarker,
    reliabilityTier: collapseWhitespace(candidate.reliabilityTier) || adapter.reliabilityTier,
    sourceDomain: sourceDomain || undefined,
    sourceType,
    title,
    url,
  };
}

function extractInlineSourceCandidates(item) {
  const candidates = [];

  if (Array.isArray(item?.sources)) {
    candidates.push(...item.sources);
  }

  if (Array.isArray(item?.sourceReferences)) {
    candidates.push(...item.sourceReferences);
  }

  if (item?.source && typeof item.source === "object") {
    candidates.push(item.source);
  }

  return candidates;
}

function registerSourceReference(
  candidate,
  { defaultSourceType, existingIds, now, registry, sourceConfigMap, warnings },
) {
  const normalizedReference = normalizeInlineSourceCandidate(candidate, {
    defaultSourceType,
    existingIds,
    now,
    sourceConfigMap,
    warnings,
  });

  if (!normalizedReference) {
    return null;
  }

  const signature = createSourceReferenceSeed(
    normalizedReference,
    normalizedReference.sourceDomain,
    normalizedReference.sourceType,
  );
  const existingReference = registry.bySignature.get(signature);

  if (existingReference) {
    return existingReference.id;
  }

  registry.byId.set(normalizedReference.id, normalizedReference);
  registry.bySignature.set(signature, normalizedReference);
  existingIds.add(normalizedReference.id);

  return normalizedReference.id;
}

function resolveSourceReferenceIds(
  item,
  { defaultSourceType, existingIds, now, registry, selfAsSource = false, sourceConfigMap, warnings },
) {
  const resolvedIds = new Set();

  for (const referenceId of item?.sourceReferenceIds || []) {
    const trimmedId = trimToUndefined(referenceId);

    if (!trimmedId) {
      continue;
    }

    if (!registry.byId.has(trimmedId)) {
      warnings.push(`Skipped unknown source reference id "${trimmedId}".`);
      continue;
    }

    resolvedIds.add(trimmedId);
  }

  for (const inlineCandidate of extractInlineSourceCandidates(item)) {
    const sourceId = registerSourceReference(inlineCandidate, {
      defaultSourceType,
      existingIds,
      now,
      registry,
      sourceConfigMap,
      warnings,
    });

    if (sourceId) {
      resolvedIds.add(sourceId);
    }
  }

  if (
    selfAsSource &&
    (trimToUndefined(item?.url) || trimToUndefined(item?.sourceDomain) || trimToUndefined(item?.title))
  ) {
    const sourceId = registerSourceReference(item, {
      defaultSourceType,
      existingIds,
      now,
      registry,
      sourceConfigMap,
      warnings,
    });

    if (sourceId) {
      resolvedIds.add(sourceId);
    }
  }

  return [...resolvedIds].sort(compareAlphabetical);
}

function getSourceDomainFromIds(sourceReferenceIds, sourceRegistry) {
  for (const sourceReferenceId of sourceReferenceIds) {
    const reference = sourceRegistry.byId.get(sourceReferenceId);

    if (reference?.sourceDomain) {
      return reference.sourceDomain;
    }
  }

  return undefined;
}

function buildSourceSignals(sourceReferenceIds, sourceRegistry) {
  const references = sourceReferenceIds
    .map((sourceReferenceId) => sourceRegistry.byId.get(sourceReferenceId))
    .filter(Boolean);
  const sourceTypes = new Set(references.map((reference) => reference.sourceType));
  const corroboratingCount = new Set(references.map((reference) => reference.id)).size;

  return {
    corroboratingCount,
    hasBiomedicalOrEducationalReference: [...sourceTypes].some((sourceType) =>
      biomedicalOrEducationalSourceTypes.has(sourceType),
    ),
    hasDistributorDocumentation: [...sourceTypes].some((sourceType) =>
      distributorSourceTypes.has(sourceType),
    ),
    hasOfficialManufacturerWebsite: [...sourceTypes].some((sourceType) =>
      officialManufacturerSourceTypes.has(sourceType),
    ),
    hasOfficialModelConfirmation: [...sourceTypes].some((sourceType) =>
      officialModelSourceTypes.has(sourceType),
    ),
  };
}

function calculateManufacturerRankingScore(sourceReferenceIds, sourceRegistry) {
  const signals = buildSourceSignals(sourceReferenceIds, sourceRegistry);
  let score = 0;

  if (signals.hasOfficialManufacturerWebsite) {
    score += 40;
  }

  if (signals.hasOfficialModelConfirmation) {
    score += 25;
  }

  if (signals.hasDistributorDocumentation) {
    score += 15;
  }

  if (signals.hasBiomedicalOrEducationalReference) {
    score += 10;
  }

  score += Math.min(Math.max(signals.corroboratingCount - 1, 0), 10);

  return score;
}

function calculateModelRankingScore(model, sourceRegistry) {
  const signals = buildSourceSignals(model.sourceReferenceIds, sourceRegistry);
  let score = 0;

  if (signals.hasOfficialModelConfirmation) {
    score += 50;
  }

  if (model.equipmentTypeConfirmed) {
    score += 20;
  }

  if (Number.isInteger(model.latestKnownYear)) {
    score += 10;
  }

  score += Math.min(Math.max(signals.corroboratingCount - 1, 0), 20);

  return score;
}

function pickPreferredDisplayName(nameCandidates) {
  return [...nameCandidates]
    .sort((left, right) => {
      if (Boolean(left.isOfficial) !== Boolean(right.isOfficial)) {
        return left.isOfficial ? -1 : 1;
      }

      if (left.name.length !== right.name.length) {
        return left.name.length - right.name.length;
      }

      return compareAlphabetical(left.name, right.name);
    })[0]?.name;
}

function createManufacturerBucket(candidate) {
  return {
    aliasKeySet: new Set(candidate.aliasKeys),
    aliases: new Set(candidate.aliases),
    branchCountries: new Set(candidate.branchCountries),
    displayNameCandidates: [
      {
        isOfficial: candidate.sourceSignals.hasOfficialManufacturerWebsite,
        name: candidate.name,
      },
    ],
    headquartersCountry: candidate.headquartersCountry || null,
    modelBuckets: [],
    normalizedName: candidate.normalizedName,
    primaryDomain: candidate.primaryDomain || null,
    sourceIdSet: new Set(candidate.sourceReferenceIds),
  };
}

function manufacturerNamesOverlap(bucket, candidate) {
  if (bucket.normalizedName === candidate.normalizedName) {
    return true;
  }

  if (bucket.aliasKeySet.has(candidate.normalizedName)) {
    return true;
  }

  return candidate.aliasKeys.some((aliasKey) => aliasKey === bucket.normalizedName || bucket.aliasKeySet.has(aliasKey));
}

function domainsAreCompatible(leftDomain, rightDomain) {
  if (leftDomain && rightDomain) {
    return leftDomain === rightDomain;
  }

  return true;
}

function mergeManufacturerCandidate(bucket, candidate) {
  bucket.displayNameCandidates.push({
    isOfficial: candidate.sourceSignals.hasOfficialManufacturerWebsite,
    name: candidate.name,
  });

  for (const alias of candidate.aliases) {
    bucket.aliases.add(alias);
  }

  for (const aliasKey of candidate.aliasKeys) {
    bucket.aliasKeySet.add(aliasKey);
  }

  for (const branchCountry of candidate.branchCountries) {
    bucket.branchCountries.add(branchCountry);
  }

  for (const sourceReferenceId of candidate.sourceReferenceIds) {
    bucket.sourceIdSet.add(sourceReferenceId);
  }

  if (!bucket.primaryDomain && candidate.primaryDomain) {
    bucket.primaryDomain = candidate.primaryDomain;
  }

  if (!bucket.headquartersCountry && candidate.headquartersCountry) {
    bucket.headquartersCountry = candidate.headquartersCountry;
  }
}

function normalizeManufacturerCandidate(
  candidate,
  { existingIds, now, registry, sourceConfigMap, warnings },
) {
  const name = collapseWhitespace(candidate?.name);
  const normalizedName = normalizeManufacturerName(name);

  if (!name || !normalizedName) {
    return null;
  }

  const sourceReferenceIds = resolveSourceReferenceIds(candidate, {
    existingIds,
    now,
    registry,
    sourceConfigMap,
    warnings,
  });
  const primaryDomain =
    normalizeDomain(candidate?.primaryDomain) || getSourceDomainFromIds(sourceReferenceIds, registry);
  const aliases = [];
  const aliasKeys = new Set();

  for (const alias of dedupeStrings(candidate?.aliases || [])) {
    const aliasKey = normalizeManufacturerAlias(alias);

    if (!aliasKey || aliasKey === normalizedName || aliasKeys.has(aliasKey)) {
      continue;
    }

    aliasKeys.add(aliasKey);
    aliases.push(alias);
  }

  return {
    aliasKeys: [...aliasKeys],
    aliases,
    branchCountries: normalizeCountryList(candidate?.branchCountries),
    headquartersCountry: collapseWhitespace(candidate?.headquartersCountry) || undefined,
    name,
    normalizedName,
    primaryDomain,
    sourceReferenceIds,
    sourceSignals: buildSourceSignals(sourceReferenceIds, registry),
  };
}

function createModelBucket(candidate) {
  return {
    aliasKeySet: new Set(candidate.aliasKeys),
    aliases: new Set(candidate.aliases),
    equipmentTypeConfirmed: candidate.equipmentTypeConfirmed,
    latestKnownYear: candidate.latestKnownYear,
    nameCandidates: [
      {
        isOfficial: candidate.sourceSignals.hasOfficialModelConfirmation,
        name: candidate.name,
      },
    ],
    normalizedName: candidate.normalizedName,
    sourceIdSet: new Set(candidate.sourceReferenceIds),
    summary: candidate.summary,
  };
}

function modelNamesOverlap(bucket, candidate) {
  if (bucket.normalizedName === candidate.normalizedName) {
    return true;
  }

  if (bucket.aliasKeySet.has(candidate.normalizedName)) {
    return true;
  }

  return candidate.aliasKeys.some((aliasKey) => aliasKey === bucket.normalizedName || bucket.aliasKeySet.has(aliasKey));
}

function mergeModelCandidate(bucket, candidate) {
  bucket.nameCandidates.push({
    isOfficial: candidate.sourceSignals.hasOfficialModelConfirmation,
    name: candidate.name,
  });

  for (const alias of candidate.aliases) {
    bucket.aliases.add(alias);
  }

  for (const aliasKey of candidate.aliasKeys) {
    bucket.aliasKeySet.add(aliasKey);
  }

  for (const sourceReferenceId of candidate.sourceReferenceIds) {
    bucket.sourceIdSet.add(sourceReferenceId);
  }

  bucket.equipmentTypeConfirmed = bucket.equipmentTypeConfirmed || candidate.equipmentTypeConfirmed;

  if (!bucket.latestKnownYear && candidate.latestKnownYear) {
    bucket.latestKnownYear = candidate.latestKnownYear;
  } else if (bucket.latestKnownYear && candidate.latestKnownYear) {
    bucket.latestKnownYear = Math.max(bucket.latestKnownYear, candidate.latestKnownYear);
  }

  if ((!bucket.summary || bucket.summary.length < (candidate.summary?.length || 0)) && candidate.summary) {
    bucket.summary = candidate.summary;
  }
}

function normalizeModelCandidate(
  candidate,
  { existingIds, now, registry, sourceConfigMap, warnings },
) {
  const name = collapseWhitespace(candidate?.name);
  const normalizedName = normalizeModelName(name);
  const manufacturerName = collapseWhitespace(candidate?.manufacturerName);
  const manufacturerNormalizedName = normalizeManufacturerName(manufacturerName);

  if (!name || !normalizedName || !manufacturerName || !manufacturerNormalizedName) {
    return null;
  }

  const sourceReferenceIds = resolveSourceReferenceIds(candidate, {
    existingIds,
    now,
    registry,
    sourceConfigMap,
    warnings,
  });
  const aliases = [];
  const aliasKeys = new Set();

  for (const alias of dedupeStrings(candidate?.aliases || [])) {
    const aliasKey = normalizeModelName(alias);

    if (!aliasKey || aliasKey === normalizedName || aliasKeys.has(aliasKey)) {
      continue;
    }

    aliasKeys.add(aliasKey);
    aliases.push(alias);
  }
  const latestKnownYear = Number.isInteger(candidate?.latestKnownYear)
    ? candidate.latestKnownYear
    : typeof candidate?.latestKnownYear === "string" && /^\d{4}$/.test(candidate.latestKnownYear.trim())
      ? Number.parseInt(candidate.latestKnownYear.trim(), 10)
      : undefined;

  return {
    aliasKeys: [...aliasKeys],
    aliases,
    equipmentTypeConfirmed: Boolean(candidate?.equipmentTypeConfirmed),
    latestKnownYear,
    manufacturerAliases: dedupeStrings(candidate?.manufacturerAliases || []),
    manufacturerName,
    manufacturerNormalizedName,
    manufacturerPrimaryDomain:
      normalizeDomain(candidate?.manufacturerPrimaryDomain) ||
      normalizeDomain(candidate?.primaryDomain) ||
      getSourceDomainFromIds(sourceReferenceIds, registry),
    name,
    normalizedName,
    sourceReferenceIds,
    sourceSignals: buildSourceSignals(sourceReferenceIds, registry),
    summary: collapseWhitespace(candidate?.summary) || undefined,
  };
}

function normalizeSectionEntry(
  item,
  { defaultSourceType, existingIds, now, registry, sourceConfigMap, warnings },
) {
  const label =
    collapseWhitespace(
      typeof item === "string" ? item : item?.title || item?.label || item?.name || item?.summary || item?.description,
    ) || "";

  if (!label) {
    return null;
  }

  const sourceReferenceIds = resolveSourceReferenceIds(
    typeof item === "string" ? {} : item,
    {
      defaultSourceType,
      existingIds,
      now,
      registry,
      sourceConfigMap,
      warnings,
    },
  );
  const details =
    typeof item === "string"
      ? undefined
      : collapseWhitespace(item?.description || item?.details || item?.summary || item?.text);

  return {
    details,
    frequency:
      typeof item === "string" ? undefined : collapseWhitespace(item?.frequency || item?.interval),
    label,
    sourceReferenceIds,
  };
}

function normalizeSectionEntries(
  items,
  { defaultSourceType, existingIds, now, registry, sourceConfigMap, warnings },
) {
  return (items || [])
    .map((item) =>
      normalizeSectionEntry(item, {
        defaultSourceType,
        existingIds,
        now,
        registry,
        sourceConfigMap,
        warnings,
      }),
    )
    .filter(Boolean);
}

function normalizeTextSection(
  section,
  { defaultSourceType, existingIds, now, registry, sourceConfigMap, warnings },
) {
  if (!section) {
    return null;
  }

  if (typeof section === "string") {
    const summary = collapseWhitespace(section);

    return summary
      ? {
          sourceReferenceIds: [],
          summary,
        }
      : null;
  }

  const summary = collapseWhitespace(
    section.summary || section.description || section.text || section.title,
  );

  if (!summary) {
    return null;
  }

  return {
    sourceReferenceIds: resolveSourceReferenceIds(section, {
      defaultSourceType,
      existingIds,
      now,
      registry,
      sourceConfigMap,
      warnings,
    }),
    summary,
  };
}

function normalizeManualCandidate(
  candidate,
  { existingIds, now, registry, sourceConfigMap, warnings },
) {
  const sourceReferenceIds = resolveSourceReferenceIds(candidate, {
    defaultSourceType: candidate?.sourceType || SourceType.OFFICIAL_MANUAL,
    existingIds,
    now,
    registry,
    selfAsSource: true,
    sourceConfigMap,
    warnings,
  });
  const sourceReference = sourceReferenceIds
    .map((sourceReferenceId) => registry.byId.get(sourceReferenceId))
    .find(Boolean);

  if (!sourceReference) {
    return null;
  }

  return {
    accessStatus: collapseWhitespace(candidate?.accessStatus) || sourceReference.accessStatus || "available",
    fileType: collapseWhitespace(candidate?.fileType) || sourceReference.fileType || undefined,
    language: collapseWhitespace(candidate?.language) || sourceReference.language || undefined,
    lastCheckedAt: normalizeTimestamp(candidate?.lastCheckedAt || sourceReference.lastCheckedAt, now),
    notes: collapseWhitespace(candidate?.notes) || sourceReference.notes || undefined,
    priority: sourceReference.priority,
    sourceDomain: normalizeDomain(candidate?.sourceDomain || sourceReference.sourceDomain || candidate?.url),
    sourceReferenceIds,
    title: collapseWhitespace(candidate?.title) || sourceReference.title,
    url: sanitizeExternalUrl(candidate?.url) || sourceReference.url || undefined,
  };
}

function normalizeMediaCandidate(
  candidate,
  { existingIds, now, registry, sourceConfigMap, warnings },
) {
  const sourceReferenceIds = resolveSourceReferenceIds(candidate, {
    defaultSourceType: candidate?.sourceType || SourceType.APPROVED_SEARCH_RESULT,
    existingIds,
    now,
    registry,
    selfAsSource: Boolean(candidate?.sourceUrl || candidate?.url || candidate?.sourceDomain),
    sourceConfigMap,
    warnings,
  });
  const sourceReference = sourceReferenceIds
    .map((sourceReferenceId) => registry.byId.get(sourceReferenceId))
    .find(Boolean);

  return {
    alt: collapseWhitespace(candidate?.alt) || undefined,
    attributionText: collapseWhitespace(candidate?.attributionText) || undefined,
    caption: collapseWhitespace(candidate?.caption) || undefined,
    height: Number.isInteger(candidate?.height) ? candidate.height : undefined,
    isAiGenerated: Boolean(candidate?.isAiGenerated),
    licenseType: collapseWhitespace(candidate?.licenseType) || undefined,
    localPath: collapseWhitespace(candidate?.localPath) || undefined,
    publicUrl: sanitizeMediaUrl(candidate?.publicUrl),
    sourceDomain:
      normalizeDomain(candidate?.sourceDomain || candidate?.sourceUrl || candidate?.url) ||
      sourceReference?.sourceDomain ||
      undefined,
    sourceReferenceIds,
    sourceUrl:
      sanitizeExternalUrl(candidate?.sourceUrl || candidate?.url) ||
      sourceReference?.url ||
      undefined,
    sectionAffinity: Array.isArray(candidate?.sectionAffinity)
      ? candidate.sectionAffinity.map((value) => collapseWhitespace(value)).filter(Boolean)
      : collapseWhitespace(candidate?.sectionAffinity)
        ? [collapseWhitespace(candidate.sectionAffinity)]
        : [],
    storageDriver: collapseWhitespace(candidate?.storageDriver) || undefined,
    storageKey: collapseWhitespace(candidate?.storageKey) || undefined,
    title: collapseWhitespace(candidate?.title) || undefined,
    usageNotes: collapseWhitespace(candidate?.usageNotes) || undefined,
    width: Number.isInteger(candidate?.width) ? candidate.width : undefined,
  };
}

function buildFactCluster(label, entries) {
  const sourceReferenceIdSet = new Set();

  for (const entry of entries || []) {
    for (const sourceReferenceId of entry?.sourceReferenceIds || []) {
      sourceReferenceIdSet.add(sourceReferenceId);
    }
  }

  return {
    entryCount: entries?.length || 0,
    label,
    sourceReferenceIds: [...sourceReferenceIdSet].sort(compareAlphabetical),
  };
}

function finalizeManufacturers(manufacturerBuckets, sourceRegistry) {
  return manufacturerBuckets
    .map((bucket) => {
      const finalizedName = pickPreferredDisplayName(bucket.displayNameCandidates) || "Unknown manufacturer";
      const aliases = [...bucket.aliases].filter(
        (alias) => normalizeManufacturerAlias(alias) !== normalizeManufacturerName(finalizedName),
      );
      const models = bucket.modelBuckets
        .map((modelBucket) => {
          const modelName = pickPreferredDisplayName(modelBucket.nameCandidates) || "Unknown model";
          const modelRecord = {
            aliases: [...modelBucket.aliases].filter(
              (alias) => normalizeModelName(alias) !== normalizeModelName(modelName),
            ),
            equipmentTypeConfirmed: modelBucket.equipmentTypeConfirmed,
            latestKnownYear: modelBucket.latestKnownYear || null,
            name: modelName,
            normalizedName: modelBucket.normalizedName,
            rankingScore: 0,
            slug: createSlug(modelName),
            sourceReferenceIds: [...modelBucket.sourceIdSet].sort(compareAlphabetical),
            summary: modelBucket.summary || undefined,
          };

          modelRecord.rankingScore = calculateModelRankingScore(modelRecord, sourceRegistry);

          return modelRecord;
        })
        .sort((left, right) => {
          if (left.rankingScore !== right.rankingScore) {
            return right.rankingScore - left.rankingScore;
          }

          if ((left.latestKnownYear || 0) !== (right.latestKnownYear || 0)) {
            return (right.latestKnownYear || 0) - (left.latestKnownYear || 0);
          }

          return compareAlphabetical(left.normalizedName, right.normalizedName);
        });
      const manufacturerSourceIds = new Set(bucket.sourceIdSet);

      for (const model of models) {
        for (const sourceReferenceId of model.sourceReferenceIds) {
          manufacturerSourceIds.add(sourceReferenceId);
        }
      }

      const manufacturerRecord = {
        aliases,
        branchCountries: [...bucket.branchCountries].sort(compareAlphabetical),
        headquartersCountry: bucket.headquartersCountry || null,
        models,
        name: finalizedName,
        normalizedName: bucket.normalizedName,
        primaryDomain: bucket.primaryDomain || null,
        rankingScore: 0,
        slug: createSlug(finalizedName),
        sourceReferenceIds: [...manufacturerSourceIds].sort(compareAlphabetical),
      };

      manufacturerRecord.rankingScore = calculateManufacturerRankingScore(
        manufacturerRecord.sourceReferenceIds,
        sourceRegistry,
      );

      return manufacturerRecord;
    })
    .sort((left, right) => {
      if (left.rankingScore !== right.rankingScore) {
        return right.rankingScore - left.rankingScore;
      }

      return compareAlphabetical(left.normalizedName, right.normalizedName);
    });
}

function finalizeFaults(
  faults,
  { existingIds, now, registry, sourceConfigMap, warnings },
) {
  const faultBuckets = new Map();

  for (const candidate of faults || []) {
    const title = collapseWhitespace(candidate?.title || candidate?.fault);
    const normalizedTitle = normalizeFaultTitle(title);

    if (!title || !normalizedTitle) {
      continue;
    }

    const sourceReferenceIds = resolveSourceReferenceIds(candidate, {
      defaultSourceType: candidate?.sourceType || SourceType.OFFICIAL_MANUAL,
      existingIds,
      now,
      registry,
      sourceConfigMap,
      warnings,
    });
    const existingFault = faultBuckets.get(normalizedTitle);

    if (!existingFault) {
      faultBuckets.set(normalizedTitle, {
        cause: collapseWhitespace(candidate?.cause) || "",
        normalizedTitle,
        remedy: collapseWhitespace(candidate?.remedy) || "",
        severity: normalizeFaultSeverity(candidate?.severity),
        sourceIdSet: new Set(sourceReferenceIds),
        symptoms: collapseWhitespace(candidate?.symptoms) || "",
        title,
      });
      continue;
    }

    for (const sourceReferenceId of sourceReferenceIds) {
      existingFault.sourceIdSet.add(sourceReferenceId);
    }

    if ((candidate?.cause || "").length > existingFault.cause.length) {
      existingFault.cause = collapseWhitespace(candidate?.cause) || existingFault.cause;
    }

    if ((candidate?.symptoms || "").length > existingFault.symptoms.length) {
      existingFault.symptoms = collapseWhitespace(candidate?.symptoms) || existingFault.symptoms;
    }

    if ((candidate?.remedy || "").length > existingFault.remedy.length) {
      existingFault.remedy = collapseWhitespace(candidate?.remedy) || existingFault.remedy;
    }

    if (
      severityWeights[normalizeFaultSeverity(candidate?.severity)] >
      severityWeights[existingFault.severity]
    ) {
      existingFault.severity = normalizeFaultSeverity(candidate?.severity);
    }
  }

  return [...faultBuckets.values()]
    .map((fault) => ({
      cause: fault.cause,
      evidenceCount: fault.sourceIdSet.size,
      normalizedTitle: fault.normalizedTitle,
      remedy: fault.remedy,
      severity: fault.severity,
      sourceReferenceIds: [...fault.sourceIdSet].sort(compareAlphabetical),
      symptoms: fault.symptoms,
      title: fault.title,
    }))
    .sort(compareFaults)
    .map((fault, index) => ({
      ...fault,
      sortOrder: index + 1,
    }));
}

function collectMissingAttributionWarnings(factClusters, warnings) {
  const missingClusters = factClusters
    .filter((cluster) => cluster.entryCount > 0 && cluster.sourceReferenceIds.length === 0)
    .map((cluster) => cluster.label);

  for (const missingCluster of missingClusters) {
    warnings.push(`Critical fact cluster "${missingCluster}" is missing source attribution.`);
  }

  return missingClusters;
}

function createInitialSourceRegistry() {
  return {
    byId: new Map(),
    bySignature: new Map(),
  };
}

function buildResearchSourceAdapters() {
  return researchSourcePriority.map((sourceType) => {
    const metadata = getSourceAdapterMetadata(sourceType);

    return Object.freeze({
      ...metadata,
    });
  });
}

export const researchSourceAdapters = Object.freeze(buildResearchSourceAdapters());

export function getResearchSourceAdapter(sourceType) {
  return researchSourceAdapters.find((adapter) => adapter.sourceType === sourceType) || null;
}

export function buildVerifiedResearchPayload(input = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const warnings = dedupeStrings(input.warnings || []);
  const sourceConfigs = resolveSourceConfigs(input.sourceConfigs);
  const sourceConfigMap = createSourceConfigMap(sourceConfigs);
  const sourceRegistry = createInitialSourceRegistry();
  const existingIds = new Set();

  for (const sourceCandidate of input.sourceReferences || []) {
    registerSourceReference(sourceCandidate, {
      existingIds,
      now,
      registry: sourceRegistry,
      sourceConfigMap,
      warnings,
    });
  }

  const equipmentName =
    collapseWhitespace(input.equipment?.name || input.equipmentName || input.query) || "Unknown equipment";
  const equipmentAliases = dedupeStrings(input.equipment?.aliases || input.aliases || []);
  const definition = normalizeTextSection(input.definition, {
    defaultSourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
    existingIds,
    now,
    registry: sourceRegistry,
    sourceConfigMap,
    warnings,
  });
  const operatingPrinciple = normalizeTextSection(input.operatingPrinciple, {
    defaultSourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
    existingIds,
    now,
    registry: sourceRegistry,
    sourceConfigMap,
    warnings,
  });
  const components = normalizeSectionEntries(input.components, {
    defaultSourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
    existingIds,
    now,
    registry: sourceRegistry,
    sourceConfigMap,
    warnings,
  });
  const variants = normalizeSectionEntries(input.variants, {
    defaultSourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
    existingIds,
    now,
    registry: sourceRegistry,
    sourceConfigMap,
    warnings,
  });
  const uses = normalizeSectionEntries(input.uses, {
    defaultSourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
    existingIds,
    now,
    registry: sourceRegistry,
    sourceConfigMap,
    warnings,
  });
  const maintenanceTasks = normalizeSectionEntries(input.maintenanceTasks, {
    defaultSourceType: SourceType.OFFICIAL_MANUAL,
    existingIds,
    now,
    registry: sourceRegistry,
    sourceConfigMap,
    warnings,
  });
  const safetyPrecautions = normalizeSectionEntries(input.safetyPrecautions, {
    defaultSourceType: SourceType.OFFICIAL_MANUAL,
    existingIds,
    now,
    registry: sourceRegistry,
    sourceConfigMap,
    warnings,
  });
  const manuals = (input.manuals || [])
    .map((manual) =>
      normalizeManualCandidate(manual, {
        existingIds,
        now,
        registry: sourceRegistry,
        sourceConfigMap,
        warnings,
      }),
    )
    .filter(Boolean)
    .sort(compareByPriorityThenTitle);
  const mediaCandidates = (input.mediaCandidates || [])
    .map((candidate) =>
      normalizeMediaCandidate(candidate, {
        existingIds,
        now,
        registry: sourceRegistry,
        sourceConfigMap,
        warnings,
      }),
    )
    .filter(Boolean);

  const rawManufacturers = input.manufacturers || [];
  const normalizedManufacturerEntries = rawManufacturers
    .map((candidate) => ({
      normalized: normalizeManufacturerCandidate(candidate, {
        existingIds,
        now,
        registry: sourceRegistry,
        sourceConfigMap,
        warnings,
      }),
      raw: candidate,
    }))
    .filter((entry) => entry.normalized)
    .sort((left, right) => compareManufacturerCandidates(left.normalized, right.normalized));
  const normalizedManufacturerCandidates = normalizedManufacturerEntries.map(
    (entry) => entry.normalized,
  );
  const manufacturerBuckets = [];

  for (const candidate of normalizedManufacturerCandidates) {
    const existingBucket = manufacturerBuckets.find(
      (bucket) =>
        domainsAreCompatible(bucket.primaryDomain, candidate.primaryDomain) &&
        manufacturerNamesOverlap(bucket, candidate),
    );

    if (existingBucket) {
      mergeManufacturerCandidate(existingBucket, candidate);
      continue;
    }

    manufacturerBuckets.push(createManufacturerBucket(candidate));
  }

  const nestedModelCandidates = normalizedManufacturerEntries.flatMap(({ normalized, raw }) =>
    (raw.models || []).map((model) => ({
      ...model,
      manufacturerAliases: normalized.aliases,
      manufacturerName: normalized.name,
      manufacturerPrimaryDomain: normalized.primaryDomain || raw.primaryDomain,
    })),
  );
  const normalizedModelCandidates = [...(input.models || []), ...nestedModelCandidates]
    .map((candidate) =>
      normalizeModelCandidate(candidate, {
        existingIds,
        now,
        registry: sourceRegistry,
        sourceConfigMap,
        warnings,
      }),
    )
    .filter(Boolean)
    .sort(compareModelCandidates);

  for (const candidate of normalizedModelCandidates) {
    let manufacturerBucket = manufacturerBuckets.find(
      (bucket) =>
        domainsAreCompatible(bucket.primaryDomain, candidate.manufacturerPrimaryDomain) &&
        (bucket.normalizedName === candidate.manufacturerNormalizedName ||
          bucket.aliasKeySet.has(candidate.manufacturerNormalizedName) ||
          candidate.manufacturerAliases.some(
            (alias) =>
              normalizeManufacturerAlias(alias) === bucket.normalizedName ||
              bucket.aliasKeySet.has(normalizeManufacturerAlias(alias)),
          )),
    );

    if (!manufacturerBucket) {
      manufacturerBucket = createManufacturerBucket({
        aliasKeys: candidate.manufacturerAliases.map((alias) => normalizeManufacturerAlias(alias)),
        aliases: candidate.manufacturerAliases,
        branchCountries: [],
        headquartersCountry: undefined,
        name: candidate.manufacturerName,
        normalizedName: candidate.manufacturerNormalizedName,
        primaryDomain: candidate.manufacturerPrimaryDomain,
        sourceReferenceIds: [],
        sourceSignals: buildSourceSignals([], sourceRegistry),
      });
      manufacturerBuckets.push(manufacturerBucket);
    }

    const existingModelBucket = manufacturerBucket.modelBuckets.find((modelBucket) =>
      modelNamesOverlap(modelBucket, candidate),
    );

    if (existingModelBucket) {
      mergeModelCandidate(existingModelBucket, candidate);
      continue;
    }

    manufacturerBucket.modelBuckets.push(createModelBucket(candidate));
  }

  const manufacturers = finalizeManufacturers(manufacturerBuckets, sourceRegistry);
  const faults = finalizeFaults(input.faults, {
    existingIds,
    now,
    registry: sourceRegistry,
    sourceConfigMap,
    warnings,
  });
  const sourceReferences = [...sourceRegistry.byId.values()].sort(compareByPriorityThenTitle);
  const factClusters = [
    buildFactCluster("definition", definition ? [definition] : []),
    buildFactCluster("operatingPrinciple", operatingPrinciple ? [operatingPrinciple] : []),
    buildFactCluster("components", components),
    buildFactCluster("variants", variants),
    buildFactCluster("uses", uses),
    buildFactCluster("manufacturers", manufacturers),
    buildFactCluster(
      "models",
      manufacturers.flatMap((manufacturer) => manufacturer.models),
    ),
    buildFactCluster("manuals", manuals),
    buildFactCluster("faults", faults),
    buildFactCluster("maintenanceTasks", maintenanceTasks),
    buildFactCluster("safetyPrecautions", safetyPrecautions),
    buildFactCluster("mediaCandidates", mediaCandidates),
  ];
  const missingAttributionClusters = collectMissingAttributionWarnings(factClusters, warnings);

  return {
    components,
    definition,
    equipment: {
      aliases: equipmentAliases,
      locale: collapseWhitespace(input.locale) || RELEASE_1_LOCALE,
      name: equipmentName,
      normalizedName: normalizeTextKey(equipmentName),
      slug: createSlug(equipmentName),
    },
    factClusters,
    faults,
    maintenanceTasks,
    manuals,
    manufacturers,
    mediaCandidates,
    operatingPrinciple,
    reliabilityWarnings: dedupeStrings(warnings),
    safetyPrecautions,
    sourceConfigurations: sourceConfigs.map((config) => ({
      allowedDomains: config.allowedDomainsJson,
      isEnabled: config.isEnabled,
      name: config.name,
      notes: config.notes,
      priority: config.priority,
      sourceType: config.sourceType,
    })),
    sourceReferences,
    uses,
    variants,
    verification: {
      attributedClusterCount: factClusters.filter((cluster) => cluster.sourceReferenceIds.length > 0).length,
      disabledSourceTypes: sourceConfigs
        .filter((config) => !config.isEnabled)
        .map((config) => config.sourceType),
      isValid: missingAttributionClusters.length === 0,
      missingAttributionClusters,
    },
  };
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function normalizeStoredArray(value) {
  return Array.isArray(value) ? normalizeCountryList(value) : [];
}

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

function createSourceConfigSnapshotEntry(config, usageCount) {
  const adapter = getResearchSourceAdapter(config.sourceType);

  return {
    allowedDomains: normalizeAllowedDomainPatterns(config.allowedDomainsJson),
    id: config.id || `source-config-${config.sourceType.toLowerCase()}`,
    isEnabled: config.isEnabled,
    name: config.name,
    notes: config.notes || "",
    priority: config.priority,
    reliabilityMarker: adapter?.reliabilityMarker || null,
    sourceType: config.sourceType,
    usageCount,
  };
}

function createSourceConfigurationSummary(configs) {
  return {
    enabledCount: configs.filter((config) => config.isEnabled).length,
    restrictedCount: configs.filter((config) => config.allowedDomains.length > 0).length,
    totalCount: configs.length,
  };
}

export async function getSourceConfigurationSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [storedConfigs, sourceReferences] = await Promise.all([
    db.sourceConfig.findMany({
      orderBy: [{ priority: "asc" }, { sourceType: "asc" }],
      select: {
        allowedDomainsJson: true,
        id: true,
        isEnabled: true,
        name: true,
        notes: true,
        priority: true,
        sourceType: true,
      },
    }),
    db.sourceReference.findMany({
      select: {
        sourceType: true,
      },
    }),
  ]);
  const mergedConfigs = resolveSourceConfigs(storedConfigs);
  const usageCounts = sourceReferences.reduce((counts, reference) => {
    counts[reference.sourceType] = (counts[reference.sourceType] || 0) + 1;
    return counts;
  }, {});
  const configs = mergedConfigs.map((config) =>
    createSourceConfigSnapshotEntry(
      storedConfigs.find((storedConfig) => storedConfig.sourceType === config.sourceType) || config,
      usageCounts[config.sourceType] || 0,
    ),
  );

  return {
    configs,
    priorityOrder: researchSourceAdapters.map((adapter) => ({
      label: adapter.label,
      priority: adapter.priority,
      sourceType: adapter.sourceType,
    })),
    summary: createSourceConfigurationSummary(configs),
  };
}

export function createResearchDataErrorPayload(error) {
  if (error instanceof ResearchDataError) {
    return {
      body: {
        message: error.message,
        status: error.status,
        success: false,
      },
      statusCode: error.statusCode,
    };
  }

  console.error(error);

  return {
    body: {
      message: "An unexpected research-data error occurred.",
      status: "internal_error",
      success: false,
    },
    statusCode: 500,
  };
}

export async function saveSourceConfigurations(input, options = {}, prisma) {
  const parsedInput = saveSourceConfigurationsSchema.parse(input);
  const normalizedConfigs = resolveSourceConfigs(parsedInput.configs);
  const db = await resolvePrismaClient(prisma);

  await db.$transaction(async (tx) => {
    for (const config of normalizedConfigs) {
      await tx.sourceConfig.upsert({
        where: {
          sourceType: config.sourceType,
        },
        update: {
          allowedDomainsJson: config.allowedDomainsJson,
          isEnabled: config.isEnabled,
          name: config.name,
          notes: config.notes,
          priority: config.priority,
        },
        create: {
          allowedDomainsJson: config.allowedDomainsJson,
          isEnabled: config.isEnabled,
          name: config.name,
          notes: config.notes,
          priority: config.priority,
          sourceType: config.sourceType,
        },
      });
    }

    if (options.actorId) {
      await tx.auditEvent.create({
        data: {
          action: "SOURCE_CONFIG_UPDATED",
          actorId: options.actorId,
          entityId: "research_source_configuration",
          entityType: "source_config",
          payloadJson: {
            configs: normalizedConfigs.map((config) => ({
              allowedDomains: config.allowedDomainsJson,
              isEnabled: config.isEnabled,
              sourceType: config.sourceType,
            })),
          },
        },
      });
    }
  });

  return {
    snapshot: await getSourceConfigurationSnapshot(db),
  };
}

function buildManufacturerSummary(manufacturer) {
  return {
    aliasCount: manufacturer._count.aliases,
    id: manufacturer.id,
    modelCount: manufacturer._count.models,
    name: manufacturer.name,
    primaryDomain: manufacturer.primaryDomain,
    rankingScore: manufacturer.rankingScore,
    sourceReferenceCount: manufacturer._count.sourceReferences,
  };
}

function buildManufacturerEditor(manufacturer) {
  if (!manufacturer) {
    return {
      aliases: [],
      manufacturer: {
        branchCountries: [],
        headquartersCountry: "",
        id: null,
        name: "",
        normalizedName: "",
        primaryDomain: "",
        rankingScore: 0,
        slug: "",
      },
      models: [],
      sourceReferences: [],
      stats: {
        aliasCount: 0,
        modelCount: 0,
        sourceReferenceCount: 0,
      },
    };
  }

  return {
    aliases: manufacturer.aliases.map((alias) => ({
      alias: alias.alias,
      id: alias.id,
      normalizedAlias: alias.normalizedAlias,
    })),
    manufacturer: {
      branchCountries: normalizeStoredArray(manufacturer.branchCountriesJson),
      headquartersCountry: manufacturer.headquartersCountry || "",
      id: manufacturer.id,
      name: manufacturer.name,
      normalizedName: manufacturer.normalizedName,
      primaryDomain: manufacturer.primaryDomain,
      rankingScore: manufacturer.rankingScore,
      slug: manufacturer.slug,
    },
    models: manufacturer.models.map((model) => ({
      equipmentName: model.equipment.name,
      id: model.id,
      latestKnownYear: model.latestKnownYear,
      name: model.name,
      rankingScore: model.rankingScore,
      slug: model.slug,
      sourceReferenceCount: model._count.sourceReferences,
    })),
    sourceReferences: manufacturer.sourceReferences.map((sourceReference) => ({
      id: sourceReference.id,
      lastCheckedAt: serializeDate(sourceReference.lastCheckedAt),
      reliabilityTier: sourceReference.reliabilityTier || null,
      sourceDomain: sourceReference.sourceDomain,
      sourceType: sourceReference.sourceType,
      title: sourceReference.title,
      url: sourceReference.url,
    })),
    stats: {
      aliasCount: manufacturer._count.aliases,
      modelCount: manufacturer._count.models,
      sourceReferenceCount: manufacturer._count.sourceReferences,
    },
  };
}

async function buildUniqueManufacturerSlug(tx, baseSlug, manufacturerId) {
  const rootSlug = baseSlug || "manufacturer";
  let slug = rootSlug;
  let suffix = 2;

  while (true) {
    const existingRecord = await tx.manufacturer.findFirst({
      where: {
        slug,
        ...(manufacturerId
          ? {
              NOT: {
                id: manufacturerId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (!existingRecord) {
      return slug;
    }

    slug = `${rootSlug}-${suffix}`;
    suffix += 1;
  }
}

async function getManufacturerSnapshotSelection(db, requestedManufacturerId) {
  const manufacturers = await db.manufacturer.findMany({
    orderBy: [{ rankingScore: "desc" }, { name: "asc" }],
    select: {
      _count: {
        select: {
          aliases: true,
          models: true,
          sourceReferences: true,
        },
      },
      id: true,
      name: true,
      primaryDomain: true,
      rankingScore: true,
    },
  });
  const selectedManufacturerId =
    manufacturers.find((manufacturer) => manufacturer.id === requestedManufacturerId)?.id ||
    manufacturers[0]?.id ||
    null;

  return {
    manufacturers,
    selectedManufacturerId,
  };
}

export async function getManufacturerManagementSnapshot(
  { manufacturerId } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const { manufacturers, selectedManufacturerId } = await getManufacturerSnapshotSelection(
    db,
    manufacturerId,
  );
  const selectedManufacturer = selectedManufacturerId
    ? await db.manufacturer.findUnique({
        where: {
          id: selectedManufacturerId,
        },
        select: {
          _count: {
            select: {
              aliases: true,
              models: true,
              sourceReferences: true,
            },
          },
          aliases: {
            orderBy: {
              alias: "asc",
            },
            select: {
              alias: true,
              id: true,
              normalizedAlias: true,
            },
          },
          branchCountriesJson: true,
          headquartersCountry: true,
          id: true,
          models: {
            orderBy: [{ rankingScore: "desc" }, { name: "asc" }],
            select: {
              _count: {
                select: {
                  sourceReferences: true,
                },
              },
              equipment: {
                select: {
                  name: true,
                },
              },
              id: true,
              latestKnownYear: true,
              name: true,
              rankingScore: true,
              slug: true,
            },
          },
          name: true,
          normalizedName: true,
          primaryDomain: true,
          rankingScore: true,
          slug: true,
          sourceReferences: {
            orderBy: [{ lastCheckedAt: "desc" }, { title: "asc" }],
            select: {
              id: true,
              lastCheckedAt: true,
              reliabilityTier: true,
              sourceDomain: true,
              sourceType: true,
              title: true,
              url: true,
            },
          },
        },
      })
    : null;
  const aliasCount = manufacturers.reduce(
    (total, manufacturer) => total + manufacturer._count.aliases,
    0,
  );
  const modelCount = manufacturers.reduce(
    (total, manufacturer) => total + manufacturer._count.models,
    0,
  );

  return {
    editor: buildManufacturerEditor(selectedManufacturer),
    manufacturers: manufacturers.map(buildManufacturerSummary),
    selection: {
      manufacturerId: selectedManufacturerId,
    },
    summary: {
      aliasCount,
      manufacturerCount: manufacturers.length,
      modelCount,
    },
  };
}

export async function saveManufacturerRecord(input, options = {}, prisma) {
  const parsedInput = saveManufacturerRecordSchema.parse(input);
  const db = await resolvePrismaClient(prisma);
  const name = collapseWhitespace(parsedInput.name);
  const normalizedName = normalizeManufacturerName(name);
  const primaryDomain = normalizeDomain(parsedInput.primaryDomain);

  if (!primaryDomain) {
    throw new ResearchDataError("A valid primary domain is required for manufacturer records.", {
      status: "invalid_primary_domain",
      statusCode: 400,
    });
  }

  const aliases = [];
  const aliasKeys = new Set();

  for (const alias of dedupeStrings(parsedInput.aliases)) {
    const aliasKey = normalizeManufacturerAlias(alias);

    if (!aliasKey || aliasKey === normalizedName || aliasKeys.has(aliasKey)) {
      continue;
    }

    aliasKeys.add(aliasKey);
    aliases.push(alias);
  }
  const branchCountries = normalizeCountryList(parsedInput.branchCountries);
  const headquartersCountry = collapseWhitespace(parsedInput.headquartersCountry);

  const savedManufacturer = await db.$transaction(async (tx) => {
    const conflictingManufacturer = await tx.manufacturer.findFirst({
      where: {
        normalizedName,
        primaryDomain,
        ...(parsedInput.manufacturerId
          ? {
              NOT: {
                id: parsedInput.manufacturerId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (conflictingManufacturer) {
      throw new ResearchDataError(
        `A canonical manufacturer already exists for "${name}" on ${primaryDomain}.`,
        {
          status: "duplicate_manufacturer",
          statusCode: 409,
        },
      );
    }

    const slug = await buildUniqueManufacturerSlug(
      tx,
      createSlug(name),
      parsedInput.manufacturerId,
    );
    const record = parsedInput.manufacturerId
      ? await tx.manufacturer.update({
          where: {
            id: parsedInput.manufacturerId,
          },
          data: {
            branchCountriesJson: branchCountries.length ? branchCountries : null,
            headquartersCountry: headquartersCountry || null,
            name,
            normalizedName,
            primaryDomain,
            slug,
          },
          select: {
            id: true,
          },
        })
      : await tx.manufacturer.create({
          data: {
            branchCountriesJson: branchCountries.length ? branchCountries : null,
            headquartersCountry: headquartersCountry || null,
            name,
            normalizedName,
            primaryDomain,
            rankingScore: 0,
            slug,
          },
          select: {
            id: true,
          },
        });

    await tx.manufacturerAlias.deleteMany({
      where: {
        manufacturerId: record.id,
      },
    });

    if (aliases.length) {
      await tx.manufacturerAlias.createMany({
        data: aliases.map((alias) => ({
          alias,
          manufacturerId: record.id,
          normalizedAlias: normalizeManufacturerAlias(alias),
        })),
      });
    }

    if (options.actorId) {
      await tx.auditEvent.create({
        data: {
          action: parsedInput.manufacturerId
            ? "MANUFACTURER_UPDATED"
            : "MANUFACTURER_CREATED",
          actorId: options.actorId,
          entityId: record.id,
          entityType: "manufacturer",
          payloadJson: {
            aliasCount: aliases.length,
            branchCountries,
            headquartersCountry: headquartersCountry || null,
            primaryDomain,
          },
        },
      });
    }

    return record;
  });

  return {
    manufacturerId: savedManufacturer.id,
    snapshot: await getManufacturerManagementSnapshot(
      {
        manufacturerId: savedManufacturer.id,
      },
      db,
    ),
  };
}
