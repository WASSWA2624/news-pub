import Link from "next/link";
import styled, { css } from "styled-components";

import AppIcon from "@/components/common/app-icon";
import ResponsiveImage from "@/components/common/responsive-image";
import SearchableSelect from "@/components/common/searchable-select";
import PublicViewTracker from "@/components/analytics/public-view-tracker";
import HomeLatestStories from "@/components/public/home-latest-stories";
import { publicPageUtils } from "@/components/public/public-page-utils";
import ShareActions from "@/components/public/share-actions";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
const {
  createShareLinks,
  estimateReadingMinutes,
  formatDateLabel,
  formatDateTimeLabel,
  formatDisplayText,
  formatProviderLabel,
  getMediaIdentity,
  resolveCompactStoryMedia,
  trimStoryContentHtml,
} = publicPageUtils;

const editorialHeadingStyles = css`
  color: var(--theme-story-ink);
  font-family: var(--font-editorial), Georgia, serif;
  letter-spacing: -0.04em;
`;

const storyLabelStyles = css`
  color: rgba(var(--theme-story-label-rgb), 0.88);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  text-transform: uppercase;
`;

const storyPaperPanelStyles = css`
  background: linear-gradient(
    180deg,
    rgba(var(--theme-story-paper-rgb), 0.94),
    rgba(var(--theme-story-paper-alt-rgb), 0.94)
  );
  border: 1px solid rgba(var(--theme-story-line-rgb), 0.56);
  border-radius: var(--theme-radius-lg);
  box-shadow:
    0 18px 48px rgba(var(--theme-story-ink-rgb), 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.75);
`;

const PageMain = styled.main`
  display: grid;
  gap: clamp(0.9rem, 2.1vw, 1.3rem);
  margin: 0 auto;
  max-width: var(--theme-page-max-width);
  padding: clamp(1rem, 2.3vw, 1.5rem) clamp(0.85rem, 2.2vw, 1.2rem) clamp(1.4rem, 3vw, 2.2rem);
  width: 100%;
`;

const Hero = styled.section`
  background:
    radial-gradient(circle at top left, rgba(var(--theme-story-accent-rgb), 0.16), transparent 34%),
    radial-gradient(circle at 85% 20%, rgba(var(--theme-accent-rgb), 0.18), transparent 28%),
    linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.98), rgba(var(--theme-bg-rgb), 0.94));
  border: 1px solid rgba(var(--theme-border-rgb), 0.72);
  border-radius: var(--theme-radius-md);
  box-shadow:
    0 10px 22px rgba(var(--theme-primary-rgb), 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  display: grid;
  gap: 0.22rem;
  padding: clamp(0.56rem, 1.4vw, 0.72rem);
`;

const Eyebrow = styled.p`
  color: rgba(var(--theme-story-accent-rgb), 0.9);
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  color: var(--theme-text);
  font-size: clamp(1.15rem, 2.7vw, 1.6rem);
  letter-spacing: -0.035em;
  line-height: 1.05;
  margin: 0;
  max-width: none;
`;

const Description = styled.p`
  color: rgba(var(--theme-muted-rgb), 0.95);
  font-size: clamp(0.74rem, 1.4vw, 0.82rem);
  line-height: 1.4;
  margin: 0;
  max-width: none;
`;

const SummaryGrid = styled.div`
  display: grid;
  gap: 0.3rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const SummaryCard = styled.article`
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  display: grid;
  gap: 0.04rem;
  padding: 0.34rem 0.46rem;
`;

const SummaryCardHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 0.4rem;
`;

const SummaryIconBadge = styled.span`
  align-items: center;
  background: rgba(var(--theme-primary-rgb), 0.08);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.12);
  border-radius: 0;
  color: var(--theme-primary);
  display: inline-flex;
  flex: 0 0 auto;
  height: 1.8rem;
  justify-content: center;
  width: 1.8rem;

  svg {
    display: block;
    height: 0.84rem;
    width: 0.84rem;
  }
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
  gap: 0.8rem;

  @media (min-width: 980px) {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  }
`;

const Panel = styled.section`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  box-shadow: 0 18px 42px rgba(18, 34, 58, 0.06);
  display: grid;
  gap: 0.72rem;
  padding: clamp(0.78rem, 1.9vw, 1rem);
`;

const SectionTitle = styled.h2`
  color: #1a2946;
  font-size: 1.25rem;
  letter-spacing: -0.03em;
  margin: 0;
`;

const SectionTitleRow = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.46rem;

  svg {
    display: block;
    height: 1rem;
    width: 1rem;
  }
`;

const HeroTitleRow = styled.span`
  align-items: center;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  svg {
    display: block;
    height: 1.05rem;
    width: 1.05rem;
  }
`;

const StoryGrid = styled.div`
  display: grid;
  gap: 0.72rem;
`;

const StoryCard = styled.article`
  background:
    linear-gradient(180deg, rgba(252, 253, 255, 0.98), rgba(246, 249, 255, 0.94)),
    radial-gradient(circle at top right, rgba(11, 107, 139, 0.08), transparent 48%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  display: grid;
  gap: ${({ $hasMedia }) => ($hasMedia ? "0.62rem" : "0.26rem")};
  overflow: hidden;
`;

const StoryImageWrap = styled.div`
  background: linear-gradient(180deg, rgba(17, 43, 67, 0.04), rgba(17, 43, 67, 0.08));
  aspect-ratio: 16 / 9;
  border-radius: 0;
  min-height: 210px;
  overflow: hidden;
  position: relative;
`;

const StoryImage = styled(ResponsiveImage)`
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
  color: rgba(92, 71, 43, 0.82);
  font-family: var(--font-ui), "Segoe UI", sans-serif;
  font-size: 0.8rem;
  line-height: 1.55;
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
  font-size: 0.8rem;
  gap: 0.35rem 0.6rem;
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
  -webkit-line-clamp: 1;
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

const StoryBody = styled.div`
  display: grid;
  gap: ${({ $compact }) => ($compact ? "0.42rem" : "0.58rem")};
  padding: ${({ $compact }) => ($compact ? "0.62rem 0.72rem 0.72rem" : "0.78rem 0.82rem 0.86rem")};
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
  gap: 0.32rem 0.56rem;
`;

const MetaBadge = styled.span`
  align-items: center;
  color: rgba(53, 71, 99, 0.9);
  display: inline-flex;
  font-size: 0.74rem;
  font-weight: 700;
  gap: 0.28rem;

  svg {
    display: block;
    height: 0.82rem;
    width: 0.82rem;
  }
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
`;

const ChipLink = styled(Link)`
  background: rgba(15, 103, 133, 0.08);
  border: 1px solid rgba(15, 103, 133, 0.12);
  border-radius: 0;
  color: #0d6685;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.28rem 0.58rem;
`;

const SidebarList = styled.div`
  display: grid;
  gap: 0.56rem;
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
  gap: 0.5rem;
  justify-content: space-between;
`;

const PaginationLink = styled(Link)`
  background: rgba(16, 32, 51, 0.04);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  color: #152744;
  font-weight: 700;
  padding: 0.44rem 0.76rem;
`;

const SearchForm = styled.form`
  display: grid;
  gap: 0.56rem;

  @media (min-width: 620px) {
    grid-template-columns: minmax(0, 1fr) minmax(180px, 220px) auto;
  }
`;

const SearchField = styled.label`
  align-items: center;
  background: white;
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 0;
  display: flex;
  gap: 0.46rem;
  min-height: 42px;
  padding: 0 0.76rem;

  &:focus-within {
    border-color: rgba(var(--theme-primary-rgb), 0.4);
    box-shadow: 0 0 0 4px rgba(var(--theme-primary-rgb), 0.08);
  }
`;

const SearchFieldIcon = styled.span`
  color: rgba(var(--theme-primary-rgb), 0.78);
  display: inline-flex;
  flex: 0 0 auto;

  svg {
    display: block;
    height: 0.9rem;
    width: 0.9rem;
  }
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  flex: 1 1 auto;
  min-height: 100%;
  padding: 0;

  &:focus {
    outline: none;
  }
`;

const SearchSelect = styled(SearchableSelect)`
  width: 100%;

  button {
    border-radius: 0;
    min-height: 42px;
    padding: 0.52rem 0.7rem;
  }
`;

const ActionButton = styled.button`
  align-items: center;
  background: linear-gradient(135deg, #0f6e8d 0%, #0b5871 100%);
  border: none;
  border-radius: 0;
  color: white;
  cursor: pointer;
  display: inline-flex;
  font-weight: 800;
  gap: 0.38rem;
  justify-content: center;
  min-height: 42px;
  padding: 0.6rem 0.88rem;

  svg {
    display: block;
    height: 0.9rem;
    width: 0.9rem;
  }
`;

const StoryHero = styled(Hero)`
  background:
    radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.14), transparent 28%),
    linear-gradient(
      180deg,
      rgba(var(--theme-story-paper-rgb), 0.98),
      rgba(var(--theme-story-paper-alt-rgb), 0.98)
    ),
    repeating-linear-gradient(
      180deg,
      rgba(var(--theme-story-line-rgb), 0.16) 0,
      rgba(var(--theme-story-line-rgb), 0.16) 1px,
      transparent 1px,
      transparent 34px
    );
  border: 1px solid rgba(var(--theme-story-line-rgb), 0.64);
  border-radius: var(--theme-radius-lg);
  box-shadow:
    0 26px 70px rgba(var(--theme-story-ink-rgb), 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  gap: clamp(1rem, 2.4vw, 1.45rem);
  overflow: hidden;
  padding: clamp(0.9rem, 2.3vw, 1.4rem);
  position: relative;

  &::before {
    background: linear-gradient(
      90deg,
      rgba(var(--theme-story-ink-rgb), 0.82),
      rgba(var(--theme-story-accent-rgb), 0.5),
      transparent
    );
    content: "";
    height: 3px;
    left: clamp(0.9rem, 2.3vw, 1.4rem);
    position: absolute;
    right: clamp(0.9rem, 2.3vw, 1.4rem);
    top: 0;
  }
`;

const StoryHeroBar = styled.div`
  align-items: center;
  border-bottom: 1px solid rgba(var(--theme-story-line-rgb), 0.72);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.4rem 0.68rem;
  padding-bottom: 0.72rem;
`;

const StoryHeroStatus = styled.div`
  align-items: center;
  color: rgba(var(--theme-story-muted-rgb), 0.92);
  display: inline-flex;
  font-size: 0.76rem;
  font-weight: 700;
  gap: 0.55rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const StoryStatusDot = styled.span`
  background: linear-gradient(135deg, var(--theme-accent) 0%, var(--theme-story-accent) 100%);
  border-radius: 0;
  box-shadow: 0 0 0 5px rgba(var(--theme-accent-rgb), 0.16);
  display: inline-flex;
  height: 0.52rem;
  width: 0.52rem;
`;

const StoryBreadcrumbs = styled.nav`
  align-items: center;
  color: rgba(var(--theme-story-muted-rgb), 0.92);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  gap: 0.45rem;
  text-transform: uppercase;
`;

const StoryBreadcrumbLink = styled(Link)`
  color: var(--theme-story-accent);
`;

const StoryBreadcrumbCurrent = styled.span`
  color: rgba(var(--theme-story-muted-rgb), 0.72);
`;

const StoryHeroLayout = styled.div`
  display: grid;
  gap: 1.05rem;

  @media (min-width: 1040px) {
    align-items: start;
    gap: 1.4rem;
    grid-template-columns: minmax(0, 1.9fr) minmax(250px, 330px);
  }
`;

const StoryHeroContent = styled.div`
  display: grid;
  gap: 0.72rem;
  min-width: 0;
`;

const StorySourceBadge = styled(Eyebrow)`
  align-items: center;
  color: rgba(var(--theme-story-accent-rgb), 0.92);
  display: inline-flex;
  font-size: 0.7rem;
  gap: 0.3rem;
  justify-self: start;
  letter-spacing: 0.22em;
  padding: 0;

  svg {
    display: block;
    height: 0.9rem;
    width: 0.9rem;
  }
`;

const StoryTitle = styled.h1`
  ${editorialHeadingStyles}
  font-size: clamp(2rem, 4.2vw, 3.8rem);
  font-weight: 700;
  line-height: 0.95;
  margin: 0;
  max-width: none;
  text-wrap: pretty;
`;

const StoryLead = styled.p`
  color: rgba(var(--theme-story-muted-rgb), 0.96);
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.16rem, 1.95vw, 1.45rem);
  font-style: italic;
  line-height: 1.6;
  margin: 0;
  max-width: none;
  text-wrap: pretty;
`;

const StoryBylineRow = styled.div`
  align-items: center;
  color: rgba(var(--theme-story-muted-rgb), 0.88);
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem 0.58rem;
  font-size: 0.88rem;
  line-height: 1.5;
`;

const StoryBylineItem = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.4rem;

  strong {
    color: var(--theme-story-ink);
    font-weight: 800;
  }

  svg {
    display: block;
    height: 0.9rem;
    width: 0.9rem;
  }
`;

const StoryActionRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const StoryActionLink = styled.a`
  align-items: center;
  background: ${({ $secondary }) =>
    $secondary
      ? "rgba(var(--theme-story-accent-rgb), 0.06)"
      : "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-story-accent) 100%)"};
  border: 1px solid
    ${({ $secondary }) =>
      $secondary ? "rgba(var(--theme-story-accent-rgb), 0.14)" : "rgba(var(--theme-primary-rgb), 0.18)"};
  border-radius: 0;
  color: ${({ $secondary }) => ($secondary ? "var(--theme-story-accent)" : "#fffaf2")};
  display: inline-flex;
  font-size: 0.82rem;
  font-weight: 800;
  gap: 0.34rem;
  line-height: 1;
  padding: 0.62rem 0.84rem;
  text-decoration: none;

  svg {
    display: block;
    height: 0.88rem;
    width: 0.88rem;
  }
`;

const StoryMetaGrid = styled.div`
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(var(--theme-story-line-rgb), 0.48);
  border-radius: var(--theme-radius-lg);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  display: grid;
  gap: 0.58rem;
  padding: 0.72rem 0.8rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
`;

const StoryMetaCard = styled.article`
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(var(--theme-story-line-rgb), 0.38);
  border-radius: var(--theme-radius-md);
  display: grid;
  gap: 0.16rem;
  padding: 0.54rem 0.62rem;
`;

const StoryMetaLabel = styled.span`
  ${storyLabelStyles}
  align-items: center;
  display: inline-flex;
  font-weight: 700;
  gap: 0.26rem;

  svg {
    display: block;
    height: 0.84rem;
    width: 0.84rem;
  }
`;

const StoryMetaValue = styled.span`
  ${editorialHeadingStyles}
  font-size: 1.12rem;
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
`;

const StoryTagRow = styled(ChipRow)`
  gap: 0.42rem;
`;

const StoryTag = styled(ChipLink)`
  background: rgba(var(--theme-story-accent-rgb), 0.06);
  border-color: rgba(var(--theme-story-accent-rgb), 0.14);
  color: var(--theme-story-accent);
  padding: 0.3rem 0.64rem;
`;

const StoryHighlightStrip = styled.section`
  background:
    linear-gradient(135deg, var(--theme-story-highlight-from), var(--theme-story-highlight-to)),
    radial-gradient(circle at top right, rgba(255, 214, 132, 0.25), transparent 35%);
  border: 1px solid rgba(var(--theme-story-ink-rgb), 0.16);
  border-radius: var(--theme-radius-lg);
  box-shadow: 0 18px 50px rgba(var(--theme-story-ink-rgb), 0.12);
  color: var(--theme-story-highlight-text);
  display: grid;
  gap: 1rem;
  padding: clamp(1rem, 2.5vw, 1.4rem);

  @media (min-width: 900px) {
    align-items: start;
    gap: 1.25rem;
    grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  }
`;

const StoryHighlightIntro = styled.div`
  display: grid;
  gap: 0.5rem;
`;

const StoryHighlightTitle = styled.h2`
  ${editorialHeadingStyles}
  color: inherit;
  font-size: clamp(1.5rem, 2.8vw, 2rem);
  line-height: 1.05;
  margin: 0;
`;

const StoryHighlightText = styled.p`
  color: rgba(255, 247, 235, 0.88);
  font-size: 0.97rem;
  line-height: 1.72;
  margin: 0;
  max-width: none;
`;

const StoryHighlightGrid = styled.div`
  display: grid;
  gap: 0.75rem;

  @media (min-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StoryHighlightCard = styled.div`
  background: rgba(255, 247, 235, 0.08);
  border: 1px solid rgba(255, 239, 214, 0.12);
  border-radius: var(--theme-radius-md);
  display: grid;
  gap: 0.3rem;
  padding: 0.85rem 0.95rem;
`;

const StoryHighlightLabel = styled.span`
  color: rgba(255, 241, 219, 0.72);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const StoryHighlightValue = styled.span`
  ${editorialHeadingStyles}
  color: var(--theme-story-highlight-text);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
`;

const StoryHeroAside = styled.aside`
  ${storyPaperPanelStyles}
  display: grid;
  gap: 1rem;
  min-width: 0;
  padding: 1.1rem;

  @media (max-width: 1039px) {
    padding: 1rem;
  }
`;

const StoryHeroAsideTitle = styled.h2`
  ${editorialHeadingStyles}
  font-size: 1.45rem;
  line-height: 1.12;
  margin: 0;
`;

const StoryHeroAsideText = styled.p`
  color: rgba(var(--theme-story-muted-rgb), 0.9);
  font-size: 0.88rem;
  line-height: 1.6;
  margin: 0;
`;

const StoryFactList = styled.div`
  display: grid;
  gap: 0.8rem;
`;

const StoryFact = styled.div`
  border-top: 1px solid rgba(var(--theme-story-line-rgb), 0.54);
  display: grid;
  gap: 0.25rem;
  padding-top: 0.75rem;

  &:first-child {
    border-top: none;
    padding-top: 0;
  }
`;

const StoryFactLabel = styled.span`
  ${storyLabelStyles}
  font-weight: 700;
`;

const StoryFactValue = styled.span`
  ${editorialHeadingStyles}
  font-size: 1.14rem;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
`;

const StoryLayout = styled.div`
  border-top: 1px solid rgba(var(--theme-story-line-rgb), 0.72);
  display: grid;
  gap: 1.5rem;
  padding-top: 1.55rem;

  @media (min-width: 1040px) {
    align-items: start;
    gap: 2rem;
    grid-template-columns: minmax(0, 1.85fr) minmax(250px, 320px);
  }
`;

const StoryMainColumn = styled.div`
  display: grid;
  gap: 1.5rem;
  min-width: 0;
`;

const StorySidebar = styled.aside`
  display: grid;
  gap: 1rem;
  min-width: 0;

  @media (min-width: 1040px) {
    position: sticky;
    top: 1.3rem;
  }
`;

const StoryImagePanel = styled.div`
  ${storyPaperPanelStyles}
  display: grid;
  gap: 0.55rem;
  overflow: hidden;
  padding: 0.8rem;
`;

const StoryMediaPanel = styled.section`
  display: grid;
  gap: 0.85rem;
`;

const StorySectionHeader = styled.div`
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  justify-content: space-between;
`;

const StorySectionLead = styled.p`
  color: rgba(var(--theme-story-muted-rgb), 0.9);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
  max-width: none;
`;

const StoryContentPanel = styled.section`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(var(--theme-story-paper-alt-rgb), 0.98)),
    repeating-linear-gradient(
      180deg,
      rgba(var(--theme-story-line-rgb), 0.14) 0,
      rgba(var(--theme-story-line-rgb), 0.14) 1px,
      transparent 1px,
      transparent 34px
    );
  border: 1px solid rgba(var(--theme-story-line-rgb), 0.58);
  border-radius: var(--theme-radius-lg);
  box-shadow:
    0 24px 60px rgba(var(--theme-story-ink-rgb), 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  display: grid;
  gap: 1rem;
  overflow: hidden;
  padding: clamp(1.15rem, 3vw, 2rem);
  position: relative;

  &::before {
    background: linear-gradient(
      90deg,
      rgba(var(--theme-story-ink-rgb), 0.84),
      rgba(var(--theme-story-accent-rgb), 0.42),
      transparent
    );
    content: "";
    height: 2px;
    left: clamp(1.15rem, 3vw, 2rem);
    position: absolute;
    right: clamp(1.15rem, 3vw, 2rem);
    top: 0;
  }
`;

const StorySectionKicker = styled.p`
  ${storyLabelStyles}
  letter-spacing: 0.22em;
`;

const StoryContentIntro = styled.div`
  display: grid;
  gap: 0.45rem;
`;

const StoryDateline = styled.p`
  color: rgba(var(--theme-story-muted-rgb), 0.88);
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.7rem;
  line-height: 1.6;
  margin: 0;
`;

const StoryDatelineSource = styled.span`
  color: var(--theme-story-ink);
  font-weight: 800;
`;

const StoryReadingFrame = styled.div`
  display: grid;
  gap: 1rem;
`;

const StoryReadingHeader = styled.div`
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem 1rem;
  justify-content: space-between;
`;

const StoryReadingTitleGroup = styled.div`
  display: grid;
  gap: 0.45rem;
`;

const StoryReadingTitle = styled.h2`
  ${editorialHeadingStyles}
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  line-height: 1.04;
  margin: 0;
`;

const StoryReadingText = styled.p`
  color: rgba(var(--theme-story-muted-rgb), 0.9);
  font-size: 0.95rem;
  line-height: 1.65;
  margin: 0;
  max-width: none;
`;

const StoryReadingBadge = styled.span`
  align-items: center;
  background: rgba(var(--theme-story-accent-rgb), 0.06);
  border: 1px solid rgba(var(--theme-story-accent-rgb), 0.12);
  border-radius: var(--theme-radius-lg, 2px);
  color: var(--theme-story-accent);
  display: inline-flex;
  font-size: 0.75rem;
  font-weight: 800;
  gap: 0.32rem;
  letter-spacing: 0.12em;
  min-height: 2.4rem;
  padding: 0.4rem 0.85rem;
  text-transform: uppercase;

  svg {
    display: block;
    height: 0.88rem;
    width: 0.88rem;
  }
`;

const StoryMediaGallery = styled.div`
  display: grid;
  gap: 0.9rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StoryContent = styled.div`
  color: rgba(var(--theme-story-ink-rgb), 0.96);
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.12rem, 1.7vw, 1.28rem);
  line-height: 1.92;
  margin: 0;
  max-width: var(--theme-reading-max-width);
  overflow: hidden;

  > :first-child {
    margin-top: 0;
  }

  > article > section:first-of-type p:first-of-type::first-letter,
  > article > p:first-of-type::first-letter,
  > p:first-of-type::first-letter {
    color: var(--theme-story-accent);
    float: left;
    font-size: 3.65em;
    font-weight: 700;
    line-height: 0.8;
    margin: 0.08em 0.12em 0 0;
  }

  article,
  header,
  section {
    background: transparent;
  }

  figure {
    margin: 1.5rem 0;
  }

  img {
    border: 1px solid rgba(var(--theme-story-line-rgb), 0.56);
    border-radius: var(--theme-radius-md);
    display: block;
    max-width: 100%;
  }

  figcaption {
    color: rgba(var(--theme-story-muted-rgb), 0.82);
    font-family: var(--font-ui), "Segoe UI", sans-serif;
    font-size: 0.86rem;
    line-height: 1.55;
    margin-top: 0.6rem;
  }

  p {
    margin: 0 0 1.35rem;
    text-wrap: pretty;
  }

  section + section {
    border-top: 1px solid rgba(var(--theme-story-line-rgb), 0.56);
    margin-top: 1.8rem;
    padding-top: 1.45rem;
  }

  h2,
  h3 {
    ${editorialHeadingStyles}
    line-height: 1.12;
    margin: 2.1rem 0 0.95rem;
  }

  h2 {
    font-size: clamp(1.6rem, 2.7vw, 2.05rem);
  }

  h3 {
    font-size: clamp(1.2rem, 2.1vw, 1.52rem);
  }

  ul,
  ol {
    margin: 0 0 1.35rem 1.35rem;
    padding: 0;
  }

  li + li {
    margin-top: 0.6rem;
  }

  blockquote {
    background: linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.98), rgba(var(--theme-story-paper-alt-rgb), 0.98));
    border-left: 4px solid rgba(var(--theme-story-accent-rgb), 0.72);
    border-radius: 0;
    color: rgba(var(--theme-story-ink-rgb), 0.92);
    margin: 1.45rem 0;
    padding: 1.05rem 1.15rem;
  }

  a {
    color: var(--theme-story-accent);
    text-decoration-thickness: 1px;
    text-underline-offset: 0.16em;
  }
`;

const StoryRailSection = styled.section`
  ${storyPaperPanelStyles}
  display: grid;
  gap: 0.7rem;
  min-width: 0;
  padding: 1rem;
`;

const StoryRailTitle = styled.h2`
  ${editorialHeadingStyles}
  font-size: 1.35rem;
  line-height: 1.1;
  margin: 0;
`;

const StoryRailText = styled.p`
  color: rgba(var(--theme-story-muted-rgb), 0.88);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
`;

const StoryRelatedList = styled.div`
  display: grid;
  gap: 0.8rem;
`;

const StoryRelatedCard = styled(Link)`
  background: rgba(255, 255, 255, 0.54);
  border: 1px solid rgba(var(--theme-story-line-rgb), 0.36);
  border-radius: var(--theme-radius-md);
  color: var(--theme-story-ink);
  display: grid;
  gap: 0.32rem;
  padding: 0.8rem 0.9rem;
`;

const StoryRelatedEyebrow = styled.span`
  color: rgba(var(--theme-story-label-rgb), 0.76);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const StoryShareGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const StoryShareLink = styled.a`
  align-items: center;
  background: rgba(var(--theme-story-accent-rgb), 0.06);
  border: 1px solid rgba(var(--theme-story-accent-rgb), 0.14);
  border-radius: 0;
  color: var(--theme-story-accent);
  display: inline-flex;
  font-size: 0.8rem;
  font-weight: 700;
  gap: 0.32rem;
  padding: 0.42rem 0.76rem;

  svg {
    display: block;
    height: 0.84rem;
    width: 0.84rem;
  }
`;

const StorySourceLink = styled.a`
  color: var(--theme-story-ink);
  display: grid;
  gap: 0.28rem;
`;

const StorySourceUrl = styled.span`
  color: rgba(var(--theme-story-muted-rgb), 0.84);
  font-size: 0.86rem;
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
            fill
            priority={eager}
            sizes="(min-width: 1040px) 70vw, 100vw"
            src={media.url}
          />
        )}
      </StoryImageWrap>
      {showCaption && media.caption ? <StoryMediaCaption>{media.caption}</StoryMediaCaption> : null}
    </>
  );
}

function HomeStoryList({ emptyLabel, items = [], locale }) {
  if (!items.length) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }

  return (
    <CompactStoryList>
      {items.map((item) => {
        const media = resolveCompactStoryMedia(item);
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
              {item.summary ? <CompactStoryExcerpt>{item.summary}</CompactStoryExcerpt> : null}
              <CompactStoryReadMore href={item.path}>
                Read more
                <AppIcon name="arrow-right" size={13} />
              </CompactStoryReadMore>
            </CompactStoryBody>
          </CompactStoryRow>
        );
      })}
    </CompactStoryList>
  );
}

function StoryList({ emptyLabel, items = [], locale }) {
  return <HomeStoryList emptyLabel={emptyLabel} items={items} locale={locale} />;
}

/**
 * Renders the localized public home page with featured and latest stories.
 *
 * @param {object} props - Page copy and data payload.
 * @returns {JSX.Element} The public home page.
 */
export function PublicHomePage({ locale, messages, pageContent, pageData }) {
  const common = messages.common || {};

  return (
    <PageMain>
      <PublicViewTracker eventType="WEBSITE_VIEW" locale={locale} />
      <Hero>
        {pageContent.eyebrow ? <Eyebrow>{pageContent.eyebrow}</Eyebrow> : null}
        <Title>
          <HeroTitleRow>
            <AppIcon name="news" size={18} />
            <span>{pageContent.title}</span>
          </HeroTitleRow>
        </Title>
        <Description>{pageContent.description}</Description>
        <SummaryGrid>
          <SummaryCard>
            <SummaryCardHeader>
              <SummaryIconBadge>
                <AppIcon name="news" size={14} />
              </SummaryIconBadge>
              <SummaryLabel>{common.resultsLabel || "Published stories"}</SummaryLabel>
            </SummaryCardHeader>
            <SummaryValue>{pageData.summary.publishedStoryCount}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryCardHeader>
              <SummaryIconBadge>
                <AppIcon name="tag" size={14} />
              </SummaryIconBadge>
              <SummaryLabel>{common.topCategoriesTitle || "Top categories"}</SummaryLabel>
            </SummaryCardHeader>
            <SummaryValue>{pageData.summary.categoryCount}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryCardHeader>
              <SummaryIconBadge>
                <AppIcon name="clock" size={14} />
              </SummaryIconBadge>
              <SummaryLabel>{common.latestPostsTitle || "Latest stories"}</SummaryLabel>
            </SummaryCardHeader>
            <SummaryValue>{pageData.summary.latestStoryCount ?? pageData.latestStories.length}</SummaryValue>
          </SummaryCard>
        </SummaryGrid>
      </Hero>

      <ContentGrid>
        <div style={{ display: "grid", gap: "1.1rem" }}>
          {pageData.featuredStory ? (
            <Panel>
              <SectionTitle>
                <SectionTitleRow>
                  <AppIcon name="sparkles" size={16} />
                  {pageContent.featuredTitle || "Featured story"}
                </SectionTitleRow>
              </SectionTitle>
              <HomeStoryList
                emptyLabel={common.emptyStateDescription || "Published stories will appear here soon."}
                items={[pageData.featuredStory]}
                locale={locale}
              />
            </Panel>
          ) : null}

          <Panel>
            <SectionTitle>
              <SectionTitleRow>
                <AppIcon name="clock" size={16} />
                {pageContent.latestTitle || common.latestPostsTitle || "Latest stories"}
              </SectionTitleRow>
            </SectionTitle>
            <HomeLatestStories
              emptyLabel={common.emptyStateDescription || "Published stories will appear here soon."}
              initialHasMore={pageData.hasMoreLatestStories}
              initialItems={pageData.latestStories}
              locale={locale}
              requestErrorLabel={common.viewMoreError || "Could not load more stories right now."}
              viewMoreLabel={common.viewMoreAction || "View more"}
            />
          </Panel>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <Panel>
            <SectionTitle>
              <SectionTitleRow>
                <AppIcon name="tag" size={16} />
                {pageContent.discoveryTitle || common.topCategoriesTitle || "Top categories"}
              </SectionTitleRow>
            </SectionTitle>
            <SidebarList>
              {pageData.topCategories.map((category) => (
                <SidebarLink href={category.path} key={category.slug}>
                  <SidebarTitle>
                    <span aria-hidden="true">{category.logoEmoji || "📰"}</span> {category.name}
                  </SidebarTitle>
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

/**
 * Renders a public listing view for categories, search results, and archives.
 *
 * @param {object} props - Collection data, filters, and copy.
 * @returns {JSX.Element} The public collection page.
 */
export function PublicCollectionPage({
  collectionCountry = "all",
  collectionSlug = "all",
  collectionView = "",
  entity = null,
  locale,
  messages,
  pageContent,
  pageData,
  query = "",
  searchFilters = {},
  showSearch = false,
}) {
  const common = messages.common || {};
  const countryOptions = Array.isArray(searchFilters.countries) ? searchFilters.countries : [];
  const searchPath = buildLocalizedPath(locale, publicRouteSegments.search);
  const countryFilterOptions = [
    {
      label: common.allCountriesOption || "All countries",
      value: "all",
    },
    ...countryOptions,
  ];

  return (
    <PageMain>
      <PublicViewTracker
        eventType={showSearch ? "SEARCH_VIEW" : "PAGE_VIEW"}
        locale={locale}
      />
      <Hero>
        <Eyebrow>{pageContent.eyebrow || "Published stories"}</Eyebrow>
        <Title>
          <HeroTitleRow>
            {entity?.name ? (
              <span aria-hidden="true">{entity.logoEmoji || "📰"}</span>
            ) : (
              <AppIcon name={showSearch ? "search" : "news"} size={18} />
            )}
            <span>{entity?.name || pageContent.title}</span>
          </HeroTitleRow>
        </Title>
        <Description>{entity?.description || pageContent.description}</Description>
      </Hero>

      <Panel>
        {showSearch ? (
          <SearchForm action={searchPath} method="get">
            <SearchField>
              <SearchFieldIcon aria-hidden="true">
                <AppIcon name="search" size={14} />
              </SearchFieldIcon>
              <SearchInput
                defaultValue={query}
                name="q"
                placeholder={common.searchPlaceholder || "Search published stories"}
              />
            </SearchField>
            <SearchSelect
              aria-label={common.countryFilterLabel || "Filter by country"}
              defaultValue={collectionCountry}
              key={`country-filter-${collectionCountry}`}
              name="country"
              options={countryFilterOptions}
              placeholder={common.countryFilterLabel || "Filter by country"}
              searchPlaceholder={common.countryFilterLabel || "Filter by country"}
            />
            <ActionButton type="submit">
              <AppIcon name="search" size={14} />
              {common.searchAction || "Search"}
            </ActionButton>
          </SearchForm>
        ) : null}

        <HomeLatestStories
          collectionCountry={collectionCountry}
          collectionSlug={collectionSlug}
          collectionView={collectionView}
          emptyLabel={common.emptyStateDescription || "Published stories will appear here soon."}
          initialHasMore={Boolean(pageData?.pagination?.hasNextPage)}
          initialItems={pageData.items}
          initialPage={pageData?.pagination?.currentPage || 1}
          locale={locale}
          mode="collection"
          query={query}
          requestErrorLabel={common.viewMoreError || "Could not load more stories right now."}
          viewMoreLabel={common.viewMoreAction || "View more"}
        />
      </Panel>
    </PageMain>
  );
}

/**
 * Renders a full public article page with editorial metadata, media, and related links.
 *
 * @param {object} props - Story data and localized copy.
 * @returns {JSX.Element} The public story page.
 */
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
  const articleTitle = formatDisplayText(article.title, article.slug);
  const articleSummary = formatDisplayText(article.summary, article.title);
  const articleSourceName = formatDisplayText(article.sourceName, "News source");
  const articleProviderLabel =
    formatProviderLabel(article.providerKey) || formatProviderLabel(article.sourceName) || "NewsPub";
  const articlePrimaryCategory =
    article.categories?.[0] ? formatDisplayText(article.categories[0].name, article.categories[0].slug) : "General";
  const articleCategoryCount = article.categories?.length || 0;
  const shareLinks = createShareLinks(articleTitle, article.canonicalUrl);
  const storyBodyHtml = trimStoryContentHtml(article.contentHtml);

  return (
    <PageMain>
      <PublicViewTracker eventType="POST_VIEW" locale={locale} postId={article.id} />
      <StoryHero>
        <StoryHeroBar>
          <StoryBreadcrumbs aria-label="Breadcrumb">
            <StoryBreadcrumbLink href={buildLocalizedPath(locale, publicRouteSegments.home)}>
              Home
            </StoryBreadcrumbLink>
            <AppIcon name="chevron-right" size={13} />
            <StoryBreadcrumbLink href={newsPath}>
              News
            </StoryBreadcrumbLink>
            <AppIcon name="chevron-right" size={13} />
            <StoryBreadcrumbCurrent>{article.sourceName}</StoryBreadcrumbCurrent>
          </StoryBreadcrumbs>
          <StoryHeroStatus>
            <StoryStatusDot aria-hidden="true" />
            <AppIcon name="badge-check" size={14} />
            Published story
          </StoryHeroStatus>
        </StoryHeroBar>

        <StoryHeroLayout>
          <StoryHeroContent>
            <StorySourceBadge>
              <AppIcon name="news" size={14} />
              {articleSourceName}
            </StorySourceBadge>
            <StoryTitle>{articleTitle}</StoryTitle>
            <StoryLead>{articleSummary}</StoryLead>

            <StoryBylineRow>
              <StoryBylineItem>
                <AppIcon name="news" size={14} />
                <strong>{articleSourceName}</strong>
              </StoryBylineItem>
              {publishedLabel ? (
                <StoryBylineItem>
                  <AppIcon name="calendar" size={14} />
                  {publishedLabel}
                </StoryBylineItem>
              ) : null}
              <StoryBylineItem>
                <AppIcon name="clock" size={14} />
                {readingMinutes} min read
              </StoryBylineItem>
              {updatedLabel ? (
                <StoryBylineItem>
                  <AppIcon name="refresh" size={14} />
                  {common.updatedLabel || "Updated"} {updatedLabel}
                </StoryBylineItem>
              ) : null}
            </StoryBylineRow>

            <StoryActionRow>
              {article.sourceUrl ? (
                <StoryActionLink href={article.sourceUrl} rel="noreferrer" target="_blank">
                  <AppIcon name="external-link" size={14} />
                  Read original source
                </StoryActionLink>
              ) : null}
              <StoryActionLink $secondary href="#story-content">
                <AppIcon name="arrow-right" size={14} />
                Jump to article
              </StoryActionLink>
            </StoryActionRow>

            <StoryMetaGrid>
              {publishedLabel ? (
                <StoryMetaCard>
                  <StoryMetaLabel>
                    <AppIcon name="calendar" size={13} />
                    {common.publishedLabel || "Published"}
                  </StoryMetaLabel>
                  <StoryMetaValue>{publishedLabel}</StoryMetaValue>
                </StoryMetaCard>
              ) : null}
              {updatedLabel ? (
                <StoryMetaCard>
                  <StoryMetaLabel>
                    <AppIcon name="refresh" size={13} />
                    {common.updatedLabel || "Updated"}
                  </StoryMetaLabel>
                  <StoryMetaValue>{updatedLabel}</StoryMetaValue>
                </StoryMetaCard>
              ) : null}
              <StoryMetaCard>
                <StoryMetaLabel>
                  <AppIcon name="clock" size={13} />
                  Reading time
                </StoryMetaLabel>
                <StoryMetaValue>{readingMinutes} min read</StoryMetaValue>
              </StoryMetaCard>
              <StoryMetaCard>
                <StoryMetaLabel>
                  <AppIcon name="tag" size={13} />
                  Filed under
                </StoryMetaLabel>
                <StoryMetaValue>{articlePrimaryCategory}</StoryMetaValue>
              </StoryMetaCard>
            </StoryMetaGrid>

            {article.categories?.length ? (
              <StoryTagRow>
                {article.categories.map((category) => (
                  <StoryTag href={category.path} key={category.slug}>
                    <span aria-hidden="true">{category.logoEmoji || "📰"}</span>{" "}
                    {formatDisplayText(category.name, category.slug)}
                  </StoryTag>
                ))}
              </StoryTagRow>
            ) : null}
          </StoryHeroContent>

          <StoryHeroAside>
            <StoryContentIntro>
              <StoryHeroAsideTitle>Edition notes</StoryHeroAsideTitle>
              <StoryHeroAsideText>
                Source, filing, and timing details stay close so the story reads like a finished front-page piece.
              </StoryHeroAsideText>
            </StoryContentIntro>

            <StoryFactList>
              <StoryFact>
                <StoryFactLabel>Source</StoryFactLabel>
                <StoryFactValue>{articleSourceName}</StoryFactValue>
              </StoryFact>
              {updatedLabel ? (
                <StoryFact>
                  <StoryFactLabel>{common.updatedLabel || "Updated"}</StoryFactLabel>
                  <StoryFactValue>{updatedLabel}</StoryFactValue>
                </StoryFact>
              ) : null}
              <StoryFact>
                <StoryFactLabel>Categories</StoryFactLabel>
                <StoryFactValue>{articleCategoryCount} topics</StoryFactValue>
              </StoryFact>
              <StoryFact>
                <StoryFactLabel>Provider</StoryFactLabel>
                <StoryFactValue>{articleProviderLabel}</StoryFactValue>
              </StoryFact>
            </StoryFactList>
          </StoryHeroAside>
        </StoryHeroLayout>

        {primaryMedia ? (
          <StoryMediaPanel>
            <StoryImagePanel>{renderStoryMedia(primaryMedia, { eager: true })}</StoryImagePanel>
          </StoryMediaPanel>
        ) : null}

        <StoryLayout>
          <StoryMainColumn>
            <StoryHighlightStrip>
              <StoryHighlightIntro>
                <StorySectionKicker>At a glance</StorySectionKicker>
                <StoryHighlightTitle>Fast context before you dive into the full report.</StoryHighlightTitle>
                <StoryHighlightText>
                  This page is arranged for quick scanning first, then deep reading: source, timing, topic, and the
                  full article all stay visible without making the layout feel crowded.
                </StoryHighlightText>
              </StoryHighlightIntro>
              <StoryHighlightGrid>
                <StoryHighlightCard>
                  <StoryHighlightLabel>Primary topic</StoryHighlightLabel>
                  <StoryHighlightValue>{articlePrimaryCategory}</StoryHighlightValue>
                </StoryHighlightCard>
                <StoryHighlightCard>
                  <StoryHighlightLabel>Published</StoryHighlightLabel>
                  <StoryHighlightValue>{publishedLabel || "Recently"}</StoryHighlightValue>
                </StoryHighlightCard>
                <StoryHighlightCard>
                  <StoryHighlightLabel>Source</StoryHighlightLabel>
                  <StoryHighlightValue>{articleSourceName}</StoryHighlightValue>
                </StoryHighlightCard>
                <StoryHighlightCard>
                  <StoryHighlightLabel>Reading time</StoryHighlightLabel>
                  <StoryHighlightValue>{readingMinutes} min read</StoryHighlightValue>
                </StoryHighlightCard>
              </StoryHighlightGrid>
            </StoryHighlightStrip>

            <StoryContentPanel>
              <StoryReadingFrame id="story-content">
                <StoryReadingHeader>
                  <StoryReadingTitleGroup>
                    <StorySectionKicker>Full report</StorySectionKicker>
                <StoryReadingTitle>{articleTitle}</StoryReadingTitle>
                <StoryReadingText>{articleSummary}</StoryReadingText>
              </StoryReadingTitleGroup>
                  <StoryReadingBadge>
                    <AppIcon name="sparkles" size={14} />
                    {articleProviderLabel}
                  </StoryReadingBadge>
                </StoryReadingHeader>
                <StoryContentIntro>
                  <StoryDateline>
                    <StoryDatelineSource>{articleSourceName}</StoryDatelineSource>
                    {publishedLabel ? <span>{publishedLabel}</span> : null}
                    {updatedLabel ? <span>{common.updatedLabel || "Updated"} {updatedLabel}</span> : null}
                  </StoryDateline>
                </StoryContentIntro>
                <StoryContent dangerouslySetInnerHTML={{ __html: storyBodyHtml }} />
              </StoryReadingFrame>
            </StoryContentPanel>

            {additionalMedia.length ? (
              <StoryMediaPanel>
                <StorySectionHeader>
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <StorySectionKicker>Gallery</StorySectionKicker>
                    <SectionTitle>
                      <SectionTitleRow>
                        <AppIcon name="image" size={16} />
                        Additional media
                      </SectionTitleRow>
                    </SectionTitle>
                  </div>
                  <StorySectionLead>
                    Supporting visuals stay grouped here so the main reading column can remain focused and calm.
                  </StorySectionLead>
                </StorySectionHeader>
                <StoryMediaGallery>
                  {additionalMedia.map((media) => (
                    <StoryImagePanel key={getMediaIdentity(media)}>
                      {renderStoryMedia(media)}
                    </StoryImagePanel>
                  ))}
                </StoryMediaGallery>
              </StoryMediaPanel>
            ) : null}
          </StoryMainColumn>

          <StorySidebar>
            <StoryRailSection>
              <StoryRailTitle>
                <SectionTitleRow>
                  <AppIcon name="external-link" size={16} />
                  {common.referencesHeading || "Source attribution"}
                </SectionTitleRow>
              </StoryRailTitle>
              <SidebarList>
                {article.sourceUrl ? (
                  <StorySourceLink href={article.sourceUrl} rel="noreferrer" target="_blank">
                    <SidebarTitle>{articleSourceName}</SidebarTitle>
                    <StorySourceUrl>{article.sourceUrl}</StorySourceUrl>
                  </StorySourceLink>
                ) : (
                  <SidebarTitle>{articleSourceName}</SidebarTitle>
                )}
              </SidebarList>
              <StoryRailText>{article.sourceAttribution || "Original source details for this article."}</StoryRailText>
            </StoryRailSection>

            {shareLinks.length ? (
              <StoryRailSection>
                <StoryRailTitle>
                  <SectionTitleRow>
                    <AppIcon name="share" size={16} />
                    {common.shareTitle || "Share this story"}
                  </SectionTitleRow>
                </StoryRailTitle>
                <StoryRailText>{common.shareDescription || "Share this story with your audience."}</StoryRailText>
                <StoryShareGrid>
                  {shareLinks.map((link) => (
                    <StoryShareLink href={link.href} key={link.label} rel="noreferrer" target="_blank">
                      <AppIcon name="link" size={13} />
                      {link.label}
                    </StoryShareLink>
                  ))}
                </StoryShareGrid>
              </StoryRailSection>
            ) : null}

              <StoryRailSection>
                <StoryRailTitle>
                  <SectionTitleRow>
                    <AppIcon name="news" size={16} />
                    {common.relatedPostsTitle || "Related stories"}
                  </SectionTitleRow>
                </StoryRailTitle>
                <StoryRailText>More coverage connected by source or category so the next read is easy to pick.</StoryRailText>
                <StoryRelatedList>
                  <HomeStoryList
                    emptyLabel={common.emptyStateDescription || "More stories will appear here soon."}
                    items={pageData.relatedStories}
                    locale={locale}
                  />
                </StoryRelatedList>
            </StoryRailSection>
          </StorySidebar>
        </StoryLayout>
      </StoryHero>
    </PageMain>
  );
}

/**
 * Renders a static informational page inside the shared public shell.
 *
 * @param {object} props - Static page locale and content sections.
 * @returns {JSX.Element} The rendered public static page.
 */
export function PublicStaticPage({ locale, pageContent }) {
  return (
    <PageMain>
      <PublicViewTracker eventType="PAGE_VIEW" locale={locale} />
      <Hero>
        <Eyebrow>{pageContent.eyebrow}</Eyebrow>
        <Title>
          <HeroTitleRow>
            <AppIcon name="info" size={18} />
            <span>{pageContent.title}</span>
          </HeroTitleRow>
        </Title>
        <Description>{pageContent.description}</Description>
      </Hero>

      <Panel>
        {(pageContent.sections || []).map((section) => (
          <LegalSection key={section.title}>
            <SectionTitle>
              <SectionTitleRow>
                <AppIcon name="file-text" size={16} />
                {section.title}
              </SectionTitleRow>
            </SectionTitle>
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
