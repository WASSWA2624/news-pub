"use client";

import Link from "next/link";
import styled from "styled-components";

function formatDateTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number.isFinite(value) ? value : 0);
}

function formatStageLabel(value) {
  return `${value || "unknown"}`
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getToneFromStatus(status) {
  if (status === "FAILED") {
    return "error";
  }

  if (status === "COMPLETED") {
    return "success";
  }

  if (status === "RUNNING") {
    return "accent";
  }

  return "default";
}

const Page = styled.main`
  display: grid;
  gap: clamp(0.95rem, 2vw, 1.3rem);
  margin: 0 auto;
  max-width: 1280px;
  padding: clamp(1rem, 2.6vw, 1.8rem);
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.22), transparent 38%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.12), rgba(16, 32, 51, 0.03));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  display: grid;
  gap: 0.72rem;
  overflow: hidden;
  padding: clamp(1.05rem, 3vw, 1.7rem);
`;

const Eyebrow = styled.p`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: clamp(1.8rem, 4.2vw, 2.95rem);
  line-height: 0.98;
  margin: 0;
  max-width: 16ch;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.98rem;
  line-height: 1.55;
  margin: 0;
  max-width: 58ch;
`;

const SummaryGrid = styled.section`
  display: grid;
  gap: 0.82rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
`;

const SummaryCard = styled.section`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 249, 252, 0.92));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 12px 34px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: 0.25rem;
  padding: 0.92rem 1rem;
`;

const SummaryValue = styled.strong`
  font-size: clamp(1.55rem, 3vw, 2.1rem);
  line-height: 0.92;
`;

const SmallText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.94rem;
  line-height: 1.45;
  margin: 0;
`;

const Grid = styled.section`
  display: grid;
  gap: clamp(0.95rem, 2vw, 1.2rem);

  @media (min-width: 1040px) {
    grid-template-columns: minmax(0, 1.25fr) minmax(360px, 0.95fr);
  }
`;

const Card = styled.section`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 14px 38px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: 0.85rem;
  padding: clamp(0.95rem, 2.3vw, 1.2rem);
`;

const SectionHeader = styled.div`
  display: grid;
  gap: 0.3rem;
`;

const CardTitle = styled.h2`
  font-size: 1rem;
  margin: 0;
`;

const BarGrid = styled.div`
  align-items: end;
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(14, minmax(28px, 1fr));
  min-height: 170px;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  scrollbar-width: thin;
`;

const BarColumn = styled.div`
  align-items: center;
  display: grid;
  gap: 0.2rem;
  justify-items: center;
  min-width: 0;
`;

const BarTrack = styled.div`
  align-items: end;
  background: rgba(16, 32, 51, 0.04);
  border-radius: 999px;
  display: flex;
  height: 140px;
  padding: 0.28rem;
  width: 100%;
`;

const BarFill = styled.div`
  background: linear-gradient(180deg, rgba(201, 123, 42, 0.92), rgba(0, 95, 115, 0.96));
  border-radius: 999px;
  min-height: ${({ $height }) => ($height > 0 ? "10px" : "0")};
  width: 100%;
  height: ${({ $height }) => `${$height}%`};
`;

const BarLabel = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.68rem;
`;

const BarValue = styled.strong`
  font-size: 0.76rem;
`;

const ItemList = styled.div`
  display: grid;
  gap: 0.72rem;
`;

const Item = styled.article`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 252, 0.94));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: 0.55rem;
  padding: 0.88rem 0.95rem;
`;

const Row = styled.div`
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
  justify-content: space-between;
`;

const ItemTitle = styled.h3`
  font-size: 0.96rem;
  margin: 0;
`;

const MetaRow = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.7rem;
  font-size: 0.82rem;
`;

const Pill = styled.span`
  background: ${({ $tone }) =>
    $tone === "error"
      ? "rgba(168, 49, 49, 0.12)"
      : $tone === "success"
        ? "rgba(21, 115, 71, 0.12)"
        : $tone === "accent"
          ? "rgba(201, 123, 42, 0.16)"
          : "rgba(0, 95, 115, 0.12)"};
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.26rem 0.58rem;
`;

const EmptyState = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.7;
  margin: 0;
`;

const Notice = styled(Card)`
  background:
    linear-gradient(180deg, rgba(255, 251, 239, 0.96), rgba(255, 255, 255, 0.96)),
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.18), transparent 46%);
`;

const InlineLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
`;

export default function AnalyticsDashboardScreen({ copy, initialData }) {
  const trendMax = Math.max(...initialData.analytics.trend.map((entry) => entry.totalViews), 0);

  return (
    <Page>
      <Hero>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Title>{copy.title}</Title>
        <Description>{copy.description}</Description>
      </Hero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.generationJobCount30d)}</SummaryValue>
          <SmallText>{copy.generationJobsLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.completedJobCount30d)}</SummaryValue>
          <SmallText>{copy.completedJobsLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.failedJobCount30d)}</SummaryValue>
          <SmallText>{copy.failedJobsLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.warningJobCount30d)}</SummaryValue>
          <SmallText>{copy.warningJobsLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.failureLogCount14d)}</SummaryValue>
          <SmallText>{copy.failureLogsLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.scheduledRunCount14d)}</SummaryValue>
          <SmallText>{copy.scheduledRunsLabel}</SmallText>
        </SummaryCard>
      </SummaryGrid>

      {initialData.permissions.canViewAnalytics ? (
        <Grid>
          <Card>
            <SectionHeader>
              <CardTitle>{copy.trafficSectionTitle}</CardTitle>
              <SmallText>{copy.trafficSectionDescription}</SmallText>
            </SectionHeader>
            <SummaryGrid>
              <SummaryCard>
                <SummaryValue>{formatNumber(initialData.analytics.totalViewCount30d)}</SummaryValue>
                <SmallText>{copy.totalViewsLabel}</SmallText>
              </SummaryCard>
              <SummaryCard>
                <SummaryValue>{formatNumber(initialData.analytics.websiteViewCount30d)}</SummaryValue>
                <SmallText>{copy.websiteViewsLabel}</SmallText>
              </SummaryCard>
              <SummaryCard>
                <SummaryValue>{formatNumber(initialData.analytics.pageViewCount30d)}</SummaryValue>
                <SmallText>{copy.pageViewsLabel}</SmallText>
              </SummaryCard>
              <SummaryCard>
                <SummaryValue>{formatNumber(initialData.analytics.postViewCount30d)}</SummaryValue>
                <SmallText>{copy.postViewsLabel}</SmallText>
              </SummaryCard>
            </SummaryGrid>
            {initialData.analytics.trend.length ? (
              <>
                <SectionHeader>
                  <CardTitle>{copy.trendTitle}</CardTitle>
                </SectionHeader>
                <BarGrid aria-label={copy.trendTitle}>
                  {initialData.analytics.trend.map((entry) => (
                    <BarColumn key={entry.date}>
                      <BarTrack>
                        <BarFill
                          $height={trendMax ? Math.max(8, (entry.totalViews / trendMax) * 100) : 0}
                        />
                      </BarTrack>
                      <BarValue>{formatNumber(entry.totalViews)}</BarValue>
                      <BarLabel>{entry.date.slice(5)}</BarLabel>
                    </BarColumn>
                  ))}
                </BarGrid>
              </>
            ) : (
              <EmptyState>{copy.noTrendData}</EmptyState>
            )}
          </Card>

          <Card>
            <SectionHeader>
              <CardTitle>{copy.topPostsTitle}</CardTitle>
              <SmallText>{copy.topPostsDescription}</SmallText>
            </SectionHeader>
            {initialData.analytics.topPosts.length ? (
              <ItemList>
                {initialData.analytics.topPosts.map((post) => (
                  <Item key={post.id}>
                    <Row>
                      <div>
                        <ItemTitle>{post.title}</ItemTitle>
                        <MetaRow>
                          <span>{copy.viewCountLabel}: {formatNumber(post.viewCount)}</span>
                          {post.publishedAt ? <span>{formatDateTime(post.publishedAt)}</span> : null}
                        </MetaRow>
                      </div>
                      <InlineLink href={post.path}>{copy.openPostAction}</InlineLink>
                    </Row>
                  </Item>
                ))}
              </ItemList>
            ) : (
              <EmptyState>{copy.noTopPosts}</EmptyState>
            )}
          </Card>
        </Grid>
      ) : (
        <Notice>
          <SectionHeader>
            <CardTitle>{copy.analyticsRestrictedTitle}</CardTitle>
            <SmallText>{copy.analyticsRestrictedDescription}</SmallText>
          </SectionHeader>
        </Notice>
      )}

      <Grid>
        <Card>
          <SectionHeader>
            <CardTitle>{copy.recentFailuresTitle}</CardTitle>
            <SmallText>{copy.recentFailuresDescription}</SmallText>
          </SectionHeader>
          {initialData.recentFailures.length ? (
            <ItemList>
              {initialData.recentFailures.map((failure) => (
                <Item key={failure.id}>
                  <Row>
                    <div>
                      <ItemTitle>{formatStageLabel(failure.action)}</ItemTitle>
                      <SmallText>{failure.summary}</SmallText>
                    </div>
                    <Pill $tone={failure.level === "error" ? "error" : "accent"}>
                      {failure.level === "error" ? copy.levelError : copy.levelWarning}
                    </Pill>
                  </Row>
                  <MetaRow>
                    <span>{failure.entityType}</span>
                    <span>{failure.entityId}</span>
                    <span>{formatDateTime(failure.createdAt)}</span>
                  </MetaRow>
                </Item>
              ))}
            </ItemList>
          ) : (
            <EmptyState>{copy.noRecentFailures}</EmptyState>
          )}
        </Card>

        <Card>
          <SectionHeader>
            <CardTitle>{copy.recentJobsTitle}</CardTitle>
            <SmallText>{copy.recentJobsDescription}</SmallText>
          </SectionHeader>
          {initialData.recentGenerationJobs.length ? (
            <ItemList>
              {initialData.recentGenerationJobs.map((job) => (
                <Item key={job.id}>
                  <Row>
                    <div>
                      <ItemTitle>{job.equipmentName}</ItemTitle>
                      <MetaRow>
                        <span>{job.locale.toUpperCase()}</span>
                        <span>{formatStageLabel(job.currentStage)}</span>
                        {job.providerConfig ? <span>{job.providerConfig.label}</span> : null}
                      </MetaRow>
                    </div>
                    <Pill $tone={getToneFromStatus(job.status)}>{job.status}</Pill>
                  </Row>
                  <MetaRow>
                    <span>{formatDateTime(job.createdAt)}</span>
                    {job.warningCount ? (
                      <span>{copy.warningCountLabel}: {formatNumber(job.warningCount)}</span>
                    ) : null}
                    {job.errorMessage ? <span>{job.errorMessage}</span> : null}
                  </MetaRow>
                </Item>
              ))}
            </ItemList>
          ) : (
            <EmptyState>{copy.noRecentJobs}</EmptyState>
          )}
        </Card>
      </Grid>

      <Card>
        <SectionHeader>
          <CardTitle>{copy.scheduledRunsTitle}</CardTitle>
          <SmallText>{copy.scheduledRunsDescription}</SmallText>
        </SectionHeader>
        {initialData.scheduledRuns.length ? (
          <ItemList>
            {initialData.scheduledRuns.map((run) => (
              <Item key={run.runId}>
                <Row>
                  <div>
                    <ItemTitle>{run.runId}</ItemTitle>
                    <MetaRow>
                      <span>{copy.batchSizeLabel}: {formatNumber(run.batchSize || 0)}</span>
                      <span>{copy.dueCountLabel}: {formatNumber(run.dueCount || 0)}</span>
                      <span>{copy.publishedCountLabel}: {formatNumber(run.publishedCount || 0)}</span>
                    </MetaRow>
                  </div>
                  <Pill $tone={run.status === "completed" ? "success" : "accent"}>
                    {run.status === "completed" ? copy.runCompletedLabel : copy.runRunningLabel}
                  </Pill>
                </Row>
                <MetaRow>
                  <span>{copy.failedJobsLabel}: {formatNumber(run.failedCount || 0)}</span>
                  <span>{copy.skippedCountLabel}: {formatNumber(run.skippedCount || 0)}</span>
                  <span>
                    {run.completedAt ? formatDateTime(run.completedAt) : formatDateTime(run.startedAt)}
                  </span>
                </MetaRow>
              </Item>
            ))}
          </ItemList>
        ) : (
          <EmptyState>{copy.noScheduledRuns}</EmptyState>
        )}
      </Card>
    </Page>
  );
}
