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

function buildMetricSample(records, { build_id, form_factor, name, route_group }) {
  const values = records.map((record) => record.value);
  const latestRecord = records
    .slice()
    .sort((left, right) => right.created_at.getTime() - left.created_at.getTime())[0];
  const p75 = calculatePercentile(values, 75);

  return {
    build_id: formatBuildLabel(build_id),
    count: records.length,
    form_factor,
    latestAt: serializeDate(latestRecord?.created_at),
    metricName: name,
    p75: roundMetricValue(p75, name === "CLS" ? 3 : 0),
    route_group,
    sampleValues: values,
    status: getMetricStatus(name, p75),
    threshold: getMetricThreshold(name),
  };
}

function sortMetricSamples(left, right) {
  return (
    left.metricName.localeCompare(right.metricName)
    || left.route_group.localeCompare(right.route_group)
    || left.form_factor.localeCompare(right.form_factor)
    || left.build_id.localeCompare(right.build_id)
  );
}

function summarizeByMetric(records = []) {
  const groupedRecords = new Map();

  for (const record of records) {
    const key = [
      formatBuildLabel(record.build_id),
      record.form_factor,
      record.name,
      record.route_group,
    ].join(":");

    if (!groupedRecords.has(key)) {
      groupedRecords.set(key, []);
    }

    groupedRecords.get(key).push(record);
  }

  return [...groupedRecords.entries()]
    .map(([key, value]) => {
      const [build_id, form_factor, name, route_group] = key.split(":");

      return buildMetricSample(value, {
        build_id,
        form_factor,
        name,
        route_group,
      });
    })
    .sort(sortMetricSamples);
}

function createLatestBuildSummary(metricSamples = [], latestBuildId = "") {
  const resolvedBuildId = formatBuildLabel(latestBuildId) || metricSamples[0]?.build_id || "unversioned";

  return metricSamples.filter((sample) => sample.build_id === resolvedBuildId);
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
      build_id: sample.build_id,
      form_factor: sample.form_factor,
      metricName: sample.metricName,
      p75: sample.p75,
      route_group: sample.route_group,
      status: sample.status,
      threshold: sample.threshold,
    }));
}

export async function getAdminPerformanceSnapshot(
  user,
  { build_id = "", days = 7, route_group = "" } = {},
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
    orderBy: [{ created_at: "desc" }],
    select: {
      build_id: true,
      created_at: true,
      form_factor: true,
      id: true,
      name: true,
      path: true,
      route_group: true,
      value: true,
    },
    where: {
      created_at: {
        gte: since,
      },
      ...(build_id ? { build_id } : {}),
      ...(route_group ? { route_group } : {}),
    },
  });
  const metricSamples = summarizeByMetric(records);
  const latestBuildId = formatBuildLabel(records[0]?.build_id);
  const latestBuildMetrics = createLatestBuildSummary(metricSamples, latestBuildId);

  return {
    alerts: createAlerts(latestBuildMetrics),
    canViewAnalytics,
    latestBuildMetrics,
    metricHighlights: createMetricHighlights(records),
    metricSamples,
    summary: {
      latestBuildId: latestBuildMetrics[0]?.build_id || latestBuildId,
      routeGroupCount: new Set(records.map((record) => record.route_group)).size,
      sampleCount: records.length,
      uniqueBuildCount: new Set(records.map((record) => formatBuildLabel(record.build_id))).size,
    },
  };
}
