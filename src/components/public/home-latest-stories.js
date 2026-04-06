"use client";

import { useState } from "react";
import Link from "next/link";
import styled from "styled-components";

import { publicHomeLatestIncrementCount } from "@/features/public-site/constants";

function formatDateTimeLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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
  gap: 0.8rem;
  grid-template-columns: ${({ $hasMedia }) => ($hasMedia ? "88px minmax(0, 1fr)" : "minmax(0, 1fr)")};
  padding: 0.9rem 0;

  &:first-child {
    border-top: none;
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
  }

  @media (min-width: 760px) {
    gap: 0.95rem;
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
`;

const CompactStoryMediaImage = styled.img`
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
`;

const CompactStoryBody = styled.div`
  display: grid;
  gap: 0.3rem;
  min-width: 0;
`;

const CompactStoryTitleLink = styled(Link)`
  color: #152744;
  font-size: clamp(0.98rem, 1.5vw, 1.08rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.18;
`;

const CompactStoryMeta = styled.p`
  color: rgba(72, 85, 110, 0.86);
  font-size: 0.8rem;
  line-height: 1.35;
  margin: 0;
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
  -webkit-line-clamp: 1;
`;

const CompactStoryReadMore = styled(Link)`
  color: #124f65;
  font-size: 0.82rem;
  font-weight: 800;
  justify-self: start;
`;

const HomeListFooter = styled.div`
  border-top: 1px solid rgba(16, 32, 51, 0.08);
  margin-top: 0.85rem;
  padding-top: 0.85rem;
`;

const HomeViewMoreButton = styled.button`
  background: transparent;
  border: none;
  color: #124f65;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  padding: 0;

  &:hover:not(:disabled) {
    text-decoration: underline;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }
`;

const HomeListError = styled.p`
  color: #9a4221;
  font-size: 0.82rem;
  line-height: 1.45;
  margin: 0.85rem 0 0;
`;

function HomeStoryList({ emptyLabel, items = [], locale }) {
  if (!items.length) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }

  return (
    <CompactStoryList>
      {items.map((item) => {
        const media = resolveCompactStoryMedia(item);
        const meta = [
          item.publishedAt ? formatDateTimeLabel(locale, item.publishedAt) : null,
          item.sourceName || null,
        ]
          .filter(Boolean)
          .join(" | ");

        return (
          <CompactStoryRow $hasMedia={Boolean(media)} key={item.id}>
            {media ? (
              <CompactStoryMediaLink href={item.path}>
                <CompactStoryMediaFrame>
                  <CompactStoryMediaImage
                    alt={media.alt || item.title}
                    loading="lazy"
                    src={media.url}
                  />
                </CompactStoryMediaFrame>
              </CompactStoryMediaLink>
            ) : null}
            <CompactStoryBody>
              <CompactStoryTitleLink href={item.path}>{item.title}</CompactStoryTitleLink>
              {meta ? <CompactStoryMeta>{meta}</CompactStoryMeta> : null}
              {item.summary ? <CompactStoryExcerpt>{item.summary}</CompactStoryExcerpt> : null}
              <CompactStoryReadMore href={item.path}>Read more</CompactStoryReadMore>
            </CompactStoryBody>
          </CompactStoryRow>
        );
      })}
    </CompactStoryList>
  );
}

export default function HomeLatestStories({
  emptyLabel,
  initialHasMore = false,
  initialItems = [],
  locale,
  requestErrorLabel = "Could not load more stories right now.",
  viewMoreLabel = "View more",
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleViewMore() {
    if (isLoading || !hasMore) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const searchParams = new URLSearchParams({
        locale,
        skip: `${items.length + 1}`,
        take: `${publicHomeLatestIncrementCount}`,
      });
      const response = await fetch(`/api/public/latest-stories?${searchParams.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error("Could not load more stories.");
      }

      const nextItems = Array.isArray(payload.data.items) ? payload.data.items : [];

      setItems((currentItems) => [...currentItems, ...nextItems]);
      setHasMore(Boolean(payload.data.hasMore));
    } catch {
      setError(requestErrorLabel);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <HomeStoryList emptyLabel={emptyLabel} items={items} locale={locale} />
      {error ? <HomeListError role="status">{error}</HomeListError> : null}
      {hasMore ? (
        <HomeListFooter>
          <HomeViewMoreButton
            aria-busy={isLoading}
            disabled={isLoading}
            onClick={handleViewMore}
            type="button"
          >
            {viewMoreLabel}
          </HomeViewMoreButton>
        </HomeListFooter>
      ) : null}
    </>
  );
}
