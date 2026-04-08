/**
 * Shared-fetch planning helpers that decide when NewsPub streams can safely widen one provider request together.
 */

import {
  getProviderEndpointShape,
  getProviderTimeBoundarySupport,
  resolveStreamProviderRequestValues,
} from "@/lib/news/provider-definitions";
import { mergeExecutionFetchWindows, serializeFetchWindow } from "@/lib/news/fetch-window";

const PROVIDER_CREDENTIAL_SOURCES = Object.freeze({
  mediastack: "MEDIASTACK_API_KEY",
  newsapi: "NEWSAPI_API_KEY",
  newsdata: "NEWSDATA_API_KEY",
});

const PROVIDER_SHARED_FETCH_STRATEGIES = Object.freeze({
  mediastack: {
    defaultEndpoint: "default",
    identicalFieldsByEndpoint: Object.freeze({
      default: Object.freeze(["keywords", "sort"]),
    }),
    unionArrayFieldsByEndpoint: Object.freeze({
      default: Object.freeze([
        "categories",
        "countries",
        "excludeCategories",
        "excludeCountries",
        "excludeLanguages",
        "languages",
      ]),
    }),
    unionCsvFieldsByEndpoint: Object.freeze({
      default: Object.freeze([]),
    }),
  },
  newsdata: {
    defaultEndpoint: "latest",
    identicalFieldsByEndpoint: Object.freeze({
      archive: Object.freeze([
        "creator",
        "domain",
        "domainurl",
        "excludeDomains",
        "fullContent",
        "image",
        "prioritydomain",
        "q",
        "qInMeta",
        "qInTitle",
        "removeDuplicate",
        "sentiment",
        "sort",
        "url",
        "video",
      ]),
      latest: Object.freeze([
        "creator",
        "domain",
        "domainurl",
        "excludeDomains",
        "fullContent",
        "image",
        "prioritydomain",
        "q",
        "qInMeta",
        "qInTitle",
        "removeDuplicate",
        "sentiment",
        "sort",
        "url",
        "video",
      ]),
    }),
    unionArrayFieldsByEndpoint: Object.freeze({
      archive: Object.freeze([
        "category",
        "country",
        "datatype",
        "excludeCategories",
        "excludeCountries",
        "excludeLanguages",
        "language",
      ]),
      latest: Object.freeze([
        "category",
        "country",
        "datatype",
        "excludeCategories",
        "excludeCountries",
        "excludeLanguages",
        "language",
      ]),
    }),
    unionCsvFieldsByEndpoint: Object.freeze({
      archive: Object.freeze([]),
      latest: Object.freeze([]),
    }),
  },
  newsapi: {
    defaultEndpoint: "top-headlines",
    identicalFieldsByEndpoint: Object.freeze({
      everything: Object.freeze(["language", "q", "sortBy"]),
      "top-headlines": Object.freeze(["category", "country", "q"]),
    }),
    unionArrayFieldsByEndpoint: Object.freeze({
      everything: Object.freeze(["searchIn"]),
      "top-headlines": Object.freeze([]),
    }),
    unionCsvFieldsByEndpoint: Object.freeze({
      everything: Object.freeze(["domains", "excludeDomains"]),
      "top-headlines": Object.freeze([]),
    }),
  },
});

function normalizeScalar(value) {
  return `${value ?? ""}`.trim();
}

function normalizeArray(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values]).map((value) => normalizeScalar(value)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function normalizeCsv(value) {
  return normalizeArray(
    normalizeScalar(value)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

function normalizeComparableValue(value, type = "scalar") {
  if (type === "array") {
    return normalizeArray(value);
  }

  if (type === "csv") {
    return normalizeCsv(value);
  }

  return normalizeScalar(value);
}

function getProviderStrategy(providerKey, endpoint) {
  const strategy = PROVIDER_SHARED_FETCH_STRATEGIES[providerKey];
  const resolvedEndpoint = endpoint || strategy?.defaultEndpoint || "default";

  if (!strategy) {
    return null;
  }

  return {
    endpoint: resolvedEndpoint,
    identicalFields: strategy.identicalFieldsByEndpoint?.[resolvedEndpoint] || Object.freeze([]),
    unionArrayFields: strategy.unionArrayFieldsByEndpoint?.[resolvedEndpoint] || Object.freeze([]),
    unionCsvFields: strategy.unionCsvFieldsByEndpoint?.[resolvedEndpoint] || Object.freeze([]),
  };
}

function getTimeManagedFieldKeys(timeBoundarySupport) {
  return [
    timeBoundarySupport?.endKey,
    timeBoundarySupport?.startKey,
    timeBoundarySupport?.timeframeKey,
  ].filter(Boolean);
}

function buildRequestSignature(requestValues, strategy, timeBoundarySupport) {
  const signature = {};
  const timeManagedFieldKeys = new Set(getTimeManagedFieldKeys(timeBoundarySupport));

  // Time-window fields are partitioned by capability mode separately, so the
  // signature keeps only the restrictive non-time filters that must stay identical.
  for (const fieldKey of strategy?.identicalFields || []) {
    if (timeManagedFieldKeys.has(fieldKey)) {
      continue;
    }

    signature[fieldKey] = normalizeComparableValue(requestValues?.[fieldKey]);
  }

  return JSON.stringify(signature);
}

function mergeSharedRequestValues(requestValuesList, strategy, timeBoundarySupport) {
  const timeManagedFieldKeys = new Set(getTimeManagedFieldKeys(timeBoundarySupport));
  const baseRequestValues = {
    ...(requestValuesList[0] || {}),
  };

  for (const fieldKey of timeManagedFieldKeys) {
    delete baseRequestValues[fieldKey];
  }

  // NewsPub widens only the fields that the provider contract marks as safe to
  // union; stricter scalar filters stay in the signature and split the group.
  for (const fieldKey of strategy?.unionArrayFields || []) {
    const mergedValues = normalizeArray(requestValuesList.flatMap((requestValues) => requestValues?.[fieldKey] || []));

    if (mergedValues.length) {
      baseRequestValues[fieldKey] = mergedValues;
    } else {
      delete baseRequestValues[fieldKey];
    }
  }

  for (const fieldKey of strategy?.unionCsvFields || []) {
    const mergedValues = normalizeArray(
      requestValuesList.flatMap((requestValues) => normalizeCsv(requestValues?.[fieldKey])),
    );

    if (mergedValues.length) {
      baseRequestValues[fieldKey] = mergedValues.join(",");
    } else {
      delete baseRequestValues[fieldKey];
    }
  }

  return baseRequestValues;
}

function groupBy(items, keyFactory) {
  const groups = new Map();

  for (const item of items) {
    const key = keyFactory(item);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);
  }

  return groups;
}

function buildPartitionReasonCodes({
  providerFamilySize,
  endpointFamilySize,
  signatureFamilySize,
  timeBoundaryFamilySize,
}) {
  const reasonCodes = [];

  if (providerFamilySize > endpointFamilySize) {
    reasonCodes.push("provider_endpoint_shape_mismatch");
  }

  if (endpointFamilySize > timeBoundaryFamilySize) {
    reasonCodes.push("provider_time_boundary_semantics_mismatch");
  }

  if (timeBoundaryFamilySize > signatureFamilySize) {
    reasonCodes.push("provider_request_constraint_mismatch");
  }

  return reasonCodes;
}

/**
 * Produces provider-aware shared-fetch groups for one execution request.
 *
 * @param {Array<object>} streamExecutions - Loaded stream execution contexts.
 * @returns {Array<object>} Compatible provider request groups.
 */
export function planSharedFetchGroups(streamExecutions = []) {
  const decoratedExecutions = streamExecutions.map((execution, index) => {
    const providerKey = `${execution.stream?.activeProvider?.providerKey || ""}`.trim().toLowerCase();
    const requestValues = resolveStreamProviderRequestValues(providerKey, {
      countryAllowlistJson: execution.stream?.countryAllowlistJson,
      languageAllowlistJson: execution.stream?.languageAllowlistJson,
      locale: execution.stream?.locale,
      providerDefaults: execution.stream?.activeProvider?.requestDefaultsJson,
      providerFilters: execution.stream?.settingsJson?.providerFilters || {},
    });
    const endpoint = getProviderEndpointShape(providerKey, requestValues);
    const timeBoundarySupport = getProviderTimeBoundarySupport(providerKey, requestValues);
    const strategy = getProviderStrategy(providerKey, endpoint);
    const credentialSource = PROVIDER_CREDENTIAL_SOURCES[providerKey] || "unknown_credential_source";

    return {
      ...execution,
      compatibilitySignature: strategy
        ? buildRequestSignature(requestValues, strategy, timeBoundarySupport)
        : `single:${execution.stream?.id || index}`,
      credentialSource,
      endpoint,
      inputIndex: index,
      providerKey,
      requestValues,
      strategy,
      timeBoundarySupport,
    };
  });
  const providerFamilies = groupBy(
    decoratedExecutions,
    (execution) => `${execution.providerKey}::${execution.credentialSource}`,
  );
  const plannedGroups = [];

  for (const providerFamily of providerFamilies.values()) {
    const endpointFamilies = groupBy(providerFamily, (execution) => execution.endpoint);

    for (const endpointFamily of endpointFamilies.values()) {
      const timeBoundaryFamilies = groupBy(
        endpointFamily,
        (execution) => `${execution.timeBoundarySupport?.mode || "local_only"}::${execution.timeBoundarySupport?.precision || "datetime"}`,
      );

      for (const timeBoundaryFamily of timeBoundaryFamilies.values()) {
        const signatureFamilies = groupBy(
          timeBoundaryFamily,
          (execution) => execution.compatibilitySignature,
        );

        for (const signatureFamily of signatureFamilies.values()) {
          const firstExecution = signatureFamily[0];
          const mergedFetchWindow = mergeExecutionFetchWindows(
            signatureFamily.map((execution) => execution.fetchWindow),
          );
          const sharedRequestValues = firstExecution.strategy
            ? mergeSharedRequestValues(
                signatureFamily.map((execution) => execution.requestValues),
                firstExecution.strategy,
                firstExecution.timeBoundarySupport,
              )
            : {
                ...(firstExecution.requestValues || {}),
              };
          const partitionReasonCodes = buildPartitionReasonCodes({
            endpointFamilySize: endpointFamily.length,
            providerFamilySize: providerFamily.length,
            signatureFamilySize: signatureFamily.length,
            timeBoundaryFamilySize: timeBoundaryFamily.length,
          });

          plannedGroups.push({
            credentialSource: firstExecution.credentialSource,
            endpoint: firstExecution.endpoint,
            executionMode: signatureFamily.length > 1 ? "shared_batch" : "single",
            id: `shared_fetch_${firstExecution.providerKey}_${firstExecution.endpoint}_${plannedGroups.length + 1}`,
            partitionReasonCodes,
            providerKey: firstExecution.providerKey,
            sharedFetchWindow: mergedFetchWindow,
            sharedRequestValues,
            streamExecutions: signatureFamily.sort((left, right) => left.inputIndex - right.inputIndex),
            streamIds: signatureFamily.map((execution) => execution.stream.id),
            timeBoundarySupport: firstExecution.timeBoundarySupport,
          });
        }
      }
    }
  }

  return plannedGroups.sort(
    (left, right) => left.streamExecutions[0].inputIndex - right.streamExecutions[0].inputIndex,
  );
}

/**
 * Serializes one shared-fetch group for fetch-run observability and audit logs.
 *
 * @param {object} group - Planned shared-fetch group.
 * @returns {object} Safe summary payload.
 */
export function serializeSharedFetchGroup(group) {
  return {
    credentialSource: group.credentialSource,
    endpoint: group.endpoint,
    executionMode: group.executionMode,
    groupId: group.id,
    partitionReasonCodes: group.partitionReasonCodes || [],
    providerKey: group.providerKey,
    requestValues: group.sharedRequestValues || {},
    streamIds: group.streamIds || [],
    timeBoundarySupport: group.timeBoundarySupport
      ? {
          endpoint: group.timeBoundarySupport.endpoint,
          mode: group.timeBoundarySupport.mode,
          precision: group.timeBoundarySupport.precision,
          summary: group.timeBoundarySupport.summary,
        }
      : null,
    window: serializeFetchWindow(group.sharedFetchWindow),
  };
}
