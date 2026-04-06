import Link from "next/link";
import styled from "styled-components";

import PublicViewTracker from "@/components/analytics/public-view-tracker";
import ShareActions from "@/components/public/share-actions";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";

function formatDateLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function buildHref(pathname, searchParams = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    params.set(key, `${value}`);
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function stripHtmlTags(value) {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function estimateReadingMinutes(value) {
  const words = stripHtmlTags(value).split(" ").filter(Boolean).length;

  return Math.max(1, Math.round(words / 190));
}

const PageMain = styled.main`
  display: grid;
  gap: clamp(1.2rem, 2.8vw, 1.8rem);
  margin: 0 auto;
  max-width: 1260px;
  padding: clamp(1.35rem, 3vw, 2.1rem) clamp(1rem, 3vw, 1.5rem) clamp(2rem, 4vw, 3rem);
  width: 100%;
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top left, rgba(11, 107, 139, 0.18), transparent 34%),
    radial-gradient(circle at 85% 20%, rgba(251, 195, 61, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.94));
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 14px;
  box-shadow:
    0 10px 22px rgba(16, 32, 51, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  display: grid;
  gap: 0.3rem;
  padding: clamp(0.7rem, 1.8vw, 0.9rem);
`;

const Eyebrow = styled.p`
  color: rgba(14, 88, 121, 0.8);
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  color: #182742;
  font-size: clamp(1.15rem, 2.7vw, 1.6rem);
  letter-spacing: -0.035em;
  line-height: 1.05;
  margin: 0;
  max-width: none;

  @media (max-width: 720px) {
    max-width: 18ch;
  }
`;

const Description = styled.p`
  color: rgba(71, 84, 108, 0.95);
  font-size: clamp(0.74rem, 1.4vw, 0.82rem);
  line-height: 1.4;
  margin: 0;
  max-width: 72ch;
`;

const SummaryGrid = styled.div`
  display: grid;
  gap: 0.4rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const SummaryCard = styled.article`
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 10px;
  display: grid;
  gap: 0.08rem;
  padding: 0.42rem 0.55rem;
`;

const SummaryValue = styled.strong`
  color: #132949;
  font-size: 0.82rem;
`;

const SummaryLabel = styled.span`
  color: rgba(74, 88, 113, 0.82);
  font-size: 0.66rem;
`;

const ContentGrid = styled.div`
  display: grid;
  gap: 1.1rem;

  @media (min-width: 980px) {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  }
`;

const Panel = styled.section`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 18px;
  box-shadow: 0 18px 42px rgba(18, 34, 58, 0.06);
  display: grid;
  gap: 1rem;
  padding: clamp(1rem, 2.3vw, 1.35rem);
`;

const SectionTitle = styled.h2`
  color: #1a2946;
  font-size: 1.25rem;
  letter-spacing: -0.03em;
  margin: 0;
`;

const StoryGrid = styled.div`
  display: grid;
  gap: 0.95rem;
`;

const StoryCard = styled.article`
  background:
    linear-gradient(180deg, rgba(252, 253, 255, 0.98), rgba(246, 249, 255, 0.94)),
    radial-gradient(circle at top right, rgba(11, 107, 139, 0.08), transparent 48%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 14px;
  display: grid;
  gap: ${({ $hasMedia }) => ($hasMedia ? "0.8rem" : "0.35rem")};
  overflow: hidden;
`;

const StoryImageWrap = styled.div`
  background: linear-gradient(180deg, rgba(17, 43, 67, 0.04), rgba(17, 43, 67, 0.08));
  aspect-ratio: 16 / 9;
  min-height: 210px;
  overflow: hidden;
  position: relative;
`;

const StoryImage = styled.img`
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
`;

const StoryVideo = styled.video`
  background: #091525;
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
`;

const StoryEmbed = styled.iframe`
  background: #091525;
  border: 0;
  display: block;
  height: 100%;
  width: 100%;
`;

const StoryMediaCaption = styled.p`
  color: rgba(72, 85, 110, 0.84);
  font-size: 0.75rem;
  line-height: 1.45;
  margin: 0;
`;

const StoryBody = styled.div`
  display: grid;
  gap: ${({ $compact }) => ($compact ? "0.55rem" : "0.75rem")};
  padding: ${({ $compact }) => ($compact ? "0.8rem 0.9rem 0.9rem" : "1rem 1rem 1.05rem")};
`;

const StoryTitleLink = styled(Link)`
  color: #152744;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
`;

const StorySummary = styled.p`
  color: rgba(72, 85, 110, 0.95);
  font-size: 0.92rem;
  line-height: 1.52;
  margin: 0;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
`;

const MetaBadge = styled.span`
  color: rgba(53, 71, 99, 0.9);
  font-size: 0.74rem;
  font-weight: 700;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const ChipLink = styled(Link)`
  background: rgba(15, 103, 133, 0.08);
  border: 1px solid rgba(15, 103, 133, 0.12);
  border-radius: 999px;
  color: #0d6685;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.28rem 0.58rem;
`;

const SidebarList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const SidebarLink = styled(Link)`
  color: #152744;
  display: grid;
  gap: 0.22rem;
`;

const SidebarTitle = styled.span`
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const SidebarMeta = styled.span`
  color: rgba(72, 85, 110, 0.88);
  font-size: 0.88rem;
`;

const EmptyState = styled.p`
  color: rgba(72, 85, 110, 0.9);
  line-height: 1.6;
  margin: 0;
`;

const PaginationRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: space-between;
`;

const PaginationLink = styled(Link)`
  background: rgba(16, 32, 51, 0.04);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 999px;
  color: #152744;
  font-weight: 700;
  padding: 0.55rem 0.95rem;
`;

const SearchForm = styled.form`
  display: grid;
  gap: 0.75rem;

  @media (min-width: 620px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }
`;

const SearchInput = styled.input`
  background: white;
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 12px;
  min-height: 48px;
  padding: 0.8rem 0.95rem;
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #0f6e8d 0%, #0b5871 100%);
  border: none;
  border-radius: 999px;
  color: white;
  cursor: pointer;
  font-weight: 800;
  min-height: 48px;
  padding: 0.75rem 1.1rem;
`;

const StoryHero = styled(Hero)`
  background:
    radial-gradient(circle at top left, rgba(11, 107, 139, 0.18), transparent 30%),
    radial-gradient(circle at 86% 20%, rgba(251, 195, 61, 0.16), transparent 26%),
    linear-gradient(135deg, rgba(245, 249, 255, 0.98), rgba(255, 252, 245, 0.92));
  border-radius: 28px;
  gap: clamp(1rem, 2.6vw, 1.45rem);
  overflow: hidden;
  padding: clamp(1.1rem, 3vw, 1.55rem);
  position: relative;

  &::before {
    background: linear-gradient(90deg, rgba(15, 103, 133, 0.18), rgba(15, 103, 133, 0));
    content: "";
    height: 1px;
    left: clamp(1.1rem, 3vw, 1.55rem);
    position: absolute;
    right: clamp(1.1rem, 3vw, 1.55rem);
    top: 4.2rem;
  }
`;

const StoryHeroBar = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  justify-content: space-between;
  position: relative;
  z-index: 1;
`;

const StoryBreadcrumbs = styled.nav`
  align-items: center;
  color: rgba(62, 78, 102, 0.88);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.82rem;
  gap: 0.45rem;
`;

const StoryBreadcrumbLink = styled(Link)`
  color: #174b61;
  font-weight: 700;
`;

const StoryBreadcrumbCurrent = styled.span`
  color: rgba(62, 78, 102, 0.82);
`;

const StoryHeroLayout = styled.div`
  display: grid;
  gap: 1.1rem;
  position: relative;
  z-index: 1;

  @media (min-width: 1040px) {
    align-items: start;
    gap: 1.4rem;
    grid-template-columns: minmax(0, 1.45fr) minmax(260px, 320px);
  }
`;

const StoryHeroContent = styled.div`
  display: grid;
  gap: 1rem;
`;

const StorySourceBadge = styled(Eyebrow)`
  align-items: center;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(15, 103, 133, 0.12);
  border-radius: 999px;
  display: inline-flex;
  justify-self: start;
  padding: 0.42rem 0.72rem;
`;

const StoryTitle = styled.h1`
  color: #172744;
  font-size: clamp(2.1rem, 4.6vw, 3.85rem);
  letter-spacing: -0.055em;
  line-height: 0.95;
  margin: 0;
  max-width: 14ch;
`;

const StoryLead = styled.p`
  color: rgba(69, 82, 106, 0.96);
  font-size: clamp(1.02rem, 2.05vw, 1.2rem);
  line-height: 1.78;
  margin: 0;
  max-width: 60ch;
`;

const StoryMetaGrid = styled.div`
  display: grid;
  gap: 0.7rem;

  @media (min-width: 620px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const StoryMetaCard = styled.article`
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
  display: grid;
  gap: 0.18rem;
  min-height: 88px;
  padding: 0.85rem 0.95rem;
`;

const StoryMetaLabel = styled.span`
  color: rgba(73, 88, 112, 0.85);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const StoryMetaValue = styled.span`
  color: #172744;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
`;

const StoryTagRow = styled(ChipRow)`
  gap: 0.55rem;
`;

const StoryTag = styled(ChipLink)`
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(15, 103, 133, 0.14);
  color: #125c76;
  padding: 0.4rem 0.78rem;
`;

const StoryHeroAside = styled.aside`
  background:
    linear-gradient(180deg, rgba(18, 39, 68, 0.98), rgba(15, 36, 64, 0.94)),
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 42%);
  border-radius: 24px;
  box-shadow: 0 22px 44px rgba(17, 35, 61, 0.18);
  color: rgba(234, 240, 248, 0.92);
  display: grid;
  gap: 1rem;
  padding: 1.15rem 1.15rem 1.2rem;
`;

const StoryHeroAsideTitle = styled.h2`
  color: white;
  font-size: 1.15rem;
  letter-spacing: -0.03em;
  line-height: 1.08;
  margin: 0;
`;

const StoryHeroAsideText = styled.p`
  color: rgba(228, 235, 244, 0.84);
  font-size: 0.92rem;
  line-height: 1.65;
  margin: 0;
`;

const StoryFactList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const StoryFact = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  display: grid;
  gap: 0.18rem;
  padding-top: 0.75rem;
`;

const StoryFactLabel = styled.span`
  color: rgba(188, 202, 220, 0.74);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const StoryFactValue = styled.span`
  color: white;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.42;
`;

const StoryLayout = styled.div`
  display: grid;
  gap: 1.2rem;

  @media (min-width: 1040px) {
    align-items: start;
    gap: 1.25rem;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 340px);
  }
`;

const StoryMainColumn = styled.div`
  display: grid;
  gap: 1.1rem;
`;

const StorySidebar = styled.aside`
  display: grid;
  gap: 1rem;

  @media (min-width: 1040px) {
    position: sticky;
    top: 1rem;
  }
`;

const StoryImagePanel = styled.div`
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(240, 245, 252, 0.94));
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 22px;
  overflow: hidden;
  padding: 0.65rem;
`;

const StoryMediaPanel = styled(Panel)`
  gap: 0.9rem;
`;

const StoryContentPanel = styled(Panel)`
  gap: 1.1rem;
  padding: clamp(1.15rem, 2.6vw, 1.55rem);
`;

const StorySectionKicker = styled.p`
  color: rgba(15, 103, 133, 0.84);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const StoryMediaGallery = styled.div`
  display: grid;
  gap: 0.9rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StoryContentIntro = styled.div`
  display: grid;
  gap: 0.45rem;
`;

const StoryContentHeading = styled.h2`
  color: #162845;
  font-size: clamp(1.35rem, 2.8vw, 1.8rem);
  letter-spacing: -0.04em;
  line-height: 1.04;
  margin: 0;
`;

const StoryContent = styled.div`
  color: #263750;
  font-size: clamp(1rem, 1.45vw, 1.08rem);
  line-height: 1.9;
  max-width: 70ch;
  overflow: hidden;

  > :first-child {
    margin-top: 0;
  }

  > p:first-of-type::first-letter {
    color: #132949;
    float: left;
    font-size: 3.5em;
    font-weight: 800;
    line-height: 0.84;
    margin: 0.12em 0.12em 0 0;
  }

  p {
    margin: 0 0 1.15rem;
  }

  h2,
  h3 {
    color: #142641;
    letter-spacing: -0.04em;
    line-height: 1.12;
    margin: 2rem 0 0.85rem;
  }

  h2 {
    font-size: clamp(1.4rem, 2.5vw, 1.8rem);
  }

  h3 {
    font-size: clamp(1.12rem, 2vw, 1.32rem);
  }

  ul,
  ol {
    margin: 0 0 1.2rem 1.3rem;
    padding: 0;
  }

  li + li {
    margin-top: 0.45rem;
  }

  blockquote {
    background: linear-gradient(180deg, rgba(244, 248, 253, 0.98), rgba(251, 252, 255, 0.92));
    border-left: 4px solid rgba(15, 103, 133, 0.7);
    border-radius: 0 18px 18px 0;
    color: #17304c;
    margin: 1.35rem 0;
    padding: 1rem 1.05rem;
  }

  a {
    color: #0c6987;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.16em;
  }
`;

const StorySourceLink = styled.a`
  color: #152744;
  display: grid;
  gap: 0.22rem;
`;

const StorySourceUrl = styled.span`
  color: rgba(72, 85, 110, 0.88);
  font-size: 0.88rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

const LegalSection = styled.article`
  display: grid;
  gap: 0.75rem;
`;

const SectionBody = styled.div`
  color: rgba(69, 82, 106, 0.95);
  display: grid;
  gap: 0.7rem;
  line-height: 1.7;

  p,
  ul {
    margin: 0;
  }

  ul {
    padding-left: 1.2rem;
  }
`;

function getMediaIdentity(media) {
  return `${media?.kind || "unknown"}:${media?.embedUrl || media?.url || media?.sourceUrl || ""}`;
}

function renderStoryMedia(media, { eager = false, showCaption = true } = {}) {
  if (!media?.kind) {
    return null;
  }

  return (
    <>
      <StoryImageWrap>
        {media.kind === "video" ? (
          <StoryVideo
            controls
            playsInline
            poster={media.posterUrl || undefined}
            preload="metadata"
            src={media.url}
          />
        ) : media.kind === "embed" ? (
          <StoryEmbed
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading={eager ? "eager" : "lazy"}
            referrerPolicy="strict-origin-when-cross-origin"
            src={media.embedUrl}
            title={media.title || media.alt || "Embedded video"}
          />
        ) : (
          <StoryImage
            alt={media.alt || media.caption || "Story media"}
            loading={eager ? "eager" : "lazy"}
            src={media.url}
          />
        )}
      </StoryImageWrap>
      {showCaption && media.caption ? <StoryMediaCaption>{media.caption}</StoryMediaCaption> : null}
    </>
  );
}

function StoryList({ emptyLabel, items = [], locale }) {
  if (!items.length) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }

  return (
    <StoryGrid>
      {items.map((item) => {
        const primaryMedia = item.primaryMedia || (item.image?.url ? { ...item.image, kind: "image" } : null);

        return (
          <StoryCard $hasMedia={Boolean(primaryMedia)} key={item.id}>
            {primaryMedia ? renderStoryMedia(primaryMedia) : null}
            <StoryBody $compact={!primaryMedia}>
              <MetaRow>
                {item.publishedAt ? <MetaBadge>{formatDateLabel(locale, item.publishedAt)}</MetaBadge> : null}
                <MetaBadge>{item.sourceName}</MetaBadge>
              </MetaRow>
              <StoryTitleLink href={item.path}>{item.title}</StoryTitleLink>
              <StorySummary>{item.summary}</StorySummary>
              {item.categories?.length ? (
                <ChipRow>
                  {item.categories.map((category) => (
                    <ChipLink href={category.path} key={category.slug}>
                      {category.name}
                    </ChipLink>
                  ))}
                </ChipRow>
              ) : null}
            </StoryBody>
          </StoryCard>
        );
      })}
    </StoryGrid>
  );
}

export function PublicHomePage({ locale, messages, pageContent, pageData }) {
  const common = messages.common || {};

  return (
    <PageMain>
      <PublicViewTracker eventType="WEBSITE_VIEW" locale={locale} />
      <Hero>
        {pageContent.eyebrow ? <Eyebrow>{pageContent.eyebrow}</Eyebrow> : null}
        <Title>{pageContent.title}</Title>
        <Description>{pageContent.description}</Description>
        <SummaryGrid>
          <SummaryCard>
            <SummaryValue>{pageData.summary.publishedStoryCount}</SummaryValue>
            <SummaryLabel>{common.resultsLabel || "Published stories"}</SummaryLabel>
          </SummaryCard>
          <SummaryCard>
            <SummaryValue>{pageData.summary.categoryCount}</SummaryValue>
            <SummaryLabel>{common.topCategoriesTitle || "Top categories"}</SummaryLabel>
          </SummaryCard>
          <SummaryCard>
            <SummaryValue>{pageData.latestStories.length + (pageData.featuredStory ? 1 : 0)}</SummaryValue>
            <SummaryLabel>{common.latestPostsTitle || "Latest stories"}</SummaryLabel>
          </SummaryCard>
        </SummaryGrid>
      </Hero>

      <ContentGrid>
        <div style={{ display: "grid", gap: "1.1rem" }}>
          {pageData.featuredStory ? (
            <Panel>
              <SectionTitle>{pageContent.featuredTitle || "Featured story"}</SectionTitle>
              <StoryList items={[pageData.featuredStory]} locale={locale} />
            </Panel>
          ) : null}

          <Panel>
            <SectionTitle>{pageContent.latestTitle || common.latestPostsTitle || "Latest stories"}</SectionTitle>
            <StoryList
              emptyLabel={common.emptyStateDescription || "Published stories will appear here soon."}
              items={pageData.latestStories}
              locale={locale}
            />
          </Panel>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <Panel>
            <SectionTitle>{pageContent.discoveryTitle || common.topCategoriesTitle || "Top categories"}</SectionTitle>
            <SidebarList>
              {pageData.topCategories.map((category) => (
                <SidebarLink href={category.path} key={category.slug}>
                  <SidebarTitle>{category.name}</SidebarTitle>
                  <SidebarMeta>
                    {category.count} {(common.resultsLabel || "stories").toLowerCase()}
                  </SidebarMeta>
                </SidebarLink>
              ))}
            </SidebarList>
          </Panel>

          {pageData.featuredStory ? (
            <ShareActions
              compact
              description={common.shareDescription || "Share this story with your audience."}
              heading={common.shareTitle || "Share"}
              shareTitle={pageData.featuredStory.title}
              url={pageData.featuredStory.path}
            />
          ) : null}
        </div>
      </ContentGrid>
    </PageMain>
  );
}

export function PublicCollectionPage({
  entity = null,
  locale,
  messages,
  pageContent,
  pageData,
  pathname,
  query = {},
  showSearch = false,
}) {
  const common = messages.common || {};

  return (
    <PageMain>
      <PublicViewTracker
        eventType={showSearch ? "SEARCH_VIEW" : "PAGE_VIEW"}
        locale={locale}
      />
      <Hero>
        <Eyebrow>{pageContent.eyebrow || "Published stories"}</Eyebrow>
        <Title>{entity?.name || pageContent.title}</Title>
        <Description>{entity?.description || pageContent.description}</Description>
      </Hero>

      <Panel>
        {showSearch ? (
          <SearchForm action={pathname} method="get">
            <SearchInput
              defaultValue={query.q || ""}
              name="q"
              placeholder={common.searchPlaceholder || "Search published stories"}
            />
            <ActionButton type="submit">{common.searchAction || "Search"}</ActionButton>
          </SearchForm>
        ) : null}

        <StoryList
          emptyLabel={common.emptyStateDescription || "Published stories will appear here soon."}
          items={pageData.items}
          locale={locale}
        />

        <PaginationRow>
          <MetaBadge>
            {pageData.pagination.startItem}-{pageData.pagination.endItem} / {pageData.pagination.totalItems}
          </MetaBadge>
          <MetaRow>
            {pageData.pagination.hasPreviousPage ? (
              <PaginationLink
                href={buildHref(pathname, {
                  ...query,
                  page: pageData.pagination.currentPage - 1,
                })}
              >
                {common.previousPage || "Previous"}
              </PaginationLink>
            ) : null}
            {pageData.pagination.hasNextPage ? (
              <PaginationLink
                href={buildHref(pathname, {
                  ...query,
                  page: pageData.pagination.currentPage + 1,
                })}
              >
                {common.nextPage || "Next"}
              </PaginationLink>
            ) : null}
          </MetaRow>
        </PaginationRow>
      </Panel>
    </PageMain>
  );
}

export function PublicStoryPage({ locale, messages, pageData }) {
  const common = messages.common || {};
  const article = pageData.article;
  const primaryMedia = article.primaryMedia || (article.image?.url ? { ...article.image, kind: "image" } : null);
  const additionalMedia = (article.media || []).filter(
    (media) => getMediaIdentity(media) !== getMediaIdentity(primaryMedia),
  );
  const publishedLabel = formatDateLabel(locale, article.publishedAt);
  const updatedLabel = formatDateLabel(locale, article.updatedAt);
  const readingMinutes = estimateReadingMinutes(article.contentHtml);
  const newsPath = buildLocalizedPath(locale, publicRouteSegments.news);

  return (
    <PageMain>
      <PublicViewTracker eventType="POST_VIEW" locale={locale} postId={article.id} />
      <StoryHero>
        <StoryHeroBar>
          <StoryBreadcrumbs aria-label="Breadcrumb">
            <StoryBreadcrumbLink href={buildLocalizedPath(locale, publicRouteSegments.home)}>
              Home
            </StoryBreadcrumbLink>
            <span>/</span>
            <StoryBreadcrumbLink href={newsPath}>
              News
            </StoryBreadcrumbLink>
            <span>/</span>
            <StoryBreadcrumbCurrent>{article.sourceName}</StoryBreadcrumbCurrent>
          </StoryBreadcrumbs>
        </StoryHeroBar>

        <StoryHeroLayout>
          <StoryHeroContent>
            <StorySourceBadge>{article.sourceName}</StorySourceBadge>
            <StoryTitle>{article.title}</StoryTitle>
            <StoryLead>{article.summary}</StoryLead>

            <StoryMetaGrid>
              {publishedLabel ? (
                <StoryMetaCard>
                  <StoryMetaLabel>{common.publishedLabel || "Published"}</StoryMetaLabel>
                  <StoryMetaValue>{publishedLabel}</StoryMetaValue>
                </StoryMetaCard>
              ) : null}
              <StoryMetaCard>
                <StoryMetaLabel>Reading time</StoryMetaLabel>
                <StoryMetaValue>{readingMinutes} min read</StoryMetaValue>
              </StoryMetaCard>
              <StoryMetaCard>
                <StoryMetaLabel>Publisher</StoryMetaLabel>
                <StoryMetaValue>{article.providerKey || article.sourceName}</StoryMetaValue>
              </StoryMetaCard>
            </StoryMetaGrid>

            {article.categories?.length ? (
              <StoryTagRow>
                {article.categories.map((category) => (
                  <StoryTag href={category.path} key={category.slug}>
                    {category.name}
                  </StoryTag>
                ))}
              </StoryTagRow>
            ) : null}
          </StoryHeroContent>

          <StoryHeroAside>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <StoryHeroAsideTitle>Story snapshot</StoryHeroAsideTitle>
              <StoryHeroAsideText>
                A cleaner read with source context, timing details, and quick navigation to related coverage.
              </StoryHeroAsideText>
            </div>

            <StoryFactList>
              <StoryFact>
                <StoryFactLabel>Source</StoryFactLabel>
                <StoryFactValue>{article.sourceName}</StoryFactValue>
              </StoryFact>
              {updatedLabel ? (
                <StoryFact>
                  <StoryFactLabel>{common.updatedLabel || "Updated"}</StoryFactLabel>
                  <StoryFactValue>{updatedLabel}</StoryFactValue>
                </StoryFact>
              ) : null}
              <StoryFact>
                <StoryFactLabel>Categories</StoryFactLabel>
                <StoryFactValue>{article.categories?.length || 0} topics</StoryFactValue>
              </StoryFact>
            </StoryFactList>
          </StoryHeroAside>
        </StoryHeroLayout>
      </StoryHero>

      <StoryLayout>
        <StoryMainColumn>
          {primaryMedia ? (
            <StoryMediaPanel>
              <StoryImagePanel>{renderStoryMedia(primaryMedia, { eager: true })}</StoryImagePanel>
            </StoryMediaPanel>
          ) : null}

          {additionalMedia.length ? (
            <StoryMediaPanel>
              <StorySectionKicker>Gallery</StorySectionKicker>
              <SectionTitle>Additional media</SectionTitle>
              <StoryMediaGallery>
                {additionalMedia.map((media) => (
                  <StoryImagePanel key={getMediaIdentity(media)}>
                    {renderStoryMedia(media)}
                  </StoryImagePanel>
                ))}
              </StoryMediaGallery>
            </StoryMediaPanel>
          ) : null}

          <StoryContentPanel>
            <StoryContentIntro>
              <StorySectionKicker>Article</StorySectionKicker>
              <StoryContentHeading>{article.title}</StoryContentHeading>
            </StoryContentIntro>
            <StoryContent dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
          </StoryContentPanel>
        </StoryMainColumn>

        <StorySidebar>
          <Panel>
            <SectionTitle>{common.referencesHeading || "Source attribution"}</SectionTitle>
            <SidebarList>
              {article.sourceUrl ? (
                <StorySourceLink href={article.sourceUrl} rel="noreferrer" target="_blank">
                  <SidebarTitle>{article.sourceName}</SidebarTitle>
                  <StorySourceUrl>{article.sourceUrl}</StorySourceUrl>
                </StorySourceLink>
              ) : (
                <SidebarTitle>{article.sourceName}</SidebarTitle>
              )}
            </SidebarList>
            <EmptyState>{article.sourceAttribution || "Original source details for this article."}</EmptyState>
          </Panel>

          <ShareActions
            compact
            description={common.shareDescription || "Share this story with your audience."}
            heading={common.shareTitle || "Share this story"}
            shareTitle={article.title}
            url={article.canonicalUrl}
          />

          <Panel>
            <SectionTitle>{common.relatedPostsTitle || "Related stories"}</SectionTitle>
            <SidebarList>
              {pageData.relatedStories.length ? (
                pageData.relatedStories.map((story) => (
                  <SidebarLink href={story.path} key={story.id}>
                    <SidebarTitle>{story.title}</SidebarTitle>
                    <SidebarMeta>
                      {story.sourceName}
                      {story.publishedAt ? ` | ${formatDateLabel(locale, story.publishedAt)}` : ""}
                    </SidebarMeta>
                  </SidebarLink>
                ))
              ) : (
                <EmptyState>{common.emptyStateDescription || "More stories will appear here soon."}</EmptyState>
              )}
            </SidebarList>
          </Panel>
        </StorySidebar>
      </StoryLayout>
    </PageMain>
  );
}

export function PublicStaticPage({ locale, pageContent }) {
  return (
    <PageMain>
      <PublicViewTracker eventType="PAGE_VIEW" locale={locale} />
      <Hero>
        <Eyebrow>{pageContent.eyebrow}</Eyebrow>
        <Title>{pageContent.title}</Title>
        <Description>{pageContent.description}</Description>
      </Hero>

      <Panel>
        {(pageContent.sections || []).map((section) => (
          <LegalSection key={section.title}>
            <SectionTitle>{section.title}</SectionTitle>
            <SectionBody>
              {(section.paragraphs || []).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {(section.items || []).length ? (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </SectionBody>
          </LegalSection>
        ))}
      </Panel>
    </PageMain>
  );
}
