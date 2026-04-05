"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import PublicViewTracker from "@/components/analytics/public-view-tracker";
import { PublicCommentSection } from "@/components/comments";
import ShareActions from "@/components/public/share-actions";
import { createImagePlaceholderDataUrl } from "@/lib/media";
import { sanitizeExternalUrl } from "@/lib/security";

function formatDateLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatEquipmentDisplayName(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/[A-Z]/.test(trimmedValue)) {
    return trimmedValue;
  }

  const firstLetterIndex = trimmedValue.search(/[a-z]/i);

  if (firstLetterIndex === -1) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, firstLetterIndex)}${trimmedValue
    .charAt(firstLetterIndex)
    .toUpperCase()}${trimmedValue.slice(firstLetterIndex + 1)}`;
}

function formatArticleDisplayTitle(title, equipmentName) {
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  const normalizedEquipmentName = typeof equipmentName === "string" ? equipmentName.trim() : "";
  const displayEquipmentName = formatEquipmentDisplayName(normalizedEquipmentName);

  if (!normalizedTitle) {
    return displayEquipmentName;
  }

  if (!normalizedEquipmentName || !displayEquipmentName) {
    return normalizedTitle;
  }

  if (normalizedTitle.toLowerCase().startsWith(normalizedEquipmentName.toLowerCase())) {
    return `${displayEquipmentName}${normalizedTitle.slice(normalizedEquipmentName.length)}`;
  }

  return normalizedTitle;
}

function getLocaleLabel(locale) {
  if (locale === "en") {
    return "English";
  }

  if (typeof locale !== "string" || !locale.trim()) {
    return "English";
  }

  return locale.toUpperCase();
}

function buildHref(pathname, searchParams = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === "" || value === false) {
      continue;
    }

    params.set(key, `${value}`);
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function getCommonCopy(publicMessages = {}) {
  const common = publicMessages.common || {};

  return {
    authorLabel: common.authorLabel || "Author",
    backToBlogAction: common.backToBlogAction || "Back to blog",
    browseCategory: common.browseCategory || "Browse category",
    browseEquipment: common.browseEquipment || "Browse equipment",
    browseManufacturer: common.browseManufacturer || "Browse manufacturer",
    clearAction: common.clearAction || "Clear",
    commentBodyLabel: common.commentBodyLabel || "Comment",
    commentBodyPlaceholder:
      common.commentBodyPlaceholder || "Share your question or experience.",
    commentCancelReplyAction: common.commentCancelReplyAction || "Cancel reply",
    commentCaptchaLabel: common.commentCaptchaLabel || "Captcha challenge",
    commentCaptchaPlaceholder:
      common.commentCaptchaPlaceholder || "Enter the answer",
    commentEmailLabel: common.commentEmailLabel || "Email (optional)",
    commentEmailPlaceholder: common.commentEmailPlaceholder || "name@example.com",
    commentNameLabel: common.commentNameLabel || "Name",
    commentNamePlaceholder: common.commentNamePlaceholder || "Your name",
    commentReplyLabel: common.commentReplyLabel || "Reply",
    commentReplyAction: common.commentReplyAction || "Reply",
    commentReplyingToLabel: common.commentReplyingToLabel || "Replying to",
    commentsPaginationLabel: common.commentsPaginationLabel || "Comments",
    commentsDescription:
      common.commentsDescription ||
      "Approved comments and editor-approved replies appear here.",
    commentsEmpty: common.commentsEmpty || "No approved comments are published yet.",
    commentsFormDescription:
      common.commentsFormDescription ||
      "Share a question or correction. Every submission is reviewed before it appears publicly.",
    commentsFormTitle: common.commentsFormTitle || "Leave a comment",
    commentsModerationNotice:
      common.commentsModerationNotice || "Comments are moderated before appearing publicly.",
    commentsTitle: common.commentsTitle || "Comments",
    commentSubmitAction: common.commentSubmitAction || "Submit comment",
    commentSubmitWorking: common.commentSubmitWorking || "Submitting...",
    commentSuccess:
      common.commentSuccess ||
      "Comment submitted. It will appear once an editor approves it.",
    copiedLink: common.copiedLink || "Link copied",
    copyLink: common.copyLink || "Copy link",
    emptyStateDescription:
      common.emptyStateDescription ||
      "Published content for this page will appear after editorial approval and release.",
    emptyStateTitle: common.emptyStateTitle || "No published posts yet",
    latestPostsTitle: common.latestPostsTitle || "Latest posts",
    nextPage: common.nextPage || "Next",
    noSearchResults: common.noSearchResults || "No published posts matched your search yet.",
    previousPage: common.previousPage || "Previous",
    publishedLabel: common.publishedLabel || "Published",
    readPostAction: common.readPostAction || "Read post",
    referencesHeading: common.referencesHeading || "References",
    relatedPostsDescription:
      common.relatedPostsDescription ||
      "These published guides share the same equipment, taxonomy, or manufacturer context.",
    relatedPostsTitle: common.relatedPostsTitle || "Related posts",
    resultsLabel: common.resultsLabel || "Published posts",
    searchAction: common.searchAction || "Search",
    searchPlaceholder:
      common.searchPlaceholder || "Search published posts, equipment, or categories",
    shareDescription:
      common.shareDescription ||
      "Send this article to a teammate or save it for later reference.",
    shareTitle: common.shareTitle || "Share this post",
    topCategoriesTitle: common.topCategoriesTitle || "Top categories",
    topEquipmentTitle: common.topEquipmentTitle || "Top equipment",
    topManufacturersTitle: common.topManufacturersTitle || "Top manufacturers",
    updatedLabel: common.updatedLabel || "Updated",
  };
}

const PageMain = styled.main`
  display: grid;
  gap: clamp(1.2rem, 2.8vw, 1.75rem);
  margin: 0 auto;
  max-width: 1280px;
  padding: clamp(1.35rem, 3vw, 2.2rem) clamp(1rem, 3vw, 1.6rem) clamp(2rem, 4vw, 3rem);
  width: 100%;

  ${({ $layout }) =>
    $layout === "post" &&
    css`
      max-width: none;
      padding: 0 0 clamp(2rem, 4vw, 3rem);
    `}
`;

const Panel = styled.section`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 255, 0.92));
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: 18px;
  box-shadow:
    0 18px 40px rgba(22, 40, 64, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
  padding: clamp(1rem, 2.6vw, 1.55rem);
`;

const HeroPanel = styled.section`
  display: grid;
  gap: clamp(0.9rem, 2vw, 1.3rem);
  padding: clamp(0.35rem, 1vw, 0.65rem) 0 clamp(0.2rem, 0.8vw, 0.45rem);
`;

const LandingGrid = styled.div`
  display: grid;
  gap: clamp(1rem, 2.6vw, 1.5rem);

  @media (min-width: 760px) and (max-width: 1099px) {
    align-items: start;
    grid-template-areas:
      "hero hero"
      "content rail";
    grid-template-columns: minmax(0, 1fr) minmax(240px, 272px);
  }

  @media (min-width: 1100px) {
    align-items: start;
    grid-template-areas:
      "hero rail"
      "content rail";
    grid-template-columns: minmax(0, 1fr) minmax(285px, 336px);
  }
`;

const LandingHero = styled(HeroPanel)`
  grid-area: hero;
`;

const LandingContent = styled(Panel)`
  grid-area: content;
`;

const LandingRail = styled.aside`
  display: none;

  @media (min-width: 760px) {
    align-content: start;
    display: grid;
    gap: clamp(1rem, 2vw, 1.25rem);
    grid-area: rail;
  }
`;

const Eyebrow = styled.p`
  color: rgba(27, 59, 93, 0.74);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  color: #182742;
  font-size: clamp(2.7rem, 8vw, 5rem);
  font-weight: 800;
  letter-spacing: -0.055em;
  line-height: 0.95;
  margin: 0;
  max-width: 14ch;
`;

const Lead = styled.p`
  color: rgba(72, 84, 108, 0.96);
  font-size: clamp(1.05rem, 2.3vw, 1.2rem);
  line-height: 1.72;
  margin: 0;
  max-width: 40ch;
`;

const RailCard = styled(Panel)`
  gap: clamp(0.85rem, 1.5vw, 1rem);
  padding: clamp(0.95rem, 1.8vw, 1.1rem);
`;

const RailTitle = styled.p`
  color: rgba(53, 66, 91, 0.76);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  text-align: center;
  text-transform: uppercase;
`;

const AdFrame = styled.div`
  align-items: center;
  aspect-ratio: 1 / 0.86;
  background: linear-gradient(180deg, rgba(246, 248, 252, 0.98), rgba(237, 241, 247, 0.98));
  border: 1px solid rgba(16, 32, 51, 0.06);
  border-radius: 12px;
  display: grid;
  justify-items: center;
`;

const AdText = styled.span`
  color: rgba(99, 108, 127, 0.82);
  font-size: clamp(2rem, 5vw, 3rem);
  letter-spacing: -0.04em;
`;

const RailUtilityCard = styled(Panel)`
  gap: 0;
  padding: 0;
`;

const RailLocaleRow = styled.div`
  align-items: center;
  display: flex;
  gap: 0.4rem;
  justify-content: space-between;
  padding: 1rem 1.1rem;
`;

const RailLocaleText = styled.div`
  align-items: baseline;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.28rem;
`;

const RailLocaleLabel = styled.span`
  color: rgba(80, 92, 115, 0.9);
  font-size: 0.92rem;
`;

const RailLocaleValue = styled.span`
  color: #44506a;
  font-size: 0.92rem;
  font-weight: 600;
`;

const RailChevron = styled.span`
  color: rgba(80, 92, 115, 0.82);
  font-size: 1rem;
  line-height: 1;
`;

const RailActionButton = styled.button`
  background: transparent;
  border: none;
  border-top: 1px solid rgba(16, 32, 51, 0.08);
  color: rgba(84, 93, 112, 0.92);
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.95rem 1.1rem;
  transition: background 160ms ease, color 160ms ease;

  &:hover {
    background: rgba(16, 32, 51, 0.03);
    color: #182742;
  }
`;

const SectionHeader = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const SectionTitle = styled.h2`
  color: #182742;
  font-size: clamp(1.35rem, 3vw, 1.9rem);
  letter-spacing: -0.03em;
  margin: 0;
`;

const SectionDescription = styled.p`
  color: rgba(72, 84, 108, 0.94);
  line-height: 1.68;
  margin: 0;
  max-width: 62ch;
`;

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};

  ${({ $columns }) =>
    $columns === "three" &&
    css`
      @media (min-width: 720px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      @media (min-width: 1080px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    `}

  ${({ $columns }) =>
    $columns === "four" &&
    css`
      @media (min-width: 720px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      @media (min-width: 1080px) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    `}
`;

const Card = styled.article`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 255, 0.92));
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(22, 40, 64, 0.04);
  contain-intrinsic-size: 320px;
  content-visibility: auto;
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  min-height: 100%;
  padding: clamp(1rem, 2.2vw, 1.35rem);
`;

const MetaRow = styled.div`
  color: rgba(80, 92, 115, 0.92);
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: 0.88rem;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Chip = styled(Link)`
  background: rgba(32, 74, 113, 0.05);
  border: 1px solid rgba(32, 74, 113, 0.1);
  border-radius: 14px;
  color: #244b73;
  display: inline-flex;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.4rem 0.8rem;
`;

const PostCardTitle = styled.h3`
  color: #182742;
  font-size: 1.28rem;
  letter-spacing: -0.03em;
  line-height: 1.18;
  margin: 0;
`;

const TitleLink = styled(Link)`
  color: inherit;
`;

const PostCardText = styled.p`
  color: rgba(72, 84, 108, 0.94);
  line-height: 1.56;
  margin: 0;
`;

const ActionLink = styled(Link)`
  color: #244b73;
  font-weight: 700;
`;

const Figure = styled.figure`
  display: grid;
  gap: 0.38rem;
  margin: 0;

  ${({ $variant }) =>
    $variant === "inlineCompact" &&
    css`
      gap: 0.28rem;
      margin-block: 0.55rem 0.35rem;
      width: min(100%, 19rem);
    `}

  ${({ $presentation, $orientation }) =>
    $presentation === "atlas" &&
    css`
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 248, 252, 0.95)),
        radial-gradient(circle at top right, rgba(63, 115, 154, 0.1), transparent 56%);
      border: 1px solid rgba(18, 37, 60, 0.1);
      box-shadow:
        0 22px 46px rgba(18, 37, 60, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      gap: 0.72rem;
      grid-template-rows: auto minmax(0, 1fr);
      height: 100%;
      overflow: hidden;
      padding: clamp(0.62rem, 1.3vw, 0.82rem);
      position: relative;
      width: 100%;

      &::before {
        background: linear-gradient(90deg, rgba(24, 59, 99, 0.9), rgba(63, 115, 154, 0.38));
        content: "";
        height: 3px;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
      }

      @media (min-width: 980px) {
        flex:
          ${$orientation === "portrait"
            ? "0 1 calc(37% - 0.6rem)"
            : $orientation === "square"
              ? "0 1 calc(46% - 0.6rem)"
              : "1 1 calc(63% - 0.6rem)"};
      }
    `}
`;

const FigureFrame = styled.div`
  background: linear-gradient(180deg, rgba(248, 250, 253, 0.96), rgba(241, 245, 249, 0.98));
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: ${({ $variant }) => ($variant === "article" ? "0" : "14px")};
  display: grid;
  justify-items: center;
  overflow: hidden;
  padding: clamp(0.26rem, 0.7vw, 0.4rem);

  ${({ $variant }) =>
    $variant === "inlineCompact" &&
    css`
      border-radius: 12px;
      padding: 0.18rem;
    `}

  ${({ $orientation, $variant }) =>
    $variant === "article" &&
    $orientation === "portrait" &&
    css`
      margin-inline: auto;
      width: min(100%, clamp(15rem, 27vw, 21rem));
    `}

  ${({ $orientation, $variant }) =>
    $variant === "article" &&
    $orientation === "square" &&
    css`
      margin-inline: auto;
      width: min(100%, clamp(17rem, 34vw, 24rem));
    `}

  ${({ $orientation, $variant }) =>
    $variant === "article" &&
    $orientation === "landscape" &&
    css`
      width: 100%;
    `}

  ${({ $presentation }) =>
    $presentation === "atlas" &&
    css`
      background:
        linear-gradient(180deg, rgba(250, 252, 255, 0.98), rgba(235, 242, 248, 0.98)),
        radial-gradient(circle at top right, rgba(36, 75, 115, 0.08), transparent 48%);
      border-color: rgba(18, 37, 60, 0.1);
      box-shadow:
        0 12px 28px rgba(18, 37, 60, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.88);
      isolation: isolate;
      position: relative;

      &::before {
        background-image:
          linear-gradient(rgba(18, 37, 60, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(18, 37, 60, 0.05) 1px, transparent 1px);
        background-position: center;
        background-size: 18px 18px;
        content: "";
        inset: 0;
        opacity: 0.34;
        pointer-events: none;
        position: absolute;
        z-index: 0;
      }

      &::after {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.62), transparent 38%);
        content: "";
        inset: 0;
        pointer-events: none;
        position: absolute;
        z-index: 0;
      }

      > * {
        position: relative;
        z-index: 1;
      }
    `}
`;

const FigureFrameLink = styled.a`
  color: inherit;
  display: grid;
  height: 100%;
  width: 100%;
`;

const FigureImage = styled.img`
  aspect-ratio: ${({ $aspectRatio, $variant }) =>
    $variant === "article" ? $aspectRatio || "4 / 3" : "16 / 9"};
  background: rgba(16, 32, 51, 0.04);
  border-radius: ${({ $variant }) => ($variant === "article" ? "0" : "14px")};
  display: block;
  filter: ${({ $presentation, $variant }) =>
    $presentation === "atlas" && $variant === "article"
      ? "contrast(1.03) saturate(0.94)"
      : "none"};
  height: auto;
  margin: 0 auto;
  max-height: ${({ $orientation, $variant }) =>
    $variant !== "article"
      ? "none"
      : $orientation === "portrait"
        ? "clamp(320px, 54vw, 620px)"
        : $orientation === "square"
          ? "clamp(280px, 48vw, 540px)"
          : "clamp(260px, 58vw, 560px)"};
  object-fit: ${({ $variant }) => ($variant === "article" ? "contain" : "cover")};
  object-position: center;
  max-width: 100%;
  width: ${({ $orientation, $variant }) =>
    $variant === "article" && $orientation === "portrait" ? "auto" : "100%"};

  ${({ $variant }) =>
    $variant === "inlineCompact" &&
    css`
      aspect-ratio: ${({ $aspectRatio }) => $aspectRatio || "4 / 3"};
      border-radius: 10px;
      max-height: clamp(140px, 22vw, 210px);
      object-fit: cover;
      width: 100%;
    `}
`;

const FigureCaption = styled.figcaption`
  color: rgba(80, 92, 115, 0.92);
  font-size: 0.86rem;
  line-height: 1.36;
  max-width: 54ch;
`;

const FigureMeta = styled.div`
  display: grid;
  align-content: start;
  gap: 0.48rem;

  ${({ $presentation }) =>
    $presentation === "atlas" &&
    css`
      border-top: 1px solid rgba(18, 37, 60, 0.08);
      gap: 0.52rem;
      min-height: 100%;
      padding-top: 0.72rem;
    `}
`;

const FigureBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const FigureBadge = styled.span`
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 999px;
  color: rgba(31, 56, 86, 0.88);
  display: inline-flex;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  padding: 0.28rem 0.6rem;
  text-transform: uppercase;
`;

function getImageAspectRatio(image, variant) {
  if (variant !== "article") {
    return undefined;
  }

  const width = Number.parseInt(`${image?.width ?? ""}`.trim(), 10);
  const height = Number.parseInt(`${image?.height ?? ""}`.trim(), 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return undefined;
  }

  return `${width} / ${height}`;
}

function getImageOrientation(image) {
  const width = Number.parseInt(`${image?.width ?? ""}`.trim(), 10);
  const height = Number.parseInt(`${image?.height ?? ""}`.trim(), 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "landscape";
  }

  if (height >= width * 1.12) {
    return "portrait";
  }

  if (width >= height * 1.12) {
    return "landscape";
  }

  return "square";
}

function ResponsiveImage({
  image,
  loading = "lazy",
  onMeasure,
  priority = false,
  sizes = "100vw",
  presentation = "default",
  variant = "card",
}) {
  const fallbackSrc = createImagePlaceholderDataUrl({
    alt: image?.alt,
    caption: image?.caption,
    height: image?.height,
    sourceUrl: image?.url,
    width: image?.width,
  });
  const [failedSource, setFailedSource] = useState(null);
  const src = failedSource === image?.url ? fallbackSrc : image?.url || "";
  const aspectRatio = getImageAspectRatio(image, variant);
  const orientation = getImageOrientation(image);

  if (!src) {
    return null;
  }

  const isFallbackSource = src === fallbackSrc;

  return (
    <FigureImage
      $aspectRatio={aspectRatio}
      $orientation={orientation}
      $presentation={presentation}
      $variant={variant}
      alt={image.alt}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      height={image.height || undefined}
      loading={priority ? "eager" : loading}
      onLoad={(event) => {
        if (typeof onMeasure === "function") {
          const { naturalHeight, naturalWidth } = event.currentTarget;

          if (
            Number.isFinite(naturalWidth) &&
            Number.isFinite(naturalHeight) &&
            naturalWidth > 0 &&
            naturalHeight > 0
          ) {
            onMeasure((currentValue) => {
              if (
                currentValue &&
                currentValue.width === naturalWidth &&
                currentValue.height === naturalHeight
              ) {
                return currentValue;
              }

              return {
                height: naturalHeight,
                width: naturalWidth,
              };
            });
          }
        }
      }}
      onError={() => {
        if (!isFallbackSource) {
          setFailedSource(image?.url || "");
        }
      }}
      sizes={!isFallbackSource && image.srcSet ? sizes : undefined}
      src={src}
      srcSet={!isFallbackSource ? image.srcSet || undefined : undefined}
      width={image.width || undefined}
    />
  );
}

function PostCard({ copy, locale, post }) {
  const displayEquipmentName = formatEquipmentDisplayName(post.equipment.name);
  const displayTitle = formatArticleDisplayTitle(post.title, post.equipment.name);

  return (
    <Card>
      {post.heroImage ? (
        <Figure>
          <ResponsiveImage
            image={post.heroImage}
            sizes="(min-width: 1080px) 28vw, (min-width: 720px) 46vw, 92vw"
          />
          {post.heroImage.caption ? <FigureCaption>{post.heroImage.caption}</FigureCaption> : null}
        </Figure>
      ) : null}
      <MetaRow>
        {post.publishedAt ? (
          <span>
            {copy.publishedLabel}: {formatDateLabel(locale, post.publishedAt)}
          </span>
        ) : null}
        <span>{displayEquipmentName}</span>
      </MetaRow>
      <div>
        <PostCardTitle>
          <TitleLink href={post.path}>{displayTitle}</TitleLink>
        </PostCardTitle>
      </div>
      <PostCardText>{post.excerpt}</PostCardText>
      {post.categories.length ? (
        <ChipRow>
          {post.categories.slice(0, 3).map((category) => (
            <Chip href={category.path} key={category.slug}>
              {category.name}
            </Chip>
          ))}
        </ChipRow>
      ) : null}
      <ActionLink href={post.path}>{copy.readPostAction}</ActionLink>
    </Card>
  );
}

const SpotlightCard = styled(Card)`
  align-content: start;
`;

const SpotlightTitle = styled.h3`
  font-size: 1.05rem;
  margin: 0;
`;

const SpotlightMeta = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.54;
  margin: 0;
`;

const EmptyState = styled(Card)`
  align-content: center;
  min-height: 100%;
  padding: clamp(1.2rem, 2.8vw, 1.75rem);
  justify-items: start;
`;

const EmptyTitle = styled.h3`
  color: #182742;
  margin: 0;
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

const PagerButton = styled(Link)`
  align-items: center;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 14px;
  display: inline-flex;
  font-weight: 700;
  justify-content: center;
  padding: 0.55rem 0.95rem;
`;

const SearchForm = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (min-width: 720px) {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto auto;
  }
`;

const SearchInput = styled.input`
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(16, 32, 51, 0.14);
  border-radius: ${({ theme }) => theme.radius.md};
  min-height: 48px;
  padding: 0.8rem 0.95rem;
`;

const SearchButton = styled.button`
  background: linear-gradient(180deg, #2a537d, #203f61);
  border: none;
  border-radius: 14px;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  min-height: 48px;
  padding: 0 1.15rem;
`;

const SearchLink = styled(Link)`
  align-items: center;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 14px;
  color: ${({ theme }) => theme.colors.text};
  display: inline-flex;
  font-weight: 700;
  justify-content: center;
  min-height: 48px;
  padding: 0.75rem 1.05rem;
`;

function Pagination({ copy, pageParam = "page", pagination, pathname, query = {} }) {
  if (!pagination || pagination.totalItems <= pagination.pageSize) {
    return null;
  }

  return (
    <Pager aria-label="Pagination">
      <PagerSummary>
        {copy.resultsLabel}: {pagination.startItem}-{pagination.endItem} / {pagination.totalItems}
      </PagerSummary>
      <PagerActions>
        {pagination.hasPreviousPage ? (
          <PagerButton
            href={buildHref(pathname, {
              ...query,
              [pageParam]: pagination.currentPage - 1,
            })}
          >
            {copy.previousPage}
          </PagerButton>
        ) : null}
        {pagination.hasNextPage ? (
          <PagerButton
            href={buildHref(pathname, {
              ...query,
              [pageParam]: pagination.currentPage + 1,
            })}
          >
            {copy.nextPage}
          </PagerButton>
        ) : null}
      </PagerActions>
    </Pager>
  );
}

function SpotlightGrid({ actionLabel, items }) {
  return (
    <Grid $columns="three">
      {items.map((item) => (
        <SpotlightCard key={`${item.type}-${item.slug}`}>
          <div>
            <SpotlightTitle>{item.name}</SpotlightTitle>
          </div>
          {item.summary || item.description ? (
            <SpotlightMeta>{item.summary || item.description}</SpotlightMeta>
          ) : null}
          <MetaRow>
            <span>{item.postCount} posts</span>
            {item.primaryDomain ? <span>{item.primaryDomain}</span> : null}
          </MetaRow>
          <ActionLink href={item.path}>{actionLabel}</ActionLink>
        </SpotlightCard>
      ))}
    </Grid>
  );
}

function getDiscoverySectionTitle(copy, kind) {
  if (kind === "category") {
    return copy.topCategoriesTitle;
  }

  if (kind === "manufacturer") {
    return copy.topManufacturersTitle;
  }

  return copy.topEquipmentTitle;
}

function getDiscoverySectionActionLabel(copy, kind) {
  if (kind === "category") {
    return copy.browseCategory;
  }

  if (kind === "manufacturer") {
    return copy.browseManufacturer;
  }

  return copy.browseEquipment;
}

function PublicUtilityRail({ locale }) {
  return (
    <>
      <RailCard>
        <RailTitle>Advertisement</RailTitle>
        <AdFrame>
          <AdText>Ad</AdText>
        </AdFrame>
      </RailCard>

      <RailUtilityCard>
        <RailLocaleRow>
          <RailLocaleText>
            <RailLocaleLabel>Locale:</RailLocaleLabel>
            <RailLocaleValue>{getLocaleLabel(locale)}</RailLocaleValue>
          </RailLocaleText>
          <RailChevron aria-hidden="true">v</RailChevron>
        </RailLocaleRow>
        <RailActionButton type="button">Advertise Here</RailActionButton>
      </RailUtilityCard>
    </>
  );
}

export function PublicHomePage({ locale, messages, pageContent, pageData }) {
  const copy = getCommonCopy(messages);
  const featuredAndLatestPosts = [pageData.featuredPost, ...(pageData.latestPosts || [])].filter(Boolean);
  const hasDiscoverySections =
    pageData.spotlights.categories.length ||
    pageData.spotlights.manufacturers.length ||
    pageData.spotlights.equipment.length;

  return (
    <PageMain>
      <PublicViewTracker eventType="WEBSITE_VIEW" locale={locale} />
      <LandingGrid>
        <LandingHero>
          <Title>{pageContent.title}</Title>
          <Lead>{pageContent.description}</Lead>
        </LandingHero>

        <LandingContent>
          {featuredAndLatestPosts.length ? (
            <>
              <SectionHeader>
                <SectionTitle>{pageContent.latestTitle || copy.latestPostsTitle}</SectionTitle>
                <SectionDescription>
                  {pageContent.latestDescription ||
                    "Browse the newest published equipment guides in a layout tuned for phone, tablet, and desktop reading."}
                </SectionDescription>
              </SectionHeader>
              <Grid $columns="three">
                {featuredAndLatestPosts.slice(0, 3).map((post) => (
                  <PostCard copy={copy} key={post.slug} locale={locale} post={post} />
                ))}
              </Grid>
            </>
          ) : (
            <EmptyState>
              <EmptyTitle>{copy.emptyStateTitle}</EmptyTitle>
              <SectionDescription>{copy.emptyStateDescription}</SectionDescription>
            </EmptyState>
          )}
        </LandingContent>

        <LandingRail aria-label="Public utilities">
          <PublicUtilityRail locale={locale} />
        </LandingRail>
      </LandingGrid>

      {hasDiscoverySections ? (
        <Panel>
          <SectionHeader>
            <SectionTitle>{pageContent.discoveryTitle || "Discovery routes"}</SectionTitle>
            <SectionDescription>
              {pageContent.discoveryDescription ||
                "Category, manufacturer, and equipment landing pages stay focused on published content only."}
            </SectionDescription>
          </SectionHeader>
          {pageData.spotlights.categories.length ? (
            <>
              <SectionHeader>
                <SectionTitle>{copy.topCategoriesTitle}</SectionTitle>
              </SectionHeader>
              <SpotlightGrid actionLabel={copy.browseCategory} items={pageData.spotlights.categories} />
            </>
          ) : null}
          {pageData.spotlights.manufacturers.length ? (
            <>
              <SectionHeader>
                <SectionTitle>{copy.topManufacturersTitle}</SectionTitle>
              </SectionHeader>
              <SpotlightGrid
                actionLabel={copy.browseManufacturer}
                items={pageData.spotlights.manufacturers}
              />
            </>
          ) : null}
          {pageData.spotlights.equipment.length ? (
            <>
              <SectionHeader>
                <SectionTitle>{copy.topEquipmentTitle}</SectionTitle>
              </SectionHeader>
              <SpotlightGrid actionLabel={copy.browseEquipment} items={pageData.spotlights.equipment} />
            </>
          ) : null}
        </Panel>
      ) : null}
    </PageMain>
  );
}

export function PublicCollectionPage({
  entity,
  locale,
  messages,
  pageContent,
  pageData,
  pathname,
  query,
  showSearch = false,
}) {
  const copy = getCommonCopy(messages);

  return (
    <PageMain>
      <PublicViewTracker eventType="PAGE_VIEW" locale={locale} />
      <LandingGrid>
        <LandingHero>
          {pageContent.eyebrow ? <Eyebrow>{pageContent.eyebrow}</Eyebrow> : null}
          <Title>{entity?.name || pageContent.title}</Title>
          <Lead>{entity?.description || pageContent.description}</Lead>
          {entity?.primaryDomain || entity?.headquartersCountry || entity?.branchCountries?.length ? (
            <MetaRow>
              {entity.primaryDomain ? <span>{entity.primaryDomain}</span> : null}
              {entity.headquartersCountry ? <span>{entity.headquartersCountry}</span> : null}
              {entity.branchCountries?.length ? <span>{entity.branchCountries.join(", ")}</span> : null}
            </MetaRow>
          ) : null}
        </LandingHero>

        <LandingContent>
          {showSearch ? (
            <>
              <SectionHeader>
                <SectionTitle>{pageContent.searchTitle || pageContent.title}</SectionTitle>
                <SectionDescription>
                  {pageContent.searchDescription || pageContent.description}
                </SectionDescription>
              </SectionHeader>
              <SearchForm action={pathname} role="search">
                <SearchInput
                  defaultValue={pageData.search}
                  name="q"
                  placeholder={copy.searchPlaceholder}
                  type="search"
                />
                <SearchButton type="submit">{copy.searchAction}</SearchButton>
                {pageData.search ? <SearchLink href={pathname}>{copy.clearAction}</SearchLink> : null}
              </SearchForm>
            </>
          ) : null}

          <SectionHeader>
            <SectionTitle>{pageContent.resultsTitle || copy.resultsLabel}</SectionTitle>
            <SectionDescription>
              {pageData.pagination.totalItems
                ? `${pageData.pagination.totalItems} ${copy.resultsLabel.toLowerCase()}.`
                : showSearch && pageData.search
                  ? copy.noSearchResults
                  : copy.emptyStateDescription}
            </SectionDescription>
          </SectionHeader>
          {pageData.posts.length ? (
            <Grid $columns="three">
              {pageData.posts.map((post) => (
                <PostCard copy={copy} key={post.slug} locale={locale} post={post} />
              ))}
            </Grid>
          ) : (
            <EmptyState>
              <EmptyTitle>
                {showSearch && pageData.search ? copy.noSearchResults : copy.emptyStateTitle}
              </EmptyTitle>
              <SectionDescription>
                {showSearch && pageData.search ? copy.noSearchResults : copy.emptyStateDescription}
              </SectionDescription>
            </EmptyState>
          )}
          <Pagination copy={copy} pagination={pageData.pagination} pathname={pathname} query={query} />
        </LandingContent>

        <LandingRail aria-label="Public utilities">
          <PublicUtilityRail locale={locale} />
        </LandingRail>
      </LandingGrid>

      {pageData.discoverySections?.length ? (
        <Panel>
          <SectionHeader>
            <SectionTitle>{pageContent.discoveryTitle || "Keep exploring"}</SectionTitle>
            <SectionDescription>
              {pageContent.discoveryDescription ||
                "Use connected category, manufacturer, and equipment routes to keep branching through published guides."}
            </SectionDescription>
          </SectionHeader>
          {pageData.discoverySections.map((section) => (
            <div key={section.kind}>
              <SectionHeader>
                <SectionTitle>{getDiscoverySectionTitle(copy, section.kind)}</SectionTitle>
              </SectionHeader>
              <SpotlightGrid
                actionLabel={getDiscoverySectionActionLabel(copy, section.kind)}
                items={section.items}
              />
            </div>
          ))}
        </Panel>
      ) : null}
    </PageMain>
  );
}

const ContentSection = styled(Panel)`
  gap: ${({ theme }) => theme.spacing.md};
`;

const StaticSectionGrid = styled.div`
  display: grid;
  gap: clamp(1rem, 2.4vw, 1.5rem);

  @media (min-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const RichText = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  line-height: 1.62;
`;

const BulletList = styled.ul`
  color: rgba(66, 79, 101, 0.96);
  display: grid;
  gap: 0.85rem;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.05rem, 1.15vw, 1.14rem);
  line-height: 1.82;
  margin: 0;
  padding-left: 1.35rem;

  li::marker {
    color: #2b5a82;
  }
`;

export function PublicStaticPage({ locale, pageContent }) {
  return (
    <PageMain>
      <PublicViewTracker eventType="PAGE_VIEW" locale={locale} />
      <HeroPanel>
        {pageContent.eyebrow ? <Eyebrow>{pageContent.eyebrow}</Eyebrow> : null}
        <Title>{pageContent.title}</Title>
        <Lead>{pageContent.description}</Lead>
      </HeroPanel>

      <StaticSectionGrid>
        {(pageContent.sections || []).map((section) => (
          <ContentSection key={section.title}>
            <SectionHeader>
              <SectionTitle>{section.title}</SectionTitle>
            </SectionHeader>
            <RichText>
              {(section.paragraphs || []).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </RichText>
            {section.items?.length ? (
              <BulletList>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </BulletList>
            ) : null}
            {section.links?.length ? (
              <ChipRow>
                {section.links.map((link) => (
                  <Chip as={Link} href={link.href} key={link.href}>
                    {link.label}
                  </Chip>
                ))}
              </ChipRow>
            ) : null}
          </ContentSection>
        ))}
      </StaticSectionGrid>
    </PageMain>
  );
}

const Breadcrumbs = styled.nav`
  align-items: center;
  color: rgba(55, 71, 96, 0.74);
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const BreadcrumbLink = styled(Link)`
  color: inherit;

  &:hover {
    color: var(--theme-primary);
  }
`;

const BreadcrumbSeparator = styled.span`
  opacity: 0.45;
`;

const PostScene = styled.section`
  display: grid;
  gap: clamp(0.9rem, 2vw, 1.25rem);
`;

const PostHeroShell = styled.section`
  background:
    radial-gradient(circle at top right, rgba(var(--theme-primary-rgb), 0.14), transparent 34%),
    radial-gradient(circle at bottom left, rgba(var(--theme-accent-rgb), 0.11), transparent 42%),
    linear-gradient(160deg, rgba(var(--theme-bg-rgb), 0.98), rgba(var(--theme-surface-rgb), 0.95));
  border: 1px solid rgba(var(--theme-border-rgb), 0.68);
  border-radius: 0;
  box-shadow:
    0 32px 90px rgba(var(--theme-primary-rgb), 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.76);
  overflow: hidden;
  padding: clamp(0.95rem, 2.4vw, 1.35rem);

  ${({ $presentation }) =>
    $presentation === "atlas" &&
    css`
      background:
        linear-gradient(140deg, rgba(var(--theme-bg-rgb), 0.98), rgba(var(--theme-surface-rgb), 0.96)),
        radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.18), transparent 34%),
        radial-gradient(circle at bottom left, rgba(var(--theme-primary-rgb), 0.12), transparent 42%);
      isolation: isolate;
      position: relative;

      &::before {
        background: linear-gradient(
          90deg,
          rgba(var(--theme-primary-rgb), 0.95),
          rgba(var(--theme-accent-rgb), 0.65)
        );
        content: "";
        height: 4px;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
        z-index: 0;
      }

      &::after {
        background-image:
          linear-gradient(rgba(var(--theme-primary-rgb), 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(var(--theme-primary-rgb), 0.04) 1px, transparent 1px);
        background-size: 22px 22px;
        content: "";
        inset: 0;
        opacity: 0.55;
        pointer-events: none;
        position: absolute;
        z-index: 0;
      }

      > * {
        position: relative;
        z-index: 1;
      }
    `}
`;

const PostHeroGrid = styled.div`
  display: grid;
  gap: clamp(0.85rem, 1.8vw, 1.15rem);

  @media (min-width: 980px) {
    align-items: start;
    grid-template-columns: minmax(0, 1.42fr) minmax(280px, 0.88fr);
  }
`;

const PostHeader = styled.div`
  display: grid;
  gap: clamp(0.7rem, 1.4vw, 0.95rem);
`;

const PostLeadGrid = styled.div`
  display: grid;
  grid-template-areas:
    "title"
    "visual"
    "deck";
  gap: clamp(0.72rem, 1.5vw, 0.95rem);

  ${({ $hasVisual }) =>
    !$hasVisual &&
    css`
      grid-template-areas:
        "title"
        "deck";
    `}

  @media (min-width: 980px) {
    align-items: start;
    column-gap: clamp(1rem, 2.2vw, 1.45rem);
    grid-template-columns: ${({ $hasVisual }) =>
      $hasVisual ? "minmax(0, 1.06fr) minmax(220px, 0.74fr)" : "minmax(0, 1.04fr) minmax(260px, 0.78fr)"};
    grid-template-areas: ${({ $hasVisual }) =>
      $hasVisual ? `"title visual" "deck visual"` : `"title deck"`};
  }
`;

const PostTitleBlock = styled.div`
  display: grid;
  gap: 0.5rem;
  grid-area: title;
  min-width: 0;
`;

const PostDeckBlock = styled.div`
  align-content: start;
  background:
    linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.94), rgba(var(--theme-surface-rgb), 0.92)),
    radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.1), transparent 58%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.7);
  box-shadow:
    0 18px 36px rgba(var(--theme-primary-rgb), 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  display: grid;
  gap: 0.68rem;
  min-width: 0;
  overflow: hidden;
  padding: clamp(0.78rem, 1.8vw, 0.95rem);
  position: relative;

  &::before {
    background: linear-gradient(
      180deg,
      rgba(var(--theme-primary-rgb), 0.9),
      rgba(var(--theme-accent-rgb), 0.4)
    );
    content: "";
    inset: 0 auto 0 0;
    position: absolute;
    width: 3px;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  grid-area: deck;
`;

const PostDeckEyebrow = styled.p`
  color: rgba(var(--theme-primary-rgb), 0.74);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  text-transform: uppercase;
`;

const PostKicker = styled.p`
  color: rgba(var(--theme-primary-rgb), 0.82);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  text-transform: uppercase;
`;

const PostTitle = styled.h1`
  color: var(--theme-text);
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.85rem, 3.6vw, 2.55rem);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.04;
  margin: 0;
  max-width: 16ch;
  text-wrap: balance;

  @media (min-width: 980px) {
    max-width: none;
  }
`;

const PostLeadVisual = styled.div`
  align-self: stretch;
  display: grid;
  gap: 0.45rem;
  grid-area: visual;
  min-width: 0;
`;

const PostLeadVisualFrame = styled.div`
  background:
    linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.96), rgba(var(--theme-surface-rgb), 0.96)),
    radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.1), transparent 58%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.72);
  box-shadow:
    0 18px 36px rgba(var(--theme-primary-rgb), 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  overflow: hidden;
  padding: 0.42rem;

  ${FigureImage} {
    aspect-ratio: 4 / 3;
    border-radius: 0;
    max-height: clamp(210px, 32vw, 320px);
    object-fit: cover;
    width: 100%;
  }
`;

const PostLeadVisualCaption = styled.p`
  color: rgba(var(--theme-muted-rgb), 0.84);
  font-size: 0.82rem;
  line-height: 1.38;
  margin: 0;
`;

const PostDeck = styled.p`
  color: rgba(54, 67, 88, 0.92);
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(0.98rem, 1.65vw, 1.08rem);
  line-height: 1.42;
  margin: 0;
  max-width: 50ch;

  @media (min-width: 980px) {
    max-width: none;
  }
`;

const HeroSignalRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
`;

const HeroSignal = styled.span`
  background: rgba(var(--theme-bg-rgb), 0.78);
  border: 1px solid rgba(var(--theme-border-rgb), 0.82);
  border-radius: 0;
  color: rgba(var(--theme-primary-rgb), 0.9);
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  padding: 0.34rem 0.62rem;
  text-transform: uppercase;
`;

const PostMetaGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 0.8rem;
  row-gap: 0.14rem;
  width: 100%;

  @media (min-width: 760px) {
    display: grid;
    gap: 0.5rem 1rem;
    grid-template-columns: repeat(3, minmax(0, max-content));
    justify-content: space-between;
  }
`;

const PostHeroUtilityBand = styled.div`
  background:
    linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.9), rgba(var(--theme-surface-rgb), 0.92)),
    radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.08), transparent 56%);
  border-top: 1px solid rgba(var(--theme-border-rgb), 0.7);
  display: grid;
  gap: 0.7rem;
  margin-top: 0.1rem;
  padding-top: 0.95rem;

  @media (min-width: 980px) {
    align-items: center;
    column-gap: clamp(0.85rem, 2vw, 1.25rem);
    grid-template-columns: minmax(0, 1fr) auto;
  }
`;

const PostHeroContext = styled.div`
  display: grid;
  gap: 0.65rem;
  min-width: 0;
`;

const MetaPill = styled.span`
  color: rgba(62, 75, 95, 0.9);
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 0.26rem;
  min-width: 0;
  padding: 0;
  white-space: nowrap;
`;

const PostHeroChip = styled(Chip)`
  align-items: baseline;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  color: var(--theme-primary);
  display: inline-flex;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0;
  padding: 0;
  text-decoration: underline;
  text-decoration-color: rgba(var(--theme-primary-rgb), 0.22);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;

  &:hover {
    color: rgba(var(--theme-primary-rgb), 0.9);
    text-decoration-color: rgba(var(--theme-primary-rgb), 0.38);
  }
`;

const MetaPillLabel = styled.span`
  color: rgba(75, 88, 109, 0.76);
  font-size: 0.54rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  line-height: 1.1;
  text-transform: uppercase;
`;

const MetaPillValue = styled.strong`
  color: var(--theme-text);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.05;
`;

const PostTaxonomyRail = styled.div`
  display: grid;
  gap: 0.3rem;

  ${ChipRow} {
    column-gap: 0.75rem;
    row-gap: 0.22rem;
  }
`;

const PostTaxonomyLabel = styled.p`
  color: rgba(61, 76, 99, 0.72);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const HeroActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.9rem;
`;

const HeroPrimaryAction = styled.a`
  align-items: center;
  background: transparent;
  color: var(--theme-primary);
  display: inline-flex;
  font-size: 0.92rem;
  font-weight: 800;
  justify-content: center;
  min-height: auto;
  padding: 0;
  text-decoration: underline;
  text-decoration-color: rgba(var(--theme-primary-rgb), 0.26);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
  white-space: nowrap;

  &:hover {
    color: rgba(var(--theme-primary-rgb), 0.9);
    text-decoration-color: rgba(var(--theme-primary-rgb), 0.4);
  }
`;

const HeroSecondaryAction = styled(Link)`
  align-items: center;
  color: var(--theme-primary);
  display: inline-flex;
  font-size: 0.92rem;
  font-weight: 800;
  justify-content: center;
  min-height: auto;
  padding: 0;
  text-decoration: underline;
  text-decoration-color: rgba(var(--theme-primary-rgb), 0.26);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
  white-space: nowrap;

  &:hover {
    color: rgba(var(--theme-primary-rgb), 0.9);
    text-decoration-color: rgba(var(--theme-primary-rgb), 0.4);
  }
`;

const HeroGhostAction = styled(Link)`
  align-items: center;
  color: rgba(var(--theme-muted-rgb), 0.96);
  display: inline-flex;
  font-size: 0.92rem;
  font-weight: 700;
  min-height: auto;
  padding: 0;
  text-decoration: underline;
  text-decoration-color: rgba(var(--theme-muted-rgb), 0.2);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
  white-space: nowrap;

  &:hover {
    color: var(--theme-text);
    text-decoration-color: rgba(var(--theme-text-rgb), 0.34);
  }
`;

const PostHeroAside = styled.aside`
  display: grid;
  gap: 0.7rem;
`;

const HeroSnapshotCard = styled.div`
  background:
    linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.88), rgba(var(--theme-surface-rgb), 0.94)),
    radial-gradient(circle at top right, rgba(var(--theme-primary-rgb), 0.08), transparent 56%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.7);
  border-radius: 0;
  display: grid;
  gap: 0.72rem;
  padding: clamp(0.8rem, 1.6vw, 0.95rem);

  ${({ $presentation }) =>
    $presentation === "atlas" &&
    css`
      background:
        linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.92), rgba(var(--theme-surface-rgb), 0.94)),
        radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.12), transparent 58%);
      border-color: rgba(var(--theme-border-rgb), 0.78);
      box-shadow:
        0 18px 42px rgba(var(--theme-primary-rgb), 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
    `}
`;

const HeroSectionNavCard = styled(HeroSnapshotCard)`
  @media (min-width: 1100px) {
    display: none;
  }
`;

const HeroSnapshotEyebrow = styled.p`
  color: rgba(var(--theme-primary-rgb), 0.74);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  text-transform: uppercase;
`;

const HeroSnapshotTitle = styled.h2`
  color: var(--theme-text);
  font-size: clamp(0.98rem, 1.5vw, 1.08rem);
  letter-spacing: -0.03em;
  line-height: 1.18;
  margin: 0;
`;

const HeroSnapshotText = styled.p`
  color: rgba(var(--theme-muted-rgb), 0.94);
  line-height: 1.56;
  margin: 0;
`;

const HeroResumeBlock = styled.div`
  border-top: 1px solid rgba(var(--theme-border-rgb), 0.7);
  display: grid;
  gap: 0.38rem;
  padding-top: 0.72rem;
`;

const HeroResumeLabel = styled.p`
  color: rgba(var(--theme-primary-rgb), 0.72);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  text-transform: uppercase;
`;

const HeroResumeLink = styled.a`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.94), rgba(var(--theme-surface-rgb), 0.94)),
    radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.12), transparent 58%);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.14);
  border-radius: 0;
  box-shadow:
    0 12px 28px rgba(var(--theme-primary-rgb), 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  color: var(--theme-primary);
  display: inline-flex;
  font-weight: 800;
  justify-content: space-between;
  gap: 0.85rem;
  letter-spacing: -0.02em;
  line-height: 1.18;
  min-height: 2.75rem;
  padding: 0.72rem 0.82rem;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: rgba(var(--theme-primary-rgb), 0.24);
    box-shadow:
      0 16px 32px rgba(var(--theme-primary-rgb), 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    transform: translateY(-1px);
  }
`;

const HeroResumeMeta = styled.span`
  color: rgba(var(--theme-primary-rgb), 0.72);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const HeroResumeTitle = styled.span`
  display: grid;
  gap: 0.12rem;
`;

const HeroResumeArrow = styled.span`
  color: rgba(var(--theme-primary-rgb), 0.58);
  font-size: 1rem;
  line-height: 1;
`;

const HeroStatsGrid = styled.dl`
  display: grid;
  gap: 0.55rem;
  margin: 0;

  @media (min-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const HeroStatCard = styled.div`
  background: rgba(var(--theme-bg-rgb), 0.82);
  border: 1px solid rgba(var(--theme-border-rgb), 0.72);
  border-radius: 0;
  display: grid;
  gap: 0.22rem;
  min-height: 72px;
  padding: 0.72rem;

  ${({ $presentation }) =>
    $presentation === "atlas" &&
    css`
      background:
        linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.88), rgba(var(--theme-surface-rgb), 0.92)),
        radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.08), transparent 52%);
      border-color: rgba(var(--theme-border-rgb), 0.78);
    `}
`;

const HeroStatLabel = styled.dt`
  color: rgba(72, 86, 109, 0.8);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const HeroStatValue = styled.dd`
  color: var(--theme-text);
  font-size: clamp(1rem, 2.2vw, 1.2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin: 0;
`;

const SectionNavList = styled.div`
  display: grid;
  gap: 0.4rem;
`;

const SectionNavLink = styled.a`
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  color: #17253d;
  display: grid;
  gap: 0.12rem;
  padding: 0.62rem 0.74rem;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  ${({ $active }) =>
    $active &&
    css`
      background:
        linear-gradient(180deg, rgba(245, 249, 253, 0.96), rgba(237, 244, 250, 0.96)),
        radial-gradient(circle at top right, rgba(63, 115, 154, 0.12), transparent 54%);
      border-color: rgba(36, 75, 115, 0.18);
      box-shadow: 0 14px 34px rgba(19, 34, 58, 0.07);
      color: #183b63;
    `}

  &:hover {
    border-color: rgba(36, 75, 115, 0.2);
    box-shadow: 0 14px 34px rgba(19, 34, 58, 0.07);
    transform: translateY(-1px);
  }
`;

const SectionNavIndex = styled.span`
  color: rgba(76, 91, 114, 0.72);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const SectionNavLabel = styled.span`
  font-size: 0.93rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
`;

const PostImagePanel = styled.section`
  background: linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.96), rgba(var(--theme-surface-rgb), 0.93));
  border: 1px solid rgba(var(--theme-border-rgb), 0.7);
  border-radius: 0;
  box-shadow:
    0 16px 38px rgba(var(--theme-primary-rgb), 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.76);
  overflow: hidden;
  padding: clamp(0.5rem, 1.15vw, 0.68rem);

  ${({ $presentation }) =>
    $presentation === "atlas" &&
    css`
      background:
        linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.97), rgba(var(--theme-surface-rgb), 0.94)),
        radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.12), transparent 44%);
      border-color: rgba(var(--theme-border-rgb), 0.78);
      padding: clamp(0.78rem, 1.8vw, 1rem);
      position: relative;

      &::before {
        background-image:
          linear-gradient(rgba(var(--theme-primary-rgb), 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(var(--theme-primary-rgb), 0.03) 1px, transparent 1px);
        background-size: 20px 20px;
        content: "";
        inset: 0;
        opacity: 0.5;
        pointer-events: none;
        position: absolute;
      }

      > * {
        position: relative;
      }
    `}
`;

const MediaPanelHeader = styled.div`
  display: grid;
  gap: 0.72rem;
  margin-bottom: 0.9rem;
  padding-bottom: 0.85rem;
  position: relative;

  &::after {
    background: linear-gradient(
      90deg,
      rgba(var(--theme-primary-rgb), 0.12),
      rgba(var(--theme-primary-rgb), 0.03)
    );
    content: "";
    height: 1px;
    inset: auto 0 0;
    position: absolute;
  }

  @media (min-width: 980px) {
    align-items: end;
    column-gap: clamp(0.9rem, 1.9vw, 1.2rem);
    grid-template-columns: minmax(0, 0.95fr) minmax(20rem, 0.9fr);
  }
`;

const MediaPanelTitleGroup = styled.div`
  display: grid;
  gap: 0.42rem;
`;

const MediaPanelTitleRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 0.7rem;
`;

const MediaPanelTitle = styled.p`
  color: var(--theme-text);
  font-size: 0.96rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const MediaPanelCount = styled.span`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.94), rgba(var(--theme-surface-rgb), 0.92)),
    radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.12), transparent 58%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.82);
  color: rgba(var(--theme-primary-rgb), 0.9);
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  min-height: 1.95rem;
  padding: 0.22rem 0.62rem;
  text-transform: uppercase;
`;

const MediaPanelLead = styled.p`
  color: rgba(var(--theme-muted-rgb), 0.9);
  font-size: 1rem;
  line-height: 1.42;
  margin: 0;
  max-width: 40ch;
`;

const MediaPanelMeta = styled.p`
  color: rgba(70, 84, 106, 0.9);
  font-size: 0.9rem;
  justify-self: start;
  line-height: 1.46;
  margin: 0;
  max-width: 56ch;

  @media (min-width: 980px) {
    justify-self: end;
    text-align: right;
  }
`;

const PostLayout = styled.div`
  display: grid;
  gap: clamp(0.95rem, 2vw, 1.2rem);

  @media (min-width: 1100px) {
    align-items: start;
    grid-template-columns: minmax(0, 1.55fr) minmax(230px, 0.6fr);
  }
`;

const ArticleColumn = styled.div`
  display: grid;
  gap: clamp(0.85rem, 1.8vw, 1rem);
`;

const SidebarColumn = styled.aside`
  display: grid;
  gap: clamp(0.8rem, 1.8vw, 0.95rem);

  @media (min-width: 1100px) {
    align-content: start;
    max-height: calc(100vh - 6rem);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 0.2rem;
    position: sticky;
    top: 5.4rem;
    scrollbar-gutter: stable;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(36, 75, 115, 0.24);
      border-radius: 999px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }
  }
`;

const HeroImageGrid = styled.div`
  align-items: start;
  display: grid;
  gap: clamp(0.55rem, 1.2vw, 0.72rem);

  ${({ $variant }) =>
    $variant === "inlineCompact" &&
    css`
      gap: 0.45rem;
      margin-block: 0.55rem 0.2rem;

      @media (min-width: 720px) {
        grid-template-columns: repeat(2, minmax(0, 17rem));
      }
    `}

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  ${({ $presentation }) =>
    $presentation === "atlas" &&
    css`
      align-items: start;
      gap: clamp(0.8rem, 1.8vw, 1.05rem);

      @media (min-width: 980px) {
        display: flex;
        flex-wrap: wrap;
      }
    `}
`;

const SidebarPanel = styled(Panel)`
  border-radius: 0;
  gap: 0.72rem;
  padding: clamp(0.78rem, 1.7vw, 0.92rem);
`;

const PostRelatedPanel = styled(Panel)`
  border-radius: 0;
`;

const SidebarNavigatorPanel = styled(SidebarPanel)`
  @media (min-width: 1100px) {
    order: 0;
  }
`;

const SidebarNavigatorBody = styled.div`
  display: grid;
  gap: 0.5rem;
`;

const SidebarTitle = styled.h2`
  color: #16243b;
  font-size: 1.12rem;
  letter-spacing: -0.04em;
  line-height: 1.08;
  margin: 0;
`;

const SidebarStatusNote = styled.p`
  color: rgba(67, 80, 102, 0.82);
  font-size: 0.9rem;
  line-height: 1.42;
  margin: 0;

  strong {
    color: #183b63;
    font-weight: 800;
  }
`;

const TocList = styled.ol`
  color: rgba(82, 94, 116, 0.88);
  display: grid;
  gap: 0.34rem;
  list-style: decimal-leading-zero;
  margin: 0;
  padding-left: 1.4rem;

  li::marker {
    color: rgba(70, 84, 108, 0.72);
    font-family: var(--font-ui), sans-serif;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.12em;
  }
`;

const TocItem = styled.li`
  margin: 0;
  padding-left: 0.08rem;

  ${({ $active }) =>
    $active &&
    css`
      &::marker {
        color: #244b73;
      }
    `}
`;

const TocLink = styled.a`
  color: #203651;
  display: inline;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.42;
  text-decoration: none;

  ${({ $active }) =>
    $active &&
    css`
      color: #173454;
      font-weight: 800;
      text-decoration: underline;
      text-decoration-color: rgba(36, 75, 115, 0.34);
      text-decoration-thickness: 1.5px;
      text-underline-offset: 0.18em;
    `}

  &:hover {
    color: #244b73;
    text-decoration: underline;
    text-decoration-color: rgba(36, 75, 115, 0.35);
    text-underline-offset: 0.16em;
  }
`;

const ArticlePaper = styled.article`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 251, 255, 0.96)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.05), transparent 52%);
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: 0;
  box-shadow:
    0 28px 70px rgba(19, 34, 58, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  display: grid;
  padding: clamp(0.95rem, 2.2vw, 1.35rem);
  scroll-margin-top: 5.8rem;

  ${({ $presentation }) =>
    $presentation === "atlas" &&
    css`
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 248, 252, 0.96)),
        radial-gradient(circle at top right, rgba(63, 115, 154, 0.08), transparent 46%);
      border-color: rgba(18, 37, 60, 0.09);
      position: relative;

      &::before {
        background: linear-gradient(90deg, rgba(31, 62, 94, 0.92), rgba(63, 115, 154, 0.36));
        border-radius: 999px;
        content: "";
        height: 2px;
        left: clamp(0.95rem, 2.2vw, 1.35rem);
        position: absolute;
        right: clamp(0.95rem, 2.2vw, 1.35rem);
        top: 0.72rem;
      }
    `}
`;

const ArticleFlow = styled.div`
  display: grid;
  gap: clamp(1.35rem, 2.8vw, 1.8rem);

  > section + section {
    border-top: 1px solid rgba(16, 32, 51, 0.08);
    padding-top: clamp(1.35rem, 2.8vw, 1.8rem);
  }
`;

const StorySection = styled.section`
  display: grid;
  gap: clamp(0.72rem, 1.4vw, 0.92rem);
  scroll-margin-top: 6rem;

  ${({ $tone }) =>
    $tone === "reference" &&
    css`
      background:
        linear-gradient(180deg, rgba(243, 247, 255, 0.86), rgba(250, 251, 255, 0.98)),
        radial-gradient(circle at top right, rgba(36, 75, 115, 0.08), transparent 48%);
      border: 1px solid rgba(36, 75, 115, 0.12);
      border-radius: 0;
      padding: clamp(0.82rem, 1.8vw, 1rem);
    `}

  ${({ $tone }) =>
    $tone === "warning" &&
    css`
      background:
        linear-gradient(180deg, rgba(255, 247, 238, 0.96), rgba(255, 251, 246, 0.99)),
        radial-gradient(circle at top right, rgba(201, 123, 42, 0.1), transparent 52%);
      border: 1px solid rgba(201, 123, 42, 0.18);
      border-radius: 0;
      padding: clamp(0.82rem, 1.8vw, 1rem);
    `}

  ${({ $tone }) =>
    $tone === "utility" &&
    css`
      background: rgba(245, 248, 252, 0.82);
      border: 1px solid rgba(16, 32, 51, 0.08);
      border-radius: 0;
      padding: clamp(0.78rem, 1.7vw, 0.95rem);
    `}
`;

const StorySectionHeader = styled.div`
  display: grid;
  gap: 0.22rem;
`;

const StorySectionMetaRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem 0.6rem;
`;

const StorySectionIndex = styled.span`
  color: rgba(44, 76, 108, 0.72);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
`;

const SectionLabel = styled.span`
  color: rgba(44, 76, 108, 0.74);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const PostSectionTitle = styled.h2`
  color: #16243b;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.08rem, 1.5vw, 1.32rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.12;
  margin: 0;
  text-wrap: balance;
`;

const ArticleBody = styled.div`
  color: rgba(56, 68, 88, 0.96);
  display: grid;
  gap: 0.72rem;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.12rem, 1.25vw, 1.24rem);
  line-height: 1.52;

  p {
    margin: 0;
  }

  strong {
    color: #17253d;
  }

  a {
    color: #244b73;
    text-decoration-color: rgba(36, 75, 115, 0.35);
    text-decoration-thickness: 1px;
    text-underline-offset: 0.18em;
  }
`;

const NumberedList = styled.ol`
  color: rgba(56, 68, 88, 0.96);
  display: grid;
  gap: 0.58rem;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.08rem, 1.2vw, 1.18rem);
  line-height: 1.56;
  margin: 0;
  padding-left: 1.45rem;

  li::marker {
    color: #244b73;
    font-family: var(--font-ui), sans-serif;
    font-weight: 800;
  }
`;

const DetailCardGrid = styled.div`
  display: grid;
  gap: clamp(0.85rem, 2vw, 1rem);

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const DetailCard = styled.article`
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  box-shadow: 0 12px 28px rgba(19, 34, 58, 0.04);
  display: grid;
  gap: 0.72rem;
  padding: clamp(1rem, 2.2vw, 1.2rem);
`;

const DetailCardTitle = styled.h3`
  color: #17253d;
  font-size: 1.08rem;
  letter-spacing: -0.03em;
  line-height: 1.18;
  margin: 0;
`;

const DetailCardText = styled.p`
  color: rgba(72, 84, 108, 0.96);
  line-height: 1.46;
  margin: 0;
`;

const FaultGrid = styled.div`
  display: grid;
  gap: clamp(0.85rem, 2vw, 1rem);

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const FaultCard = styled.article`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(246, 249, 252, 0.96)),
    radial-gradient(circle at top right, rgba(0, 95, 115, 0.08), transparent 48%);
  border: 1px solid rgba(0, 95, 115, 0.12);
  border-radius: 0;
  display: grid;
  gap: 0.85rem;
  padding: clamp(1rem, 2.2vw, 1.25rem);
`;

const ResourceList = styled.ul`
  color: rgba(56, 68, 88, 0.96);
  display: grid;
  gap: 0.5rem;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.08rem, 1.18vw, 1.16rem);
  line-height: 1.48;
  margin: 0;
  padding-left: 1.4rem;

  li::marker {
    color: rgba(36, 75, 115, 0.7);
  }
`;

const ResourceItem = styled.li`
  display: grid;
  gap: 0.22rem;
  margin: 0;
`;

const ResourceLink = styled.a`
  color: #183b63;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: rgba(24, 59, 99, 0.35);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.16em;
`;

const ResourceMeta = styled.span`
  color: rgba(89, 100, 120, 0.88);
  font-size: 0.95em;
`;

const ResourceNote = styled.p`
  color: rgba(72, 84, 108, 0.92);
  font-size: 0.92rem;
  line-height: 1.42;
  margin: 0;
`;

const SectionEvidenceNote = styled.p`
  color: rgba(68, 82, 104, 0.84);
  font-size: 0.88rem;
  line-height: 1.42;
  margin: 0.12rem 0 0;
`;

const InlineToggleButton = styled.button`
  align-items: center;
  appearance: none;
  background: none;
  border: 0;
  color: #244b73;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.92rem;
  font-weight: 700;
  justify-content: flex-start;
  margin: 0.12rem 0 0;
  padding: 0;
  text-decoration: underline;
  text-decoration-color: rgba(36, 75, 115, 0.32);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.16em;

  &:hover {
    color: #173454;
    text-decoration-color: rgba(23, 52, 84, 0.42);
  }

  &:focus-visible {
    outline: 2px solid rgba(36, 75, 115, 0.34);
    outline-offset: 3px;
  }
`;

const ResourceGroup = styled.div`
  display: grid;
  gap: 0.9rem;
`;

const FlatResourceStrip = styled.div`
  display: grid;
  gap: 0.55rem;
  padding: 0 0.1rem;
`;

const ResourceGroupTitle = styled.h3`
  color: #17253d;
  font-size: 1.02rem;
  letter-spacing: -0.02em;
  margin: 0;
`;

function collectSectionText(value, collected = []) {
  if (typeof value === "string") {
    const normalizedValue = value.trim();

    if (normalizedValue) {
      collected.push(normalizedValue);
    }

    return collected;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectSectionText(entry, collected);
    }

    return collected;
  }

  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      collectSectionText(entry, collected);
    }
  }

  return collected;
}

function estimateReadingTimeMinutes(sections = []) {
  const words = collectSectionText(sections)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(4, Math.ceil(words / 215));
}

function countReferenceItems(sections = []) {
  return sections.reduce((total, section) => {
    if (
      section?.id === "references" ||
      section?.kind === "manuals" ||
      section?.kind === "references"
    ) {
      return total + (section.items?.length || 0);
    }

    return total;
  }, 0);
}

function getPostSectionAnchor(sectionId) {
  return `section-${sectionId}`;
}

function getReadingResumeStorageKey(articlePath) {
  return `equip-blog:reading-progress:${articlePath || "unknown-article"}`;
}

function getSectionNavigationLabel(section, copy) {
  return section?.id === "references" ? copy.referencesHeading : section?.title;
}

function getVisualBadgeLabel(image) {
  if (image?.isAiGenerated) {
    return "AI illustration";
  }

  if (image?.storageDriver === "external-source") {
    return "Reference photo";
  }

  if (image?.storageDriver === "local" || image?.storageDriver === "s3") {
    return "Stored visual";
  }

  return "Inline visual";
}

function buildHeroSignals({
  bodySections,
  inlineHeroImages,
  linkedHeroImages,
  referenceItemCount,
}) {
  const visualCount = inlineHeroImages.length + linkedHeroImages.length;
  const signals = [];

  if (visualCount) {
    signals.push(`${visualCount} visual${visualCount === 1 ? "" : "s"}`);
  }

  if (bodySections.some((section) => section.kind === "steps")) {
    signals.push("Procedure-led");
  }

  if (bodySections.some((section) => section.kind === "faults")) {
    signals.push("Fault atlas");
  }

  if (referenceItemCount) {
    signals.push("Reference-linked");
  }

  return signals.slice(0, 4);
}

function getArticleSectionTone(section) {
  if (section.id === "disclaimer") {
    return "warning";
  }

  if (
    section.id === "references" ||
    section.kind === "manuals" ||
    section.kind === "references"
  ) {
    return "reference";
  }

  return "default";
}

function getArticleSectionLabel(section) {
  if (section.id === "disclaimer") {
    return "Safety boundary";
  }

  if (section.id === "references") {
    return "Reference pack";
  }

  if (section.kind === "manuals") {
    return "Manuals";
  }

  if (section.kind === "faults") {
    return "Troubleshooting";
  }

  if (section.kind === "steps") {
    return "Procedure";
  }

  if (section.kind === "faq") {
    return "Common questions";
  }

  if (section.kind === "models_by_manufacturer") {
    return "Model guide";
  }

  if (section.kind === "image_gallery") {
    return "Visual guide";
  }

  if (section.kind === "list") {
    return "Key points";
  }

  return null;
}

function getImageResourceTitle(image, index) {
  const candidate = image?.alt || image?.caption;

  return candidate && `${candidate}`.trim() ? candidate : `Photo resource ${index + 1}`;
}

function getImageResourceMeta(image, label) {
  const details = [];

  if (image?.alt && image.alt !== label) {
    details.push(image.alt);
  }

  if (image?.caption && image.caption !== label) {
    details.push(image.caption);
  }

  return details.join(" ");
}

function renderImageResourceList(images = []) {
  if (!images.length) {
    return null;
  }

  return (
    <ResourceList>
      {images.map((image, index) => {
        const label = getImageResourceTitle(image, index);
        const meta = getImageResourceMeta(image, label);
        const href = image.href || image.url || null;

        return (
          <ResourceItem key={`${href || label}-${index}`}>
            {href ? (
              <ResourceLink href={href} rel="noreferrer" target="_blank">
                {label}
              </ResourceLink>
            ) : (
              <strong>{label}</strong>
            )}
            {meta ? <ResourceMeta>{meta}</ResourceMeta> : null}
          </ResourceItem>
        );
      })}
    </ResourceList>
  );
}

function formatAccessStatusLabel(value) {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = value.trim().replace(/[_-]+/g, " ");

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.replace(/\b\w/g, (character) => character.toUpperCase());
}

function getSectionEvidenceSummary(section) {
  if (section?.id === "disclaimer") {
    return null;
  }

  const sourceCount = section?.sourceReferences?.length || section?.sourceReferenceIds?.length || 0;

  if (!sourceCount) {
    return null;
  }

  return sourceCount === 1
    ? "Evidence base: 1 cited source."
    : `Evidence base: ${sourceCount} cited sources.`;
}

function getDocumentMetaLabel(item, locale) {
  const details = [item?.fileType, item?.language];
  const accessStatusLabel = formatAccessStatusLabel(item?.accessStatus);
  const checkedAtLabel = formatDateLabel(locale, item?.lastCheckedAt);
  const sourceTypeLabel = formatAccessStatusLabel(item?.sourceType);

  if (accessStatusLabel) {
    details.push(`Access: ${accessStatusLabel}`);
  }

  if (checkedAtLabel) {
    details.push(`Checked ${checkedAtLabel}`);
  }

  if (sourceTypeLabel && item?.sourceType) {
    details.push(sourceTypeLabel);
  }

  return details.filter(Boolean).join(" | ");
}

function getInlineEvidenceText(entry) {
  const sourceReferences = Array.isArray(entry?.sourceReferences)
    ? entry.sourceReferences.filter((reference) => reference?.title)
    : [];

  if (sourceReferences.length) {
    return `Sources: ${sourceReferences.map((reference) => reference.title).join("; ")}`;
  }

  const sourceCount = entry?.sourceReferenceIds?.length || 0;

  if (sourceCount) {
    return sourceCount === 1 ? "Source linked for this item." : `${sourceCount} sources linked for this item.`;
  }

  return null;
}

function renderInlineEvidenceNote(entry) {
  const evidenceText = getInlineEvidenceText(entry);

  if (!evidenceText) {
    return null;
  }

  return <SectionEvidenceNote>{evidenceText}</SectionEvidenceNote>;
}

function SectionToggle({
  collapseLabel = "Show fewer",
  expanded,
  hiddenCount,
  pluralLabel,
  singularLabel,
  onToggle,
}) {
  if (!hiddenCount) {
    return null;
  }

  const hiddenLabel = hiddenCount === 1 ? singularLabel : pluralLabel;

  return (
    <InlineToggleButton aria-expanded={expanded} onClick={onToggle} type="button">
      {expanded ? collapseLabel : `View ${hiddenCount} more ${hiddenLabel}`}
    </InlineToggleButton>
  );
}

function ExpandableBulletList({ items = [] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, 5);

  return (
    <>
      <BulletList>
        {visibleItems.map((item) => (
          <li key={`${item.title}-${item.description || ""}`}>
            <strong>{item.title}</strong>
            {item.description ? `: ${item.description}` : ""}
            {renderEntryInlineImages(item.images)}
            {item.notes ? <ResourceNote>{item.notes}</ResourceNote> : null}
            {renderInlineEvidenceNote(item)}
          </li>
        ))}
      </BulletList>
      <SectionToggle
        expanded={expanded}
        hiddenCount={Math.max(0, items.length - 5)}
        onToggle={() => setExpanded((currentValue) => !currentValue)}
        pluralLabel="manufacturers"
        singularLabel="manufacturer"
      />
    </>
  );
}

function ManufacturerModelGroupCard({ group }) {
  const [expanded, setExpanded] = useState(false);
  const visibleModels = expanded ? group.models || [] : (group.models || []).slice(0, 5);

  return (
    <DetailCard>
      <DetailCardTitle>{group.manufacturer}</DetailCardTitle>
      <BulletList>
        {visibleModels.map((model) => (
          <li key={model.name}>
            <strong>{model.name}</strong>
            {model.latestKnownYear ? ` (${model.latestKnownYear})` : ""}
            {model.summary ? `: ${model.summary}` : ""}
            {renderEntryInlineImages(model.images)}
            {model.notes ? <ResourceNote>{model.notes}</ResourceNote> : null}
            {renderInlineEvidenceNote(model)}
          </li>
        ))}
      </BulletList>
      <SectionToggle
        expanded={expanded}
        hiddenCount={Math.max(0, (group.models || []).length - 5)}
        onToggle={() => setExpanded((currentValue) => !currentValue)}
        pluralLabel="models"
        singularLabel="model"
      />
    </DetailCard>
  );
}

function ExpandableModelGroups({ groups = [] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleGroups = expanded ? groups : groups.slice(0, 5);

  return (
    <>
      <DetailCardGrid>
        {visibleGroups.map((group) => (
          <ManufacturerModelGroupCard group={group} key={group.manufacturer} />
        ))}
      </DetailCardGrid>
      <SectionToggle
        expanded={expanded}
        hiddenCount={Math.max(0, groups.length - 5)}
        onToggle={() => setExpanded((currentValue) => !currentValue)}
        pluralLabel="manufacturers"
        singularLabel="manufacturer"
      />
    </>
  );
}

function InlinePhotoFigure({
  image,
  presentation = "default",
  priority = false,
  sizes = "100vw",
  variant = "article",
}) {
  const [measuredDimensions, setMeasuredDimensions] = useState(null);

  useEffect(() => {
    if (!image?.url || typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;
    const probe = new window.Image();

    function updateMeasuredDimensions() {
      if (cancelled) {
        return;
      }

      const { naturalHeight, naturalWidth } = probe;

      if (
        Number.isFinite(naturalWidth) &&
        Number.isFinite(naturalHeight) &&
        naturalWidth > 0 &&
        naturalHeight > 0
      ) {
        setMeasuredDimensions((currentValue) => {
          if (
            currentValue &&
            currentValue.width === naturalWidth &&
            currentValue.height === naturalHeight
          ) {
            return currentValue;
          }

          return {
            height: naturalHeight,
            width: naturalWidth,
          };
        });
      }
    }

    probe.onload = updateMeasuredDimensions;
    probe.src = image.url;

    if (probe.complete) {
      updateMeasuredDimensions();
    }

    return () => {
      cancelled = true;
      probe.onload = null;
    };
  }, [image?.url]);

  const resolvedImage = measuredDimensions
    ? {
        ...image,
        height: measuredDimensions.height,
        width: measuredDimensions.width,
      }
    : image;
  const orientation = getImageOrientation(resolvedImage);
  const imageContent = (
    <ResponsiveImage
      image={resolvedImage}
      onMeasure={setMeasuredDimensions}
      presentation={presentation}
      priority={priority}
      sizes={sizes}
      variant={variant}
    />
  );

  return (
    <Figure $orientation={orientation} $presentation={presentation} $variant={variant}>
      <FigureFrame
        $orientation={orientation}
        $presentation={presentation}
        $variant={variant}
      >
        {resolvedImage.href ? (
          <FigureFrameLink href={resolvedImage.href} rel="noreferrer" target="_blank">
            {imageContent}
          </FigureFrameLink>
        ) : (
          imageContent
        )}
      </FigureFrame>
      {presentation === "atlas" || resolvedImage.caption ? (
        <FigureMeta $presentation={presentation}>
          {presentation === "atlas" ? (
            <FigureBadgeRow>
              <FigureBadge>{getVisualBadgeLabel(resolvedImage)}</FigureBadge>
              {resolvedImage.licenseType ? <FigureBadge>{resolvedImage.licenseType}</FigureBadge> : null}
            </FigureBadgeRow>
          ) : null}
          {resolvedImage.caption ? <FigureCaption>{resolvedImage.caption}</FigureCaption> : null}
        </FigureMeta>
      ) : null}
    </Figure>
  );
}

function renderInlinePhotoFigure(
  image,
  { presentation = "default", priority = false, sizes = "100vw", variant = "article" } = {},
) {
  if (!image?.url) {
    return null;
  }

  return (
    <InlinePhotoFigure
      image={image}
      key={image.url}
      presentation={presentation}
      priority={priority}
      sizes={sizes}
      variant={variant}
    />
  );
}

function renderEntryInlineImages(images = [], presentation = "default") {
  const visibleImages = (images || []).filter((image) => image?.renderInline).slice(0, 2);

  if (!visibleImages.length) {
    return null;
  }

  return (
    <HeroImageGrid $presentation={presentation} $variant="inlineCompact">
      {visibleImages.map((image) =>
        renderInlinePhotoFigure(image, {
          presentation,
          sizes: "(min-width: 720px) 28vw, 92vw",
          variant: "inlineCompact",
        }),
      )}
    </HeroImageGrid>
  );
}

function renderArticleSection(section, copy, { locale, presentation = "default" } = {}) {
  if (section.kind === "text") {
    return (
      <ArticleBody>
        {(section.paragraphs || []).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </ArticleBody>
    );
  }

  if (section.kind === "list") {
    return (
      <ArticleBody>
        {section.intro ? <p>{section.intro}</p> : null}
        {section.id === "commonly_used_manufacturers" ? (
          <ExpandableBulletList items={section.items || []} />
        ) : (
          <BulletList>
            {(section.items || []).map((item) => (
              <li key={`${item.title}-${item.description || ""}`}>
                <strong>{item.title}</strong>
                {item.description ? `: ${item.description}` : ""}
                {renderEntryInlineImages(item.images, presentation)}
                {item.frequency ? <ResourceMeta>{`Frequency: ${item.frequency}`}</ResourceMeta> : null}
                {item.notes ? <ResourceNote>{item.notes}</ResourceNote> : null}
                {renderInlineEvidenceNote(item)}
              </li>
            ))}
          </BulletList>
        )}
      </ArticleBody>
    );
  }

  if (section.kind === "models_by_manufacturer") {
    return <ExpandableModelGroups groups={section.groups || []} />;
  }

  if (section.kind === "faults") {
    return (
      <FaultGrid>
        {(section.items || []).map((fault) => (
          <FaultCard key={fault.title}>
            <DetailCardTitle>{fault.title}</DetailCardTitle>
            <ArticleBody>
              <p>
                <strong>Cause:</strong> {fault.cause || "Not verified."}
              </p>
              <p>
                <strong>Symptoms:</strong> {fault.symptoms || "Not verified."}
              </p>
              <p>
                <strong>Remedy:</strong> {fault.remedy || "Not verified."}
              </p>
              {fault.severity ? (
                <p>
                  <strong>Severity:</strong> {fault.severity}
                </p>
              ) : null}
              {typeof fault.evidenceCount === "number" && fault.evidenceCount > 0 ? (
                <ResourceMeta>{`Evidence points: ${fault.evidenceCount}`}</ResourceMeta>
              ) : null}
              {renderEntryInlineImages(fault.images, presentation)}
              {fault.notes ? <ResourceNote>{fault.notes}</ResourceNote> : null}
              {renderInlineEvidenceNote(fault)}
            </ArticleBody>
          </FaultCard>
        ))}
      </FaultGrid>
    );
  }

  if (section.kind === "steps") {
    return (
      <ArticleBody>
        {section.intro ? <p>{section.intro}</p> : null}
        <NumberedList>
          {(section.steps || []).map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              {step.description ? `: ${step.description}` : ""}
              {renderEntryInlineImages(step.images, presentation)}
              {step.notes ? <ResourceNote>{step.notes}</ResourceNote> : null}
              {renderInlineEvidenceNote(step)}
            </li>
          ))}
        </NumberedList>
      </ArticleBody>
    );
  }

  if (section.kind === "manuals" || section.kind === "references") {
    return (
      <ResourceList>
        {(section.items || []).map((item) => {
          const safeUrl = sanitizeExternalUrl(item.url);
          const metaLabel = getDocumentMetaLabel(item, locale);

          return (
            <ResourceItem key={`${item.title}-${item.url || "no-url"}`}>
              {safeUrl ? (
                <ResourceLink href={safeUrl} rel="noreferrer" target="_blank">
                  {item.title}
                </ResourceLink>
              ) : (
                <strong>{item.title}</strong>
              )}
              {metaLabel ? <ResourceMeta>{metaLabel}</ResourceMeta> : null}
              {item.notes ? <ResourceNote>{item.notes}</ResourceNote> : null}
              {section.kind === "manuals" ? renderInlineEvidenceNote(item) : null}
            </ResourceItem>
          );
        })}
      </ResourceList>
    );
  }

  if (section.kind === "faq") {
    return (
      <DetailCardGrid>
        {(section.items || []).map((item) => (
          <DetailCard key={item.question}>
            <DetailCardTitle>{item.question}</DetailCardTitle>
            <DetailCardText>{item.answer}</DetailCardText>
          </DetailCard>
        ))}
      </DetailCardGrid>
    );
  }

  if (section.kind === "image_gallery") {
    const inlineImages = (section.images || []).filter((image) => image.renderInline);
    const linkedImages = (section.images || []).filter((image) => !image.renderInline);

    return (
      <>
        {inlineImages.length ? (
          <HeroImageGrid $presentation={presentation}>
            {inlineImages.map((image) =>
              renderInlinePhotoFigure(
                {
                  ...image,
                  alt: image.alt || copy.relatedPostsTitle,
                },
                {
                  presentation,
                  sizes: "(min-width: 720px) 46vw, 92vw",
                },
              ),
            )}
          </HeroImageGrid>
        ) : null}
        {linkedImages.length ? renderImageResourceList(linkedImages) : null}
      </>
    );
  }

  if (Array.isArray(section.paragraphs) && section.paragraphs.length) {
    return (
      <ArticleBody>
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </ArticleBody>
    );
  }

  if (Array.isArray(section.items) && section.items.length) {
    return (
      <ArticleBody>
        <BulletList>
          {section.items.map((item, index) => (
            <li key={`${item.title || item.label || index}`}>
              <strong>{item.title || item.label || item.name || `Item ${index + 1}`}</strong>
              {item.description || item.details || item.summary
                ? `: ${item.description || item.details || item.summary}`
                : ""}
            </li>
          ))}
        </BulletList>
      </ArticleBody>
    );
  }

  return null;
}

export function PublicPostPage({ locale, messages, pageData }) {
  const copy = getCommonCopy(messages);
  const { article } = pageData;
  const presentation =
    article.equipment?.slug === "microscope" || article.path?.endsWith("/blog/microscope")
      ? "atlas"
      : "default";
  const displayEquipmentName = formatEquipmentDisplayName(article.equipment.name);
  const displayTitle = formatArticleDisplayTitle(article.title, article.equipment.name);
  const bodySections = article.bodySections || [];
  const inlineHeroImages = (article.heroImages || []).filter((image) => image.renderInline);
  const featuredHeroImage = inlineHeroImages[0] || null;
  const inlineGalleryImages = featuredHeroImage ? inlineHeroImages.slice(1) : inlineHeroImages;
  const linkedHeroImages = (article.heroImages || []).filter((image) => !image.renderInline);
  const sectionLinks = bodySections.filter((section) => section?.id && section?.title);
  const readingTimeMinutes = estimateReadingTimeMinutes(bodySections);
  const referenceItemCount = countReferenceItems(bodySections);
  const backToBlogHref = article.breadcrumb[1]?.href || article.path;
  const heroSectionLinks = sectionLinks.slice(0, 5);
  const heroSignals = buildHeroSignals({
    bodySections,
    inlineHeroImages,
    linkedHeroImages,
    referenceItemCount,
  });
  const heroSummaryEyebrow = presentation === "atlas" ? "System view" : "Quick scan";
  const heroSummaryTitle = presentation === "atlas" ? "Atlas summary" : "What this guide covers";
  const heroSummaryText =
    presentation === "atlas"
      ? "This microscope entry is staged as a compact visual brief so the overview, troubleshooting, and references stay in one reading flow."
      : "Use the quick stats and section links to move between the overview, troubleshooting, and reference material faster.";
  const heroNavEyebrow = presentation === "atlas" ? "Contents" : "On this page";
  const heroNavTitle = presentation === "atlas" ? "Guide map" : "Jump to a section";
  const mediaPanelTitle = presentation === "atlas" ? "Visual atlas" : "Featured visuals";
  const mediaPanelMeta =
    presentation === "atlas"
      ? "Real photos and supporting visuals are arranged inline so the article reads like an illustrated study guide."
      : null;
  const mediaPanelLead =
    presentation === "atlas"
      ? "Key reference photos are staged as a compact visual spread so readers can scan the instrument and its real-world use without losing the reading flow."
      : null;
  const firstSectionId = sectionLinks[0]?.id || "";
  const sectionLinkKey = sectionLinks.map((section) => section.id).join("|");
  const readingResumeStorageKey = getReadingResumeStorageKey(article.path);
  const sidebarColumnRef = useRef(null);
  const tocLinkRefs = useRef(new Map());
  const previousWindowScrollDirectionRef = useRef("down");
  const previousWindowScrollYRef = useRef(0);
  const sectionLinksRef = useRef(sectionLinks);
  const [activeSectionId, setActiveSectionId] = useState(firstSectionId);
  const [resumeSectionId, setResumeSectionId] = useState(null);
  const activeSection =
    sectionLinks.find((section) => section.id === activeSectionId) || sectionLinks[0] || null;
  const resumeSection =
    resumeSectionId && resumeSectionId !== firstSectionId
      ? sectionLinks.find((section) => section.id === resumeSectionId) || null
      : null;
  const activeSectionLabel = activeSection ? getSectionNavigationLabel(activeSection, copy) : null;
  const resumeSectionLabel = resumeSection ? getSectionNavigationLabel(resumeSection, copy) : null;
  const heroStats = [
    {
      label: "Estimated read",
      value: `${readingTimeMinutes} min`,
    },
    {
      label: "Guide sections",
      value: `${bodySections.length}`,
    },
    {
      label: "Sources cited",
      value: `${referenceItemCount}`,
    },
    {
      label: "Manufacturers",
      value: `${article.manufacturers.length || 0}`,
    },
  ];

  useEffect(() => {
    sectionLinksRef.current = sectionLinks;
  }, [sectionLinks]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    previousWindowScrollDirectionRef.current = "down";
    previousWindowScrollYRef.current = window.scrollY;

    function handleWindowScroll() {
      const currentWindowScrollY = window.scrollY;
      const previousWindowScrollY = previousWindowScrollYRef.current;
      const nextDirection =
        currentWindowScrollY < previousWindowScrollY - 8
          ? "up"
          : currentWindowScrollY > previousWindowScrollY + 8
            ? "down"
            : previousWindowScrollDirectionRef.current;
      const sidebarElement = sidebarColumnRef.current;

      if (
        window.innerWidth >= 1100 &&
        sidebarElement &&
        nextDirection === "up" &&
        previousWindowScrollDirectionRef.current !== "up" &&
        sidebarElement.scrollTop > 8
      ) {
        sidebarElement.scrollTo({
          behavior: "smooth",
          top: 0,
        });
      }

      previousWindowScrollDirectionRef.current = nextDirection;
      previousWindowScrollYRef.current = currentWindowScrollY;
    }

    window.addEventListener("scroll", handleWindowScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
    };
  }, []);

  useEffect(() => {
    setActiveSectionId(firstSectionId);
  }, [firstSectionId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(readingResumeStorageKey);

      if (!storedValue) {
        setResumeSectionId(null);
        return;
      }

      const parsedValue = JSON.parse(storedValue);
      const storedSectionId = typeof parsedValue?.id === "string" ? parsedValue.id : "";
      const isKnownSection = sectionLinksRef.current.some(
        (section) => section.id === storedSectionId,
      );

      setResumeSectionId(isKnownSection ? storedSectionId : null);
    } catch {
      setResumeSectionId(null);
    }
  }, [readingResumeStorageKey, sectionLinkKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !sectionLinksRef.current.length) {
      return undefined;
    }

    let frameId = null;

    function updateActiveSection() {
      frameId = null;

      const stickyOffset = window.innerWidth < 760 ? 124 : 152;
      let nextActiveSectionId = firstSectionId;

      for (const section of sectionLinksRef.current) {
        const element = document.getElementById(getPostSectionAnchor(section.id));

        if (!element) {
          continue;
        }

        if (element.getBoundingClientRect().top - stickyOffset <= 0) {
          nextActiveSectionId = section.id;
          continue;
        }

        break;
      }

      setActiveSectionId((currentValue) =>
        currentValue === nextActiveSectionId ? currentValue : nextActiveSectionId,
      );
    }

    function requestActiveSectionUpdate() {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(updateActiveSection);
    }

    requestActiveSectionUpdate();
    window.addEventListener("hashchange", requestActiveSectionUpdate);
    window.addEventListener("resize", requestActiveSectionUpdate);
    window.addEventListener("scroll", requestActiveSectionUpdate, {
      passive: true,
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("hashchange", requestActiveSectionUpdate);
      window.removeEventListener("resize", requestActiveSectionUpdate);
      window.removeEventListener("scroll", requestActiveSectionUpdate);
    };
  }, [firstSectionId, sectionLinkKey]);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 1100 || !activeSectionId) {
      return;
    }

    const activeTocLink = tocLinkRefs.current.get(activeSectionId);
    const sidebarElement = sidebarColumnRef.current;

    if (!activeTocLink || !sidebarElement) {
      return;
    }

    const sidebarRect = sidebarElement.getBoundingClientRect();
    const linkRect = activeTocLink.getBoundingClientRect();
    const insetTop = 20;
    const insetBottom = 28;
    let nextScrollTop = sidebarElement.scrollTop;

    if (linkRect.top < sidebarRect.top + insetTop) {
      nextScrollTop += linkRect.top - (sidebarRect.top + insetTop);
    } else if (linkRect.bottom > sidebarRect.bottom - insetBottom) {
      nextScrollTop += linkRect.bottom - (sidebarRect.bottom - insetBottom);
    }

    const clampedScrollTop = Math.max(
      0,
      Math.min(nextScrollTop, sidebarElement.scrollHeight - sidebarElement.clientHeight),
    );

    if (Math.abs(sidebarElement.scrollTop - clampedScrollTop) > 6) {
      sidebarElement.scrollTo({
        behavior: "smooth",
        top: clampedScrollTop,
      });
    }
  }, [activeSectionId]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeSectionId || !sectionLinksRef.current.length) {
      return;
    }

    const guideContentElement = window.document.getElementById("guide-content");
    const readingThreshold = guideContentElement
      ? Math.max(guideContentElement.offsetTop - 140, 220)
      : 220;

    if (window.scrollY < readingThreshold) {
      return;
    }

    try {
      window.localStorage.setItem(
        readingResumeStorageKey,
        JSON.stringify({
          id: activeSectionId,
          savedAt: Date.now(),
        }),
      );
    } catch {
      return;
    }

    setResumeSectionId((currentValue) =>
      currentValue === activeSectionId ? currentValue : activeSectionId,
    );
  }, [activeSectionId, readingResumeStorageKey, sectionLinkKey]);

  return (
    <PageMain $layout="post">
      <PublicViewTracker eventType="POST_VIEW" locale={locale} postId={article.id} />
      <PostScene>
        <PostHeroShell $presentation={presentation}>
          <PostHeroGrid>
            <PostHeader>
              <Breadcrumbs aria-label="Breadcrumb">
                {article.breadcrumb.map((item, index) => (
                  <span key={item.href}>
                    {index > 0 ? <BreadcrumbSeparator>/</BreadcrumbSeparator> : null}{" "}
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  </span>
                ))}
              </Breadcrumbs>
              <PostKicker>{displayEquipmentName}</PostKicker>
              <PostLeadGrid $hasVisual={Boolean(featuredHeroImage)}>
                <PostTitleBlock>
                  <PostTitle>{displayTitle}</PostTitle>
                </PostTitleBlock>
                {featuredHeroImage ? (
                  <PostLeadVisual>
                    <PostLeadVisualFrame>
                      {featuredHeroImage.href ? (
                        <FigureFrameLink
                          href={featuredHeroImage.href}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ResponsiveImage
                            image={featuredHeroImage}
                            priority={true}
                            sizes="(min-width: 980px) 24vw, 92vw"
                            variant="card"
                          />
                        </FigureFrameLink>
                      ) : (
                        <ResponsiveImage
                          image={featuredHeroImage}
                          priority={true}
                          sizes="(min-width: 980px) 24vw, 92vw"
                          variant="card"
                        />
                      )}
                    </PostLeadVisualFrame>
                    {featuredHeroImage.caption ? (
                      <PostLeadVisualCaption>{featuredHeroImage.caption}</PostLeadVisualCaption>
                    ) : null}
                  </PostLeadVisual>
                ) : null}
                <PostDeckBlock>
                  <PostDeckEyebrow>Reading brief</PostDeckEyebrow>
                  <PostDeck>{article.excerpt}</PostDeck>
                  {heroSignals.length ? (
                    <HeroSignalRow>
                      {heroSignals.map((signal) => (
                        <HeroSignal key={signal}>{signal}</HeroSignal>
                      ))}
                    </HeroSignalRow>
                  ) : null}
                </PostDeckBlock>
              </PostLeadGrid>
              <PostHeroUtilityBand>
                <PostHeroContext>
                  <PostMetaGrid>
                    {article.publishedAt ? (
                      <MetaPill>
                        <MetaPillLabel>{copy.publishedLabel}</MetaPillLabel>
                        <MetaPillValue>{formatDateLabel(locale, article.publishedAt)}</MetaPillValue>
                      </MetaPill>
                    ) : null}
                    {article.updatedAt ? (
                      <MetaPill>
                        <MetaPillLabel>{copy.updatedLabel}</MetaPillLabel>
                        <MetaPillValue>{formatDateLabel(locale, article.updatedAt)}</MetaPillValue>
                      </MetaPill>
                    ) : null}
                    <MetaPill>
                      <MetaPillLabel>{copy.authorLabel}</MetaPillLabel>
                      <MetaPillValue>{article.authorName}</MetaPillValue>
                    </MetaPill>
                  </PostMetaGrid>
                  {article.categories.length || article.manufacturers.length ? (
                    <PostTaxonomyRail>
                      <PostTaxonomyLabel>Equipment network</PostTaxonomyLabel>
                      <ChipRow>
                        {article.categories.map((category) => (
                          <PostHeroChip href={category.path} key={category.slug}>
                            {category.name}
                          </PostHeroChip>
                        ))}
                        {article.manufacturers.map((manufacturer) => (
                          <PostHeroChip href={manufacturer.path} key={manufacturer.slug}>
                            {manufacturer.name}
                          </PostHeroChip>
                        ))}
                      </ChipRow>
                    </PostTaxonomyRail>
                  ) : null}
                  <HeroActionRow>
                    <HeroPrimaryAction href="#guide-content">Start reading</HeroPrimaryAction>
                    <HeroSecondaryAction href={article.equipment.path}>
                      {copy.browseEquipment}
                    </HeroSecondaryAction>
                    <HeroGhostAction href={backToBlogHref}>{copy.backToBlogAction}</HeroGhostAction>
                  </HeroActionRow>
                </PostHeroContext>
              </PostHeroUtilityBand>
            </PostHeader>

            <PostHeroAside>
              <HeroSnapshotCard $presentation={presentation}>
                <HeroSnapshotEyebrow>{heroSummaryEyebrow}</HeroSnapshotEyebrow>
                <HeroSnapshotTitle>{heroSummaryTitle}</HeroSnapshotTitle>
                <HeroSnapshotText>{heroSummaryText}</HeroSnapshotText>
                <HeroStatsGrid>
                  {heroStats.map((entry) => (
                    <HeroStatCard $presentation={presentation} key={entry.label}>
                      <HeroStatLabel>{entry.label}</HeroStatLabel>
                      <HeroStatValue>{entry.value}</HeroStatValue>
                    </HeroStatCard>
                  ))}
                </HeroStatsGrid>
                {resumeSection && resumeSectionLabel ? (
                  <HeroResumeBlock>
                    <HeroResumeLabel>Saved place</HeroResumeLabel>
                    <HeroResumeLink href={`#${getPostSectionAnchor(resumeSection.id)}`}>
                      <HeroResumeTitle>
                        <HeroResumeMeta>Resume reading</HeroResumeMeta>
                        <span>{resumeSectionLabel}</span>
                      </HeroResumeTitle>
                      <HeroResumeArrow aria-hidden="true">{"->"}</HeroResumeArrow>
                    </HeroResumeLink>
                  </HeroResumeBlock>
                ) : null}
              </HeroSnapshotCard>

              <ShareActions article={article} copy={copy} variant="compact" />

              {heroSectionLinks.length ? (
                <HeroSectionNavCard $presentation={presentation}>
                  <HeroSnapshotEyebrow>{heroNavEyebrow}</HeroSnapshotEyebrow>
                  <HeroSnapshotTitle>{heroNavTitle}</HeroSnapshotTitle>
                  <SectionNavList>
                    {heroSectionLinks.map((section, index) => (
                      <SectionNavLink
                        $active={section.id === activeSectionId}
                        aria-current={section.id === activeSectionId ? "location" : undefined}
                        href={`#${getPostSectionAnchor(section.id)}`}
                        key={section.id}
                      >
                        <SectionNavIndex>{`${index + 1}`.padStart(2, "0")}</SectionNavIndex>
                        <SectionNavLabel>
                          {getSectionNavigationLabel(section, copy)}
                        </SectionNavLabel>
                      </SectionNavLink>
                    ))}
                  </SectionNavList>
                </HeroSectionNavCard>
              ) : null}
            </PostHeroAside>
          </PostHeroGrid>
        </PostHeroShell>

        {article.heroImages.length ? (
          inlineGalleryImages.length ? (
            <PostImagePanel $presentation={presentation}>
              {presentation === "atlas" ? (
                <MediaPanelHeader>
                  <MediaPanelTitleGroup>
                    <MediaPanelTitleRow>
                      <MediaPanelTitle>{mediaPanelTitle}</MediaPanelTitle>
                      <MediaPanelCount>{`${inlineGalleryImages.length} visual${inlineGalleryImages.length === 1 ? "" : "s"}`}</MediaPanelCount>
                    </MediaPanelTitleRow>
                    {mediaPanelLead ? <MediaPanelLead>{mediaPanelLead}</MediaPanelLead> : null}
                  </MediaPanelTitleGroup>
                  {mediaPanelMeta ? <MediaPanelMeta>{mediaPanelMeta}</MediaPanelMeta> : null}
                </MediaPanelHeader>
              ) : null}
              <HeroImageGrid $presentation={presentation}>
                {inlineGalleryImages.map((image, index) =>
                  renderInlinePhotoFigure(image, {
                    presentation,
                    priority: index === 0,
                    sizes: "(min-width: 1100px) 50vw, 92vw",
                  }),
                )}
              </HeroImageGrid>
              {linkedHeroImages.length ? (
                <ResourceGroup>
                  <ResourceGroupTitle>Photo resources</ResourceGroupTitle>
                  {renderImageResourceList(linkedHeroImages)}
                </ResourceGroup>
              ) : null}
            </PostImagePanel>
          ) : linkedHeroImages.length ? (
            <FlatResourceStrip>
              <ResourceGroupTitle>Photo resources</ResourceGroupTitle>
              {renderImageResourceList(linkedHeroImages)}
            </FlatResourceStrip>
          ) : null
        ) : null}

        <PostLayout>
          <ArticleColumn>
            <ArticlePaper $presentation={presentation} id="guide-content">
              <ArticleFlow>
                {bodySections.map((section, index) => (
                  <StorySection
                    id={getPostSectionAnchor(section.id)}
                    key={section.id}
                    $tone={getArticleSectionTone(section)}
                  >
                    <StorySectionHeader>
                      <StorySectionMetaRow>
                        <StorySectionIndex>{`${index + 1}`.padStart(2, "0")}</StorySectionIndex>
                        {getArticleSectionLabel(section) ? (
                          <SectionLabel>{getArticleSectionLabel(section)}</SectionLabel>
                        ) : null}
                      </StorySectionMetaRow>
                      <PostSectionTitle>
                        {section.id === "references" ? copy.referencesHeading : section.title}
                      </PostSectionTitle>
                      {getSectionEvidenceSummary(section) ? (
                        <SectionEvidenceNote>{getSectionEvidenceSummary(section)}</SectionEvidenceNote>
                      ) : null}
                    </StorySectionHeader>
                    {renderArticleSection(section, copy, {
                      locale,
                      presentation,
                    })}
                  </StorySection>
                ))}
              </ArticleFlow>
            </ArticlePaper>

            <PostRelatedPanel>
              <SectionHeader>
                <SectionTitle>{copy.relatedPostsTitle}</SectionTitle>
                <SectionDescription>{copy.relatedPostsDescription}</SectionDescription>
              </SectionHeader>
              {article.relatedPosts.length ? (
                <Grid $columns="three">
                  {article.relatedPosts.map((post) => (
                    <PostCard copy={copy} key={post.slug} locale={locale} post={post} />
                  ))}
                </Grid>
              ) : (
                <EmptyState>
                  <EmptyTitle>{copy.emptyStateTitle}</EmptyTitle>
                  <SectionDescription>{copy.emptyStateDescription}</SectionDescription>
                </EmptyState>
              )}
            </PostRelatedPanel>

            <PublicCommentSection article={article} copy={copy} locale={locale} />
          </ArticleColumn>

          <SidebarColumn ref={sidebarColumnRef}>
            {sectionLinks.length ? (
              <SidebarNavigatorPanel>
                <SidebarTitle>Guide navigator</SidebarTitle>
                {activeSectionLabel ? (
                  <SidebarStatusNote>
                    Now reading: <strong>{activeSectionLabel}</strong>
                  </SidebarStatusNote>
                ) : null}
                <SidebarNavigatorBody data-guide-navigator-body="true">
                  <TocList>
                    {sectionLinks.map((section) => (
                      <TocItem $active={section.id === activeSectionId} key={section.id}>
                        <TocLink
                          $active={section.id === activeSectionId}
                          aria-current={section.id === activeSectionId ? "location" : undefined}
                          href={`#${getPostSectionAnchor(section.id)}`}
                          ref={(node) => {
                            if (node) {
                              tocLinkRefs.current.set(section.id, node);
                              return;
                            }

                            tocLinkRefs.current.delete(section.id);
                          }}
                        >
                          {getSectionNavigationLabel(section, copy)}
                        </TocLink>
                      </TocItem>
                    ))}
                  </TocList>
                </SidebarNavigatorBody>
              </SidebarNavigatorPanel>
            ) : null}

          </SidebarColumn>
        </PostLayout>
      </PostScene>
    </PageMain>
  );
}
