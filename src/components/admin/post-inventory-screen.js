"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";

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

const Page = styled.main`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  margin: 0 auto;
  max-width: 1480px;
  padding: clamp(1rem, 2vw, 2rem);
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top right, rgba(201, 123, 42, 0.2), transparent 38%),
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
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
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

const CardTitle = styled.h2`
  font-size: clamp(1.05rem, 1vw, 1.2rem);
  line-height: 1.15;
  margin: 0;
`;

const SearchForm = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), auto));
`;

const SearchInput = styled.input`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: 46px;
  min-width: 0;
  padding: 0.82rem 1rem;
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
  padding: 0.82rem 1.2rem;
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
  padding: 0.82rem 1.2rem;
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

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
`;

const Item = styled.article`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 252, 0.94));
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  min-width: 0;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const ItemHeader = styled.div`
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const ItemTitle = styled.h3`
  font-size: 1.1rem;
  margin: 0;
  overflow-wrap: anywhere;
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Pill = styled.span`
  background: ${({ $tone }) =>
    $tone === "accent"
      ? "rgba(201, 123, 42, 0.18)"
      : $tone === "success"
        ? "rgba(21, 115, 71, 0.12)"
        : "rgba(0, 95, 115, 0.12)"};
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
`;

const MetaGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (min-width: 860px) {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
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

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ActionCluster = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ActionGroupLabel = styled.strong`
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const InlineNotice = styled.p`
  background: ${({ $tone }) =>
    $tone === "error" ? "rgba(180, 35, 24, 0.12)" : "rgba(21, 115, 71, 0.12)"};
  border: 1px solid
    ${({ $tone, theme }) => ($tone === "error" ? theme.colors.danger : theme.colors.success)};
  border-radius: ${({ theme }) => theme.radius.sm};
  margin: 0;
  padding: ${({ theme }) => theme.spacing.sm};
`;

const Pager = styled.nav`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const PagerSummary = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  margin: 0;
`;

const PagerActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

function Pagination({ basePath, copy, pagination, search }) {
  if (!pagination || pagination.totalItems <= pagination.pageSize) {
    return null;
  }

  const baseQuery = search ? { search } : {};

  return (
    <Pager aria-label={copy.paginationLabel || "Post inventory pagination"}>
      <PagerSummary>
        {(copy.paginationSummaryLabel || "Posts").replace("{start}", `${pagination.startItem}`)
          .replace("{end}", `${pagination.endItem}`)
          .replace("{total}", `${pagination.totalItems}`)}
      </PagerSummary>
      <PagerActions>
        {pagination.hasPreviousPage ? (
          <LinkButton
            href={buildHref(basePath, {
              ...baseQuery,
              page: pagination.currentPage - 1,
            })}
          >
            {copy.previousPageAction || "Previous"}
          </LinkButton>
        ) : null}
        {pagination.hasNextPage ? (
          <LinkButton
            href={buildHref(basePath, {
              ...baseQuery,
              page: pagination.currentPage + 1,
            })}
          >
            {copy.nextPageAction || "Next"}
          </LinkButton>
        ) : null}
      </PagerActions>
    </Pager>
  );
}

function PostActionRow({ copy, permissions, post }) {
  const router = useRouter();
  const [publishState, setPublishState] = useState("idle");
  const [notice, setNotice] = useState(null);
  const isPublishable = post.status !== "PUBLISHED" && permissions.canPublish;

  async function handlePublish() {
    setPublishState("publishing");
    setNotice(null);

    try {
      const response = await fetch("/api/publish-post", {
        body: JSON.stringify({
          postId: post.id,
          publishAt: null,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || copy.publishErrorPrefix);
      }

      setNotice({
        kind: "success",
        message: copy.publishSuccess,
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `${copy.publishErrorPrefix}: ${error.message}`,
      });
    } finally {
      setPublishState("idle");
    }
  }

  return (
    <ActionCluster>
      <ActionGroupLabel>{copy.actionsLabel}</ActionGroupLabel>
      <ActionRow>
        <LinkButton href={`/admin/posts/${post.id}`}>{copy.editAction}</LinkButton>
        <LinkButton href={`/admin/posts/${post.id}#workflow`}>{copy.reviewAction}</LinkButton>
        {post.status === "PUBLISHED" ? (
          <LinkButton href={post.publicPath}>{copy.openLiveAction}</LinkButton>
        ) : null}
        <LinkButton href={`/admin/posts/${post.id}#content`}>{copy.editAndReviewAction}</LinkButton>
        <LinkButton href={`/admin/posts/${post.id}#workflow`}>{copy.reviewAndPublishAction}</LinkButton>
        {permissions.canManageLocalization ? (
          <LinkButton href={`/admin/localization?postId=${post.id}&locale=${post.locale}`}>
            {copy.localizationAction}
          </LinkButton>
        ) : null}
        {isPublishable ? (
          <Button disabled={publishState !== "idle"} onClick={handlePublish} type="button">
            {publishState === "publishing" ? copy.publishWorking : copy.publishAction}
          </Button>
        ) : null}
      </ActionRow>
      {notice ? <InlineNotice $tone={notice.kind}>{notice.message}</InlineNotice> : null}
      {!permissions.canPublish && post.status !== "PUBLISHED" ? (
        <SmallText>{copy.publishPermissionHint}</SmallText>
      ) : null}
    </ActionCluster>
  );
}

export default function PostInventoryScreen({ copy, initialData, permissions }) {
  const basePath =
    initialData.filters.scope === "published" ? "/admin/posts/published" : "/admin/posts/drafts";

  return (
    <Page>
      <Hero>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Title>{copy.title}</Title>
        <Description>{copy.description}</Description>
      </Hero>
      <SummaryGrid>
        <SummaryCard>
          <SummaryValue>{initialData.summary.draftCount}</SummaryValue>
          <SmallText>{copy.draftCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{initialData.summary.scheduledCount}</SummaryValue>
          <SmallText>{copy.scheduledCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{initialData.summary.publishedCount}</SummaryValue>
          <SmallText>{copy.publishedCountLabel}</SmallText>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue>{initialData.summary.archivedCount}</SummaryValue>
          <SmallText>{copy.archivedCountLabel}</SmallText>
        </SummaryCard>
      </SummaryGrid>
      <Card>
        <CardTitle>{copy.listTitle}</CardTitle>
        <SmallText>
          {copy.matchingCountLabel.replace("{count}", `${initialData.summary.matchingCount}`)}
        </SmallText>
        <SearchForm action={basePath} method="get">
          <SearchInput
            defaultValue={initialData.filters.search}
            name="search"
            placeholder={copy.searchPlaceholder}
          />
          <Button type="submit">{copy.searchAction}</Button>
          {initialData.filters.search ? (
            <LinkButton href={basePath}>{copy.clearSearchAction}</LinkButton>
          ) : null}
        </SearchForm>
        {initialData.posts.length ? (
          <List>
            {initialData.posts.map((post) => (
              <Item key={post.id}>
                <ItemHeader>
                  <div>
                    <ItemTitle>{post.title}</ItemTitle>
                    <SmallText>
                      {post.equipmentName} | slug `{post.slug}`
                    </SmallText>
                  </div>
                  <PillRow>
                    <Pill>{post.status}</Pill>
                    <Pill $tone="accent">{post.editorialStage}</Pill>
                    {post.status === "PUBLISHED" ? (
                      <Pill $tone="success">{copy.publishedBadge}</Pill>
                    ) : null}
                  </PillRow>
                </ItemHeader>
                <MetaGrid>
                  <MetaCard>
                    <MetaLabel>{copy.updatedAtLabel}</MetaLabel>
                    <SmallText>{formatDateTime(post.updatedAt) || copy.notAvailable}</SmallText>
                  </MetaCard>
                  <MetaCard>
                    <MetaLabel>
                      {post.status === "PUBLISHED" ? copy.publishedAtLabel : copy.scheduledAtLabel}
                    </MetaLabel>
                    <SmallText>
                      {formatDateTime(
                        post.status === "PUBLISHED" ? post.publishedAt : post.scheduledPublishAt,
                      ) || copy.notAvailable}
                    </SmallText>
                  </MetaCard>
                  <MetaCard>
                    <MetaLabel>{copy.categoriesLabel}</MetaLabel>
                    <SmallText>
                      {post.categoryNames.length ? post.categoryNames.join(", ") : copy.noCategories}
                    </SmallText>
                  </MetaCard>
                  <MetaCard>
                    <MetaLabel>{copy.localeLabel}</MetaLabel>
                    <SmallText>{post.locale}</SmallText>
                  </MetaCard>
                </MetaGrid>
                <PostActionRow copy={copy} permissions={permissions} post={post} />
              </Item>
            ))}
          </List>
        ) : (
          <SmallText>{copy.emptyState}</SmallText>
        )}
        <Pagination
          basePath={basePath}
          copy={copy}
          pagination={initialData.pagination}
          search={initialData.filters.search}
        />
      </Card>
    </Page>
  );
}
