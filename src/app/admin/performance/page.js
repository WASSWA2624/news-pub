import {
  AdminEyebrow,
  AdminHero,
  AdminHeroHeading,
  AdminMetricCard,
  AdminPage,
  AdminSectionTitle,
  Card,
  CardDescription,
  DataTable,
  DataTableWrap,
  EmptyState,
  SectionGrid,
  StatusBadge,
  SummaryGrid,
} from "@/components/admin/news-admin-ui";
import { getAdminPerformanceSnapshot } from "@/features/performance";
import { defaultLocale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/get-messages";
import { requireAdminPageSession } from "@/lib/auth";

function getTone(status) {
  if (status === "poor") {
    return "danger";
  }

  if (status === "warning") {
    return "warning";
  }

  return "success";
}

function formatThresholdLabel(threshold) {
  if (!threshold) {
    return "";
  }

  const warningValue = threshold.unit === "score"
    ? threshold.p75WarningThreshold.toFixed(2)
    : Math.round(threshold.p75WarningThreshold);
  const poorValue = threshold.unit === "score"
    ? threshold.p75PoorThreshold.toFixed(2)
    : Math.round(threshold.p75PoorThreshold);

  return `${warningValue}/${poorValue} ${threshold.unit}`;
}

export default async function AdminPerformancePage() {
  const auth = await requireAdminPageSession("/admin/performance");
  const [messages, snapshot] = await Promise.all([
    getMessages(defaultLocale),
    getAdminPerformanceSnapshot(auth.user),
  ]);
  const copy = messages.admin.performance;

  return (
    <AdminPage>
      <AdminHero>
        <AdminEyebrow>{messages.admin.title}</AdminEyebrow>
        <AdminHeroHeading description={copy.description} icon="activity" title={copy.title} tone="accent" />
      </AdminHero>

      <SummaryGrid>
        <AdminMetricCard icon="activity" label="Captured vitals samples" tone="accent" value={snapshot.summary.sampleCount} />
        <AdminMetricCard icon="globe" label="Tracked public route groups" value={snapshot.summary.routeGroupCount} />
        <AdminMetricCard icon="tag" label="Observed build ids" value={snapshot.summary.uniqueBuildCount} />
      </SummaryGrid>

      <SummaryGrid>
        <AdminMetricCard icon="sparkles" label="Latest build id" tone="accent" value={snapshot.summary.latestBuildId} />
        {snapshot.metricHighlights.map((highlight) => (
          <AdminMetricCard
            icon="dashboard"
            key={highlight.metricName}
            label={`${highlight.metricName} p75`}
            tone={getTone(highlight.status)}
            value={highlight.sampleCount ? highlight.p75 : "No data"}
          />
        ))}
      </SummaryGrid>

      <SectionGrid $wide>
        <Card>
          <AdminSectionTitle icon="warning">Latest build alerts</AdminSectionTitle>
          <CardDescription>
            Alerts fire when the latest build exceeds the defined p75 warning or poor thresholds for Core Web Vitals.
          </CardDescription>
          {snapshot.alerts.length ? (
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Route</th>
                    <th>Form factor</th>
                    <th>p75</th>
                    <th>Status</th>
                    <th>Thresholds</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.alerts.map((alert) => (
                    <tr key={`${alert.metricName}-${alert.route_group}-${alert.form_factor}`}>
                      <td data-label="Metric">{alert.metricName}</td>
                      <td data-label="Route">{alert.route_group}</td>
                      <td data-label="Form factor">{alert.form_factor}</td>
                      <td data-label="p75">{alert.p75}</td>
                      <td data-label="Status">
                        <StatusBadge $tone={getTone(alert.status)}>{alert.status}</StatusBadge>
                      </td>
                      <td data-label="Thresholds">{formatThresholdLabel(alert.threshold)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableWrap>
          ) : (
            <EmptyState>No latest-build regressions are currently above the configured p75 thresholds.</EmptyState>
          )}
        </Card>

        <Card>
          <AdminSectionTitle icon="dashboard">Threshold policy</AdminSectionTitle>
          <CardDescription>
            Warning thresholds are tuned for early regression detection. Poor thresholds reflect the point where the latest build needs intervention before release promotion.
          </CardDescription>
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Warning / poor</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.metricHighlights.map((highlight) => (
                  <tr key={`threshold-${highlight.metricName}`}>
                    <td data-label="Metric">{highlight.metricName}</td>
                    <td data-label="Warning / poor">{formatThresholdLabel(highlight.threshold)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        </Card>
      </SectionGrid>

      <Card>
        <AdminSectionTitle icon="activity">Latest build p75 by route and form factor</AdminSectionTitle>
        <CardDescription>
          Use this table to compare the latest deployed build across home, news index, category, search, and story templates.
        </CardDescription>
        {snapshot.latestBuildMetrics.length ? (
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Route</th>
                  <th>Form factor</th>
                  <th>p75</th>
                  <th>Samples</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.latestBuildMetrics.map((sample) => (
                  <tr key={`${sample.metricName}-${sample.route_group}-${sample.form_factor}`}>
                    <td data-label="Metric">{sample.metricName}</td>
                    <td data-label="Route">{sample.route_group}</td>
                    <td data-label="Form factor">{sample.form_factor}</td>
                    <td data-label="p75">{sample.p75}</td>
                    <td data-label="Samples">{sample.count}</td>
                    <td data-label="Status">
                      <StatusBadge $tone={getTone(sample.status)}>{sample.status}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        ) : (
          <EmptyState>No web-vitals samples have been captured yet for the latest build.</EmptyState>
        )}
      </Card>
    </AdminPage>
  );
}
