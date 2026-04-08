"use client";

/**
 * Homepage lead-story component that presents the latest published NewsPub stories with editorial hierarchy.
 */

import { useState } from "react";
import Link from "next/link";
import styled from "styled-components";

import AppIcon from "@/components/common/app-icon";
import ResponsiveImage from "@/components/common/responsive-image";
import { publicHomeLatestIncrementCount } from "@/features/public-site/constants";

/**
 * Formats a published timestamp for compact public story rows.
 *
 * @param {string} locale - Active locale code.
 * @param {string|Date|null} value - Timestamp to format.
 * @returns {string|null} A localized date label or `null` when the value is missing.
 */
function formatDateTimeLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Resolves the most representative thumbnail candidate for a compact public story row.
 *
 * @param {object} item - Story inventory record.
 * @returns {{alt: string, url: string}|null} Compact media metadata or `null`.
 */
function resolveCompactStoryMedia(item) {
  const image = item.image?.url ? { ...item.image, kind: "image" } : null;
  const primaryMedia = image || item.primaryMedia || null;

  if (!primaryMedia) {
    return null;
  }

  if (primaryMedia.kind === "image" && primaryMedia.url) {
    return {
      alt: primaryMedia.alt || primaryMedia.caption || item.title,
      url: primaryMedia.url,
    };
  }

  if (primaryMedia.posterUrl) {
    return {
      alt: primaryMedia.alt || primaryMedia.title || item.title,
      url: primaryMedia.posterUrl,
    };
  }

  return null;
}

const defaultSearchMatchCopy = Object.freeze({
  body: "Content match",
  category: "Category match",
  slug: "Slug match",
  source: "Source match",
  summary: "Summary match",
  title: "Title match",
});

function resolveSearchMatchLabel(item, searchMatchCopy = {}) {
  const reason = item?.searchMeta?.primaryReason;

  if (!reason) {
    return "";
  }

  return searchMatchCopy[reason] || defaultSearchMatchCopy[reason] || "";
}

const EmptyState = styled.p`
  color: rgba(72, 85, 110, 0.9);
  line-height: 1.6;
  margin: 0;
`;

const CompactStoryList = styled.div`
  display: grid;
`;

const CompactStoryRow = styled.article`
  align-items: start;
  border-top: 1px solid rgba(16, 32, 51, 0.08);
  display: grid;
  gap: 0.62rem;
  grid-template-columns: ${({ $hasMedia }) => ($hasMedia ? "88px minmax(0, 1fr)" : "minmax(0, 1fr)")};
  padding: 0.72rem 0;

  &:first-child {
    border-top: none;
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
  }

  @media (min-width: 760px) {
    gap: 0.76rem;
    grid-template-columns: ${({ $hasMedia }) => ($hasMedia ? "112px minmax(0, 1fr)" : "minmax(0, 1fr)")};
  }
`;

const CompactStoryMediaLink = styled(Link)`
  display: block;
`;

const CompactStoryMediaFrame = styled.div`
  aspect-ratio: 4 / 3;
  background: linear-gradient(180deg, rgba(17, 43, 67, 0.05), rgba(17, 43, 67, 0.1));
  border: 1px solid rgba(16, 32, 51, 0.08);
  overflow: hidden;
  position: relative;
`;

const CompactStoryMediaImage = styled(ResponsiveImage)`
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
`;

const CompactStoryBody = styled.div`
  display: grid;
  gap: 0.22rem;
  min-width: 0;
`;

const CompactStoryContextRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.34rem;
`;

const CompactStoryPill = styled.span`
  align-items: center;
  background: ${({ $tone }) => ($tone === "match" ? "rgba(18, 79, 101, 0.08)" : "rgba(15, 110, 141, 0.08)")};
  border: 1px solid ${({ $tone }) => ($tone === "match" ? "rgba(18, 79, 101, 0.14)" : "rgba(15, 110, 141, 0.16)")};
  border-radius: 999px;
  color: ${({ $tone }) => ($tone === "match" ? "#124f65" : "#0d556d")};
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 800;
  gap: 0.28rem;
  min-height: 1.7rem;
  padding: 0 0.62rem;

  svg {
    display: block;
    height: 0.76rem;
    width: 0.76rem;
  }
`;

const CompactStoryTitleLink = styled(Link)`
  color: #152744;
  font-size: clamp(0.98rem, 1.5vw, 1.08rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.18;
`;

const CompactStoryMeta = styled.p`
  align-items: center;
  color: rgba(72, 85, 110, 0.86);
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.6rem;
  font-size: 0.8rem;
  line-height: 1.35;
  margin: 0;
`;

const CompactStoryMetaItem = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.28rem;

  svg {
    display: block;
    height: 0.82rem;
    width: 0.82rem;
  }
`;

const CompactStoryExcerpt = styled.p`
  -webkit-box-orient: vertical;
  color: rgba(72, 85, 110, 0.9);
  display: -webkit-box;
  font-size: 0.84rem;
  line-height: 1.45;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: ${({ $expanded }) => ($expanded ? 3 : 2)};

  @media (min-width: 760px) {
    -webkit-line-clamp: ${({ $expanded }) => ($expanded ? 2 : 1)};
  }
`;

const CompactStoryReadMore = styled(Link)`
  align-items: center;
  color: #124f65;
  display: inline-flex;
  font-size: 0.82rem;
  font-weight: 800;
  gap: 0.3rem;
  justify-self: start;

  svg {
    display: block;
    height: 0.84rem;
    width: 0.84rem;
  }
`;

const HomeListFooter = styled.div`
  border-top: 1px solid rgba(16, 32, 51, 0.08);
  margin-top: 0.62rem;
  padding-top: 0.62rem;
`;

const HomeViewMoreButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: #124f65;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 800;
  gap: 0.34rem;
  letter-spacing: 0.01em;
  padding: 0;
  min-height: 38px;

  &:hover:not(:disabled) {
    text-decoration: underline;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  svg {
    display: block;
    height: 0.88rem;
    width: 0.88rem;
  }
`;

const HomeListError = styled.p`
  align-items: center;
  color: #9a4221;
  display: inline-flex;
  font-size: 0.82rem;
  gap: 0.35rem;
  line-height: 1.45;
  margin: 0.62rem 0 0;

  svg {
    display: block;
    height: 0.88rem;
    width: 0.88rem;
  }
`;

/**
 * Renders the compact story list used across home and collection pagination surfaces.
 *
 * @param {object} props - Component props.
 * @param {React.ReactNode} [props.emptyContent] - Optional rich empty-state content.
 * @param {string} props.emptyLabel - Empty-state copy.
 * @param {Array<object>} [props.items] - Story cards to render.
 * @param {string} props.locale - Active locale code.
 * @param {string} [props.readMoreLabel="Read more"] - CTA label for each story card.
 * @returns {JSX.Element} The rendered list or empty state.
 */
function HomeStoryList({
  emptyContent = null,
  emptyLabel,
  items = [],
  locale,
  readMoreLabel = "Read more",
  searchMatchCopy = {},
  showSearchContext = false,
}) {
  if (!items.length) {
    return emptyContent || <EmptyState>{emptyLabel}</EmptyState>;
  }

  return (
    <CompactStoryList>
      {items.map((item) => {
        const media = resolveCompactStoryMedia(item);
        const primaryCategory = Array.isArray(item.categories) ? item.categories[0] : null;
        const searchMatchLabel = showSearchContext ? resolveSearchMatchLabel(item, searchMatchCopy) : "";
        const metaItems = [
          item.publishedAt
            ? {
                icon: "calendar",
                label: formatDateTimeLabel(locale, item.publishedAt),
              }
            : null,
          item.sourceName
            ? {
                icon: "news",
                label: item.sourceName,
              }
            : null,
        ].filter(Boolean);

        return (
          <CompactStoryRow $hasMedia={Boolean(media)} key={item.id}>
            {media ? (
              <CompactStoryMediaLink href={item.path}>
                <CompactStoryMediaFrame>
                  <CompactStoryMediaImage
                    alt={media.alt || item.title}
                    fill
                    sizes="(min-width: 760px) 112px, 88px"
                    src={media.url}
                  />
                </CompactStoryMediaFrame>
              </CompactStoryMediaLink>
            ) : null}
            <CompactStoryBody>
              {primaryCategory || searchMatchLabel ? (
                <CompactStoryContextRow>
                  {primaryCategory ? (
                    <CompactStoryPill $tone="category">
                      <AppIcon name="tag" size={12} />
                      {primaryCategory.name}
                    </CompactStoryPill>
                  ) : null}
                  {searchMatchLabel ? (
                    <CompactStoryPill $tone="match">
                      <AppIcon name="search" size={12} />
                      {searchMatchLabel}
                    </CompactStoryPill>
                  ) : null}
                </CompactStoryContextRow>
              ) : null}
              <CompactStoryTitleLink href={item.path}>{item.title}</CompactStoryTitleLink>
              {metaItems.length ? (
                <CompactStoryMeta>
                  {metaItems.map((metaItem) => (
                    <CompactStoryMetaItem key={`${item.id}-${metaItem.label}`}>
                      <AppIcon name={metaItem.icon} size={13} />
                      {metaItem.label}
                    </CompactStoryMetaItem>
                  ))}
                </CompactStoryMeta>
              ) : null}
              {item.summary ? <CompactStoryExcerpt $expanded={showSearchContext}>{item.summary}</CompactStoryExcerpt> : null}
              <CompactStoryReadMore href={item.path}>
                {readMoreLabel}
                <AppIcon name="arrow-right" size={13} />
              </CompactStoryReadMore>
            </CompactStoryBody>
          </CompactStoryRow>
        );
      })}
    </CompactStoryList>
  );
}

/**
 * Handles incremental loading for public home and collection story lists.
 *
 * @param {object} props - Pagination and rendering props.
 * @param {string} [props.loadingLabel="Loading..."] - Button label shown while the next page is loading.
 * @param {string} [props.loadingLiveLabel="Loading more stories"] - Screen-reader status announced during loading.
 * @param {string} [props.readMoreLabel="Read more"] - CTA label used inside each compact story card.
 * @returns {JSX.Element} The story list with progressive loading controls.
 */
export default function HomeLatestStories({
  collectionCountry = "all",
  collectionSlug = "all",
  collectionView = "",
  emptyContent = null,
  emptyLabel,
  initialHasMore = false,
  initialItems = [],
  initialPage = 1,
  loadingLabel = "Loading...",
  loadingLiveLabel = "Loading more stories",
  locale,
  mode = "home",
  query = "",
  readMoreLabel = "Read more",
  requestErrorLabel = "Could not load more stories right now.",
  searchMatchCopy = {},
  showSearchContext = false,
  viewMoreLabel = "View more",
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleViewMore() {
    if (isLoading || !hasMore) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const searchParams = new URLSearchParams(
        mode === "collection"
          ? {
              locale,
              page: `${currentPage + 1}`,
              view: collectionView,
              ...(collectionSlug && collectionSlug !== "all" ? { slug: collectionSlug } : {}),
              ...(query ? { q: query } : {}),
              ...(collectionCountry && collectionCountry !== "all" ? { country: collectionCountry } : {}),
            }
          : {
              locale,
              skip: `${items.length + 1}`,
              take: `${publicHomeLatestIncrementCount}`,
            },
      );
      const endpoint = mode === "collection" ? "/api/public/collection-stories" : "/api/public/latest-stories";
      const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error("Could not load more stories.");
      }

      const nextItems = Array.isArray(payload.data.items) ? payload.data.items : [];

      setItems((currentItems) => [...currentItems, ...nextItems]);
      setHasMore(Boolean(payload.data.hasMore));
      if (mode === "collection") {
        setCurrentPage((previousPage) => payload?.data?.page || previousPage + 1);
      }
    } catch {
      setError(requestErrorLabel);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <span aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {isLoading ? loadingLiveLabel : ""}
      </span>
      <HomeStoryList
        emptyContent={emptyContent}
        emptyLabel={emptyLabel}
        items={items}
        locale={locale}
        readMoreLabel={readMoreLabel}
        searchMatchCopy={searchMatchCopy}
        showSearchContext={showSearchContext}
      />
      {error ? (
        <HomeListError role="status">
          <AppIcon name="warning" size={14} />
          {error}
        </HomeListError>
      ) : null}
      {hasMore ? (
        <HomeListFooter>
          <HomeViewMoreButton
            aria-busy={isLoading}
            disabled={isLoading}
            onClick={handleViewMore}
            type="button"
          >
            <AppIcon name={isLoading ? "refresh" : "arrow-right"} size={14} />
            {isLoading ? loadingLabel : viewMoreLabel}
          </HomeViewMoreButton>
        </HomeListFooter>
      ) : null}
    </>
  );
}
