"use client";

import Link from "next/link";
import styled from "styled-components";

import SearchableSelect from "@/components/common/searchable-select";

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

function formatDuration(value) {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  if (value < 60) {
    return `${value}s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function formatLabel(value) {
  return `${value || "unknown"}`
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildHref(pathname, query = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "" || value === false) {
      continue;
    }

    searchParams.set(key, `${value}`);
  }

  const serializedQuery = searchParams.toString();

  return serializedQuery ? `${pathname}?${serializedQuery}` : pathname;
}

function getStatusTone(status) {
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
  gap: ${({ theme }) => theme.spacing.lg};
  margin: 0 auto;
  max-width: 1480px;
  padding: clamp(1rem, 2vw, 2rem);
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.22), transparent 38%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.12), rgba(16, 32, 51, 0.03));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  padding: clamp(1.2rem, 2.2vw, 2rem);
`;

const Eyebrow = styled.p`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1.05;
  margin: 0;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.7;
  margin: 0;
  max-width: 860px;
`;

const SummaryGrid = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
`;

const SummaryCard = styled.section`
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 18px 50px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const SummaryValue = styled.strong`
  font-size: 2rem;
  line-height: 1;
`;

const SmallText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.6;
  margin: 0;
  overflow-wrap: anywhere;
`;

const Card = styled.section`
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 18px 50px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
  overflow: hidden;
  padding: ${({ theme }) => theme.spacing.lg};
  position: relative;

  &::before {
    background: linear-gradient(90deg, rgba(0, 95, 115, 0.16), rgba(201, 123, 42, 0.12));
    content: "";
    height: 3px;
    inset: 0 0 auto;
    position: absolute;
  }
`;

const SectionHeader = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const CardTitle = styled.h2`
  font-size: 1.05rem;
  margin: 0;
`;

const Layout = styled.section`
  align-items: start;
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: 1240px) {
    grid-template-columns: minmax(360px, 0.95fr) minmax(0, 1.45fr);
  }
`;

const SearchForm = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (min-width: 900px) {
    align-items: end;
    grid-template-columns: minmax(0, 1fr) minmax(210px, 240px) auto auto;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 0.35rem;
  min-width: 0;
`;

const FieldLabel = styled.span`
  font-size: 0.84rem;
  font-weight: 700;
`;

const Input = styled.input`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: 46px;
  min-width: 0;
  padding: 0.76rem 0.95rem;
  width: 100%;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(0, 95, 115, 0.12);
    outline: none;
  }
`;

const Button = styled.button`
  background: ${({ $tone, theme }) =>
    $tone === "secondary" ? "rgba(247, 249, 252, 0.96)" : theme.colors.primary};
  border: 1px solid ${({ $tone, theme }) => ($tone === "secondary" ? theme.colors.border : "transparent")};
  border-radius: 999px;
  color: ${({ $tone }) => ($tone === "secondary" ? "inherit" : "white")};
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  min-height: 46px;
  padding: 0 1.15rem;
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    box-shadow: 0 14px 28px rgba(16, 32, 51, 0.1);
    transform: translateY(-1px);
  }
`;

const LinkButton = styled(Link)`
  align-items: center;
  background: rgba(247, 249, 252, 0.96);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  display: inline-flex;
  font-weight: 700;
  justify-content: center;
  min-height: 46px;
  padding: 0 1.15rem;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 14px 28px rgba(16, 32, 51, 0.08);
    transform: translateY(-1px);
  }
`;

const ItemList = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
`;

const Item = styled.article`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 252, 0.94));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  min-width: 0;
  padding: ${({ theme }) => theme.spacing.md};
`;

const Row = styled.div`
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const ItemTitle = styled.h3`
  font-size: 1rem;
  margin: 0;
  overflow-wrap: anywhere;
`;

const MetaRow = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: 0.88rem;
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
  font-size: 0.76rem;
  font-weight: 700;
  padding: 0.3rem 0.68rem;
`;

const EmptyState = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.7;
  margin: 0;
`;

const DetailGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};

  @media (min-width: 780px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const MetaCard = styled.div`
  background: rgba(247, 249, 252, 0.86);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
`;

const MetaLabel = styled.strong`
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const CodeBlock = styled.pre`
  background: rgba(16, 32, 51, 0.94);
  border-radius: ${({ theme }) => theme.radius.md};
  color: rgba(245, 248, 252, 0.96);
  font-size: 0.85rem;
  margin: 0;
  max-height: 360px;
  overflow: auto;
  padding: ${({ theme }) => theme.spacing.md};
`;

const WarningList = styled.ul`
  color: ${({ theme }) => theme.colors.muted};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  margin: 0;
  padding-left: 1.2rem;
`;

const AsideStack = styled.div`
  align-content: start;
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  min-width: 0;
`;

export default function JobLogsScreen({ copy, initialData }) {
  const currentQuery = {
    search: initialData.filters.search,
    status: initialData.filters.status !== "ALL" ? initialData.filters.status : undefined,
  };
  const statusOptions = [
    { label: copy.statusAll, value: "ALL" },
    { label: copy.statusPending, value: "PENDING" },
    { label: copy.statusRunning, value: "RUNNING" },
    { label: copy.statusCompleted, value: "COMPLETED" },
    { label: copy.statusFailed, value: "FAILED" },
    { label: copy.statusCancelled, value: "CANCELLED" },
  ];

  return (
    <Page>
      <Hero>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Title>{copy.title}</Title>
        <Description>{copy.description}</Description>
      </Hero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.totalJobs)}</SummaryValue>
          <SmallText>{copy.totalJobsLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.failedJobs)}</SummaryValue>
          <SmallText>{copy.failedJobsLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.runningJobs)}</SummaryValue>
          <SmallText>{copy.runningJobsLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.warningJobs)}</SummaryValue>
          <SmallText>{copy.warningJobsLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{formatNumber(initialData.summary.scheduledRunCount)}</SummaryValue>
          <SmallText>{copy.scheduledRunCountLabel}</SmallText>
        </SummaryCard>
      </SummaryGrid>

      <Card>
        <SectionHeader>
          <CardTitle>{copy.filtersTitle}</CardTitle>
          <SmallText>{copy.filtersDescription}</SmallText>
        </SectionHeader>
        <SearchForm action="/admin/jobs" method="get">
          <Field>
            <FieldLabel>{copy.filterSearchLabel}</FieldLabel>
            <Input
              defaultValue={initialData.filters.search}
              name="search"
              placeholder={copy.filterSearchPlaceholder}
              type="search"
            />
          </Field>
          <Field as="div">
            <FieldLabel>{copy.filterStatusLabel}</FieldLabel>
            <SearchableSelect
              ariaLabel={copy.filterStatusLabel}
              defaultValue={initialData.filters.status}
              name="status"
              options={statusOptions}
              placeholder={copy.filterStatusLabel}
              searchPlaceholder="Search job statuses"
            />
          </Field>
          <Button type="submit">{copy.filterApplyAction}</Button>
          <LinkButton href="/admin/jobs">{copy.filterClearAction}</LinkButton>
        </SearchForm>
      </Card>

      <Layout>
        <AsideStack>
          <Card>
            <SectionHeader>
              <CardTitle>{copy.jobListTitle}</CardTitle>
              <SmallText>{copy.jobListDescription}</SmallText>
            </SectionHeader>
            {initialData.jobs.length ? (
              <ItemList>
                {initialData.jobs.map((job) => (
                  <Item key={job.id}>
                    <Row>
                      <div>
                        <ItemTitle>{job.equipmentName}</ItemTitle>
                        <MetaRow>
                          <span>{job.locale.toUpperCase()}</span>
                          <span>{formatLabel(job.currentStage)}</span>
                        </MetaRow>
                      </div>
                      <Pill $tone={getStatusTone(job.status)}>{job.status}</Pill>
                    </Row>
                    <MetaRow>
                      <span>{formatDateTime(job.createdAt)}</span>
                      {job.providerConfig ? <span>{job.providerConfig.label}</span> : null}
                      {job.warningCount ? (
                        <span>{copy.warningCountLabel}: {formatNumber(job.warningCount)}</span>
                      ) : null}
                    </MetaRow>
                    <LinkButton
                      href={buildHref("/admin/jobs", {
                        ...currentQuery,
                        jobId: job.id,
                      })}
                    >
                      {copy.openJobAction}
                    </LinkButton>
                  </Item>
                ))}
              </ItemList>
            ) : (
              <EmptyState>{copy.noJobs}</EmptyState>
            )}
          </Card>

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
                      <ItemTitle>{run.runId}</ItemTitle>
                      <Pill $tone={run.status === "completed" ? "success" : "accent"}>
                        {run.status === "completed" ? copy.runCompletedLabel : copy.runRunningLabel}
                      </Pill>
                    </Row>
                    <MetaRow>
                      <span>{copy.batchSizeLabel}: {formatNumber(run.batchSize || 0)}</span>
                      <span>{copy.dueCountLabel}: {formatNumber(run.dueCount || 0)}</span>
                      <span>{copy.failedJobsLabel}: {formatNumber(run.failedCount || 0)}</span>
                    </MetaRow>
                    <MetaRow>
                      <span>{copy.publishedCountLabel}: {formatNumber(run.publishedCount || 0)}</span>
                      <span>{copy.skippedCountLabel}: {formatNumber(run.skippedCount || 0)}</span>
                      <span>{formatDateTime(run.completedAt || run.startedAt)}</span>
                    </MetaRow>
                  </Item>
                ))}
              </ItemList>
            ) : (
              <EmptyState>{copy.noScheduledRuns}</EmptyState>
            )}
          </Card>
        </AsideStack>

        <Card>
          <SectionHeader>
            <CardTitle>{copy.jobDetailsTitle}</CardTitle>
            <SmallText>{copy.jobDetailsDescription}</SmallText>
          </SectionHeader>
          {initialData.selectedJob ? (
            <>
              <Row>
                <div>
                  <ItemTitle>{initialData.selectedJob.equipmentName}</ItemTitle>
                  <MetaRow>
                    <span>{initialData.selectedJob.id}</span>
                    <span>{initialData.selectedJob.locale.toUpperCase()}</span>
                    <span>{formatLabel(initialData.selectedJob.currentStage)}</span>
                  </MetaRow>
                </div>
                <Pill $tone={getStatusTone(initialData.selectedJob.status)}>
                  {initialData.selectedJob.status}
                </Pill>
              </Row>

              <DetailGrid>
                <MetaCard>
                  <MetaLabel>{copy.createdAtLabel}</MetaLabel>
                  <span>{formatDateTime(initialData.selectedJob.createdAt)}</span>
                </MetaCard>
                <MetaCard>
                  <MetaLabel>{copy.startedAtLabel}</MetaLabel>
                  <span>{formatDateTime(initialData.selectedJob.startedAt) || copy.notAvailable}</span>
                </MetaCard>
                <MetaCard>
                  <MetaLabel>{copy.finishedAtLabel}</MetaLabel>
                  <span>{formatDateTime(initialData.selectedJob.finishedAt) || copy.notAvailable}</span>
                </MetaCard>
                <MetaCard>
                  <MetaLabel>{copy.durationLabel}</MetaLabel>
                  <span>{formatDuration(initialData.selectedJob.durationSeconds) || copy.notAvailable}</span>
                </MetaCard>
                <MetaCard>
                  <MetaLabel>{copy.providerLabel}</MetaLabel>
                  <span>{initialData.selectedJob.providerConfig?.label || copy.notAvailable}</span>
                </MetaCard>
                <MetaCard>
                  <MetaLabel>{copy.scheduleLabel}</MetaLabel>
                  <span>{formatDateTime(initialData.selectedJob.schedulePublishAt) || copy.notAvailable}</span>
                </MetaCard>
                <MetaCard>
                  <MetaLabel>{copy.replaceExistingLabel}</MetaLabel>
                  <span>
                    {initialData.selectedJob.replaceExistingPost ? copy.booleanYes : copy.booleanNo}
                  </span>
                </MetaCard>
                <MetaCard>
                  <MetaLabel>{copy.postLabel}</MetaLabel>
                  {initialData.selectedJob.post ? (
                    <Link href={initialData.selectedJob.post.path}>{initialData.selectedJob.post.title}</Link>
                  ) : (
                    <span>{copy.notAvailable}</span>
                  )}
                </MetaCard>
              </DetailGrid>

              <DetailGrid>
                <Card>
                  <SectionHeader>
                    <CardTitle>{copy.warningsTitle}</CardTitle>
                  </SectionHeader>
                  {initialData.selectedJob.warnings.length ? (
                    <WarningList>
                      {initialData.selectedJob.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </WarningList>
                  ) : (
                    <EmptyState>{copy.noWarnings}</EmptyState>
                  )}
                </Card>

                <Card>
                  <SectionHeader>
                    <CardTitle>{copy.errorTitle}</CardTitle>
                  </SectionHeader>
                  {initialData.selectedJob.errorMessage ? (
                    <SmallText>{initialData.selectedJob.errorMessage}</SmallText>
                  ) : (
                    <EmptyState>{copy.noError}</EmptyState>
                  )}
                </Card>
              </DetailGrid>

              <Card>
                <SectionHeader>
                  <CardTitle>{copy.logsTitle}</CardTitle>
                </SectionHeader>
                {initialData.selectedJob.logs.length ? (
                  <ItemList>
                    {initialData.selectedJob.logs.map((log) => (
                      <Item key={log.id}>
                        <Row>
                          <ItemTitle>{formatLabel(log.action)}</ItemTitle>
                          <MetaRow>
                            <span>{formatDateTime(log.createdAt)}</span>
                          </MetaRow>
                        </Row>
                        {log.payload?.message || log.payload?.errorMessage ? (
                          <SmallText>{log.payload.message || log.payload.errorMessage}</SmallText>
                        ) : null}
                        <CodeBlock>{JSON.stringify(log.payload || {}, null, 2)}</CodeBlock>
                      </Item>
                    ))}
                  </ItemList>
                ) : (
                  <EmptyState>{copy.noLogs}</EmptyState>
                )}
              </Card>

              <DetailGrid>
                <Card>
                  <SectionHeader>
                    <CardTitle>{copy.requestPayloadTitle}</CardTitle>
                  </SectionHeader>
                  <CodeBlock>{JSON.stringify(initialData.selectedJob.requestJson || {}, null, 2)}</CodeBlock>
                </Card>
                <Card>
                  <SectionHeader>
                    <CardTitle>{copy.responsePayloadTitle}</CardTitle>
                  </SectionHeader>
                  <CodeBlock>{JSON.stringify(initialData.selectedJob.responseJson || {}, null, 2)}</CodeBlock>
                </Card>
              </DetailGrid>
            </>
          ) : (
            <EmptyState>{copy.noJobSelected}</EmptyState>
          )}
        </Card>
      </Layout>
    </Page>
  );
}
