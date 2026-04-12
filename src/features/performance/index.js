import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/lib/auth/rbac";
import { resolvePrismaClient } from "@/lib/news/shared";

export const performanceThresholds = Object.freeze({
  CLS: Object.freeze({
    p75PoorThreshold: 0.25,
    p75WarningThreshold: 0.1,
    unit: "score",
  }),
  FCP: Object.freeze({
    p75PoorThreshold: 3000,
    p75WarningThreshold: 1800,
    unit: "ms",
  }),
  INP: Object.freeze({
    p75PoorThreshold: 500,
    p75WarningThreshold: 200,
    unit: "ms",
  }),
  LCP: Object.freeze({
    p75PoorThreshold: 4000,
    p75WarningThreshold: 2500,
    unit: "ms",
  }),
  TTFB: Object.freeze({
    p75PoorThreshold: 1800,
    p75WarningThreshold: 800,
    unit: "ms",
  }),
});

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function roundMetricValue(value, digits = 3) {
  return Number.parseFloat(Number(value || 0).toFixed(digits));
}

function formatBuildLabel(value) {
  const normalizedValue = `${value || ""}`.trim();

  return normalizedValue || "unversioned";
}

function calculatePercentile(values = [], percentile = 75) {
  if (!values.length) {
    return 0;
  }

  const sortedValues = [...values]
    .map((value) => Number(value || 0))
    .sort((left, right) => left - right);
  const position = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil((percentile / 100) * sortedValues.length) - 1));

  return sortedValues[position] || 0;
}

function getMetricThreshold(name) {
  return performanceThresholds[name] || performanceThresholds.LCP;
}

function getMetricStatus(name, p75) {
  const threshold = getMetricThreshold(name);

  if (p75 >= threshold.p75PoorThreshold) {
    return "poor";
  }

  if (p75 >= threshold.p75WarningThreshold) {
    return "warning";
  }

  return "good";
}

function buildMetricSample(records, { buildId, formFactor, name, routeGroup }) {
  const values = records.map((record) => record.value);
  const latestRecord = records
    .slice()
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  const p75 = calculatePercentile(values, 75);

  return {
    buildId: formatBuildLabel(buildId),
    count: records.length,
    formFactor,
    latestAt: serializeDate(latestRecord?.createdAt),
    metricName: name,
    p75: roundMetricValue(p75, name === "CLS" ? 3 : 0),
    routeGroup,
    sampleValues: values,
    status: getMetricStatus(name, p75),
    threshold: getMetricThreshold(name),
  };
}

function sortMetricSamples(left, right) {
  return (
    left.metricName.localeCompare(right.metricName)
    || left.routeGroup.localeCompare(right.routeGroup)
    || left.formFactor.localeCompare(right.formFactor)
    || left.buildId.localeCompare(right.buildId)
  );
}

function summarizeByMetric(records = []) {
  const groupedRecords = new Map();

  for (const record of records) {
    const key = [
      formatBuildLabel(record.buildId),
      record.formFactor,
      record.name,
      record.routeGroup,
    ].join(":");

    if (!groupedRecords.has(key)) {
      groupedRecords.set(key, []);
    }

    groupedRecords.get(key).push(record);
  }

  return [...groupedRecords.entries()]
    .map(([key, value]) => {
      const [buildId, formFactor, name, routeGroup] = key.split(":");

      return buildMetricSample(value, {
        buildId,
        formFactor,
        name,
        routeGroup,
      });
    })
    .sort(sortMetricSamples);
}

function createLatestBuildSummary(metricSamples = [], latestBuildId = "") {
  const resolvedBuildId = formatBuildLabel(latestBuildId) || metricSamples[0]?.buildId || "unversioned";

  return metricSamples.filter((sample) => sample.buildId === resolvedBuildId);
}

function createMetricHighlights(records = []) {
  return Object.keys(performanceThresholds).map((metricName) => {
    const metricValues = records.filter((record) => record.name === metricName).map((record) => record.value);
    const p75 = calculatePercentile(metricValues, 75);

    return {
      metricName,
      p75: roundMetricValue(p75, metricName === "CLS" ? 3 : 0),
      sampleCount: metricValues.length,
      status: getMetricStatus(metricName, p75),
      threshold: getMetricThreshold(metricName),
    };
  });
}

function createAlerts(metricSamples = []) {
  return metricSamples
    .filter((sample) => sample.status !== "good")
    .sort((left, right) => right.p75 - left.p75)
    .map((sample) => ({
      buildId: sample.buildId,
      formFactor: sample.formFactor,
      metricName: sample.metricName,
      p75: sample.p75,
      routeGroup: sample.routeGroup,
      status: sample.status,
      threshold: sample.threshold,
    }));
}

export async function getAdminPerformanceSnapshot(
  user,
  { buildId = "", days = 7, routeGroup = "" } = {},
  prisma,
) {
  const canViewAnalytics = hasAdminPermission(user, ADMIN_PERMISSIONS.VIEW_ANALYTICS);

  if (!canViewAnalytics) {
    return {
      alerts: [],
      canViewAnalytics,
      latestBuildMetrics: [],
      metricHighlights: [],
      metricSamples: [],
      summary: {
        latestBuildId: "restricted",
        routeGroupCount: 0,
        sampleCount: 0,
        uniqueBuildCount: 0,
      },
    };
  }

  const db = await resolvePrismaClient(prisma);
  const since = new Date(Date.now() - Math.max(1, Number.parseInt(`${days || 7}`, 10) || 7) * 24 * 60 * 60 * 1000);
  const records = await db.webVitalMetric.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      buildId: true,
      createdAt: true,
      formFactor: true,
      id: true,
      name: true,
      path: true,
      routeGroup: true,
      value: true,
    },
    where: {
      createdAt: {
        gte: since,
      },
      ...(buildId ? { buildId } : {}),
      ...(routeGroup ? { routeGroup } : {}),
    },
  });
  const metricSamples = summarizeByMetric(records);
  const latestBuildId = formatBuildLabel(records[0]?.buildId);
  const latestBuildMetrics = createLatestBuildSummary(metricSamples, latestBuildId);

  return {
    alerts: createAlerts(latestBuildMetrics),
    canViewAnalytics,
    latestBuildMetrics,
    metricHighlights: createMetricHighlights(records),
    metricSamples,
    summary: {
      latestBuildId: latestBuildMetrics[0]?.buildId || latestBuildId,
      routeGroupCount: new Set(records.map((record) => record.routeGroup)).size,
      sampleCount: records.length,
      uniqueBuildCount: new Set(records.map((record) => formatBuildLabel(record.buildId))).size,
    },
  };
}
