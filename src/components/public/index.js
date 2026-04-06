import Link from "next/link";
import styled from "styled-components";

import PublicViewTracker from "@/components/analytics/public-view-tracker";
import HomeLatestStories from "@/components/public/home-latest-stories";
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

function formatDateTimeLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function stripHtmlTags(value) {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

const namedHtmlEntities = Object.freeze({
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
});

function decodeHtmlEntity(entity) {
  const normalizedEntity = `${entity || ""}`.toLowerCase();

  if (namedHtmlEntities[normalizedEntity]) {
    return namedHtmlEntities[normalizedEntity];
  }

  try {
    if (normalizedEntity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalizedEntity.slice(2), 16));
    }

    if (normalizedEntity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalizedEntity.slice(1), 10));
    }
  } catch {
    return null;
  }

  return null;
}

function decodeHtmlEntities(value) {
  if (typeof value !== "string") {
    return "";
  }

  let result = value;

  for (let iteration = 0; iteration < 2; iteration += 1) {
    result = result.replace(/&(#x?[0-9a-f]+|amp|apos|gt|lt|nbsp|quot);/gi, (match, entity) => {
      const decodedValue = decodeHtmlEntity(entity);

      return decodedValue ?? match;
    });
  }

  return result;
}

function formatDisplayText(value, fallback = "") {
  const resolvedValue = decodeHtmlEntities(typeof value === "string" ? value : "");

  return resolvedValue.trim() || fallback;
}

function formatProviderLabel(value) {
  const resolvedValue = formatDisplayText(value);

  if (!resolvedValue) {
    return "";
  }

  return resolvedValue
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function estimateReadingMinutes(value) {
  const words = stripHtmlTags(value).split(" ").filter(Boolean).length;

  return Math.max(1, Math.round(words / 190));
}

function createShareLinks(title, url) {
  const safeTitle = typeof title === "string" && title.trim() ? title.trim() : "NewsPub story";
  const safeUrl = typeof url === "string" && url.trim() ? url.trim() : "";

  if (!safeUrl) {
    return [];
  }

  const encodedTitle = encodeURIComponent(safeTitle);
  const encodedUrl = encodeURIComponent(safeUrl);

  return [
    {
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      label: "X",
    },
    {
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      label: "Facebook",
    },
    {
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
      label: "LinkedIn",
    },
    {
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      label: "WhatsApp",
    },
    {
      href: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${safeTitle}\n\n${safeUrl}`)}`,
      label: "Email",
    },
  ];
}

function trimStoryContentHtml(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/<article>\s*<header>[\s\S]*?<\/header>/i, "<article>")
    .replace(/<section>\s*<h2>Story<\/h2>\s*/i, "<section>")
    .replace(/<section><h2>Categories<\/h2>[\s\S]*?<\/section>/gi, "")
    .replace(/<section><h2>Source Attribution<\/h2>[\s\S]*?<\/section>/gi, "")
    .trim();
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
  border-radius: 18px;
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
    grid-template-columns: minmax(0, 1fr) minmax(180px, 220px) auto;
  }
`;

const SearchInput = styled.input`
  background: white;
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 12px;
  min-height: 48px;
  padding: 0.8rem 0.95rem;
`;

const SearchSelect = styled.select`
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
    radial-gradient(circle at top right, rgba(153, 108, 41, 0.08), transparent 28%),
    linear-gradient(180deg, rgba(255, 253, 249, 0.98), rgba(249, 244, 236, 0.98)),
    repeating-linear-gradient(
      180deg,
      rgba(99, 78, 45, 0.025) 0,
      rgba(99, 78, 45, 0.025) 1px,
      transparent 1px,
      transparent 34px
    );
  border: 1px solid rgba(82, 65, 39, 0.15);
  border-radius: 28px;
  box-shadow:
    0 26px 70px rgba(61, 45, 24, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  gap: clamp(1.35rem, 3vw, 1.95rem);
  overflow: hidden;
  padding: clamp(1.2rem, 3vw, 1.95rem);
  position: relative;

  &::before {
    background: linear-gradient(90deg, rgba(46, 35, 18, 0.82), rgba(131, 92, 33, 0.42), transparent);
    content: "";
    height: 3px;
    left: clamp(1.2rem, 3vw, 1.95rem);
    position: absolute;
    right: clamp(1.2rem, 3vw, 1.95rem);
    top: 0;
  }
`;

const StoryHeroBar = styled.div`
  align-items: center;
  border-bottom: 1px solid rgba(62, 47, 24, 0.14);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.55rem 0.9rem;
  padding-bottom: 1rem;
`;

const StoryHeroStatus = styled.div`
  align-items: center;
  color: rgba(86, 69, 43, 0.82);
  display: inline-flex;
  font-size: 0.76rem;
  font-weight: 700;
  gap: 0.55rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const StoryStatusDot = styled.span`
  background: linear-gradient(135deg, #9d6b20 0%, #6f4b16 100%);
  border-radius: 999px;
  box-shadow: 0 0 0 5px rgba(157, 107, 32, 0.12);
  display: inline-flex;
  height: 0.52rem;
  width: 0.52rem;
`;

const StoryBreadcrumbs = styled.nav`
  align-items: center;
  color: rgba(86, 69, 43, 0.9);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  gap: 0.45rem;
  text-transform: uppercase;
`;

const StoryBreadcrumbLink = styled(Link)`
  color: #533913;
`;

const StoryBreadcrumbCurrent = styled.span`
  color: rgba(86, 69, 43, 0.72);
`;

const StoryHeroLayout = styled.div`
  display: grid;
  gap: 1.5rem;

  @media (min-width: 1040px) {
    align-items: start;
    gap: 2rem;
    grid-template-columns: minmax(0, 1.9fr) minmax(250px, 330px);
  }
`;

const StoryHeroContent = styled.div`
  display: grid;
  gap: 1rem;
  min-width: 0;
`;

const StorySourceBadge = styled(Eyebrow)`
  align-items: center;
  color: rgba(116, 77, 19, 0.92);
  display: inline-flex;
  font-size: 0.7rem;
  justify-self: start;
  letter-spacing: 0.22em;
  padding: 0;
`;

const StoryTitle = styled.h1`
  color: #24180f;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(2.4rem, 4.9vw, 4.5rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 0.95;
  margin: 0;
  max-width: 13ch;
  text-wrap: balance;
`;

const StoryLead = styled.p`
  color: rgba(68, 53, 34, 0.92);
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.16rem, 1.95vw, 1.45rem);
  font-style: italic;
  line-height: 1.6;
  margin: 0;
  max-width: 44rem;
  text-wrap: pretty;
`;

const StoryBylineRow = styled.div`
  align-items: center;
  color: rgba(72, 56, 31, 0.84);
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.8rem;
  font-size: 0.88rem;
  line-height: 1.5;
`;

const StoryBylineItem = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.4rem;

  strong {
    color: #24180f;
    font-weight: 800;
  }
`;

const StoryActionRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
`;

const StoryActionLink = styled.a`
  background: ${({ $secondary }) =>
    $secondary ? "rgba(120, 81, 28, 0.06)" : "linear-gradient(135deg, #764d18 0%, #52340f 100%)"};
  border: 1px solid ${({ $secondary }) => ($secondary ? "rgba(120, 81, 28, 0.14)" : "rgba(82, 52, 15, 0.18)")};
  border-radius: 999px;
  color: ${({ $secondary }) => ($secondary ? "#6d4b19" : "#fffaf2")};
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1;
  padding: 0.8rem 1.05rem;
  text-decoration: none;
`;

const StoryMetaGrid = styled.div`
  background: rgba(255, 250, 242, 0.88);
  border: 1px solid rgba(96, 76, 46, 0.12);
  border-radius: 22px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  display: grid;
  gap: 0.8rem;
  padding: 0.95rem 1rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
`;

const StoryMetaCard = styled.article`
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(96, 76, 46, 0.08);
  border-radius: 16px;
  display: grid;
  gap: 0.22rem;
  padding: 0.7rem 0.8rem;
`;

const StoryMetaLabel = styled.span`
  color: rgba(102, 81, 48, 0.78);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const StoryMetaValue = styled.span`
  color: #24180f;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: 1.12rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  overflow-wrap: anywhere;
`;

const StoryTagRow = styled(ChipRow)`
  gap: 0.6rem;
`;

const StoryTag = styled(ChipLink)`
  background: rgba(120, 81, 28, 0.06);
  border-color: rgba(120, 81, 28, 0.14);
  color: #6d4b19;
  padding: 0.38rem 0.8rem;
`;

const StoryHighlightStrip = styled.section`
  background:
    linear-gradient(135deg, rgba(74, 51, 18, 0.96), rgba(104, 72, 24, 0.94)),
    radial-gradient(circle at top right, rgba(255, 214, 132, 0.25), transparent 35%);
  border: 1px solid rgba(74, 51, 18, 0.16);
  border-radius: 24px;
  box-shadow: 0 18px 50px rgba(61, 45, 24, 0.12);
  color: #fffaf3;
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
  color: inherit;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.5rem, 2.8vw, 2rem);
  letter-spacing: -0.04em;
  line-height: 1.05;
  margin: 0;
`;

const StoryHighlightText = styled.p`
  color: rgba(255, 247, 235, 0.88);
  font-size: 0.97rem;
  line-height: 1.72;
  margin: 0;
  max-width: 58ch;
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
  border-radius: 18px;
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
  color: #fffaf3;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
`;

const StoryHeroAside = styled.aside`
  background: linear-gradient(180deg, rgba(255, 250, 242, 0.9), rgba(249, 243, 233, 0.96));
  border: 1px solid rgba(96, 76, 46, 0.12);
  border-radius: 24px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  display: grid;
  gap: 1rem;
  min-width: 0;
  padding: 1.1rem;

  @media (max-width: 1039px) {
    padding: 1rem;
  }
`;

const StoryHeroAsideTitle = styled.h2`
  color: #24180f;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: 1.45rem;
  letter-spacing: -0.04em;
  line-height: 1.12;
  margin: 0;
`;

const StoryHeroAsideText = styled.p`
  color: rgba(78, 61, 37, 0.86);
  font-size: 0.88rem;
  line-height: 1.6;
  margin: 0;
`;

const StoryFactList = styled.div`
  display: grid;
  gap: 0.8rem;
`;

const StoryFact = styled.div`
  border-top: 1px solid rgba(96, 76, 46, 0.12);
  display: grid;
  gap: 0.25rem;
  padding-top: 0.75rem;

  &:first-child {
    border-top: none;
    padding-top: 0;
  }
`;

const StoryFactLabel = styled.span`
  color: rgba(102, 81, 48, 0.76);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const StoryFactValue = styled.span`
  color: #24180f;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: 1.14rem;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
`;

const StoryLayout = styled.div`
  border-top: 1px solid rgba(96, 76, 46, 0.14);
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
  background: rgba(255, 251, 244, 0.84);
  border: 1px solid rgba(96, 76, 46, 0.12);
  border-radius: 24px;
  box-shadow:
    0 18px 50px rgba(62, 47, 24, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.75);
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
  color: rgba(78, 61, 37, 0.86);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
  max-width: 52ch;
`;

const StoryContentPanel = styled.section`
  background:
    linear-gradient(180deg, rgba(255, 253, 249, 0.98), rgba(250, 244, 235, 0.98)),
    repeating-linear-gradient(
      180deg,
      rgba(99, 78, 45, 0.02) 0,
      rgba(99, 78, 45, 0.02) 1px,
      transparent 1px,
      transparent 34px
    );
  border: 1px solid rgba(96, 76, 46, 0.12);
  border-radius: 28px;
  box-shadow:
    0 24px 60px rgba(61, 45, 24, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  display: grid;
  gap: 1rem;
  overflow: hidden;
  padding: clamp(1.15rem, 3vw, 2rem);
  position: relative;

  &::before {
    background: linear-gradient(90deg, rgba(46, 35, 18, 0.84), rgba(131, 92, 33, 0.42), transparent);
    content: "";
    height: 2px;
    left: clamp(1.15rem, 3vw, 2rem);
    position: absolute;
    right: clamp(1.15rem, 3vw, 2rem);
    top: 0;
  }
`;

const StorySectionKicker = styled.p`
  color: rgba(116, 77, 19, 0.88);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  margin: 0;
  text-transform: uppercase;
`;

const StoryContentIntro = styled.div`
  display: grid;
  gap: 0.45rem;
`;

const StoryDateline = styled.p`
  color: rgba(78, 61, 37, 0.88);
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.7rem;
  line-height: 1.6;
  margin: 0;
`;

const StoryDatelineSource = styled.span`
  color: #24180f;
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
  color: #24180f;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  letter-spacing: -0.04em;
  line-height: 1.04;
  margin: 0;
`;

const StoryReadingText = styled.p`
  color: rgba(78, 61, 37, 0.86);
  font-size: 0.95rem;
  line-height: 1.65;
  margin: 0;
  max-width: 54ch;
`;

const StoryReadingBadge = styled.span`
  align-items: center;
  background: rgba(120, 81, 28, 0.06);
  border: 1px solid rgba(120, 81, 28, 0.12);
  border-radius: 999px;
  color: #6d4b19;
  display: inline-flex;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  min-height: 2.4rem;
  padding: 0.4rem 0.85rem;
  text-transform: uppercase;
`;

const StoryMediaGallery = styled.div`
  display: grid;
  gap: 0.9rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StoryContent = styled.div`
  color: #2b2217;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.12rem, 1.7vw, 1.28rem);
  line-height: 1.92;
  margin: 0 auto;
  max-width: 36em;
  overflow: hidden;

  > :first-child {
    margin-top: 0;
  }

  > article > section:first-of-type p:first-of-type::first-letter,
  > article > p:first-of-type::first-letter,
  > p:first-of-type::first-letter {
    color: #4d3510;
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
    border: 1px solid rgba(96, 76, 46, 0.12);
    border-radius: 18px;
    display: block;
    max-width: 100%;
  }

  figcaption {
    color: rgba(96, 76, 46, 0.8);
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
    border-top: 1px solid rgba(96, 76, 46, 0.12);
    margin-top: 1.8rem;
    padding-top: 1.45rem;
  }

  h2,
  h3 {
    color: #24180f;
    font-family: var(--font-editorial), Georgia, serif;
    letter-spacing: -0.04em;
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
    background: linear-gradient(180deg, rgba(255, 249, 240, 0.98), rgba(250, 241, 229, 0.94));
    border-left: 4px solid rgba(131, 92, 33, 0.72);
    border-radius: 0 22px 22px 0;
    color: #332417;
    margin: 1.45rem 0;
    padding: 1.05rem 1.15rem;
  }

  a {
    color: #7b4d10;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.16em;
  }
`;

const StoryRailSection = styled.section`
  background: linear-gradient(180deg, rgba(255, 251, 244, 0.92), rgba(249, 243, 233, 0.96));
  border: 1px solid rgba(96, 76, 46, 0.12);
  border-radius: 24px;
  box-shadow:
    0 18px 48px rgba(61, 45, 24, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  display: grid;
  gap: 0.7rem;
  min-width: 0;
  padding: 1rem;
`;

const StoryRailTitle = styled.h2`
  color: #24180f;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: 1.35rem;
  letter-spacing: -0.04em;
  line-height: 1.1;
  margin: 0;
`;

const StoryRailText = styled.p`
  color: rgba(78, 61, 37, 0.88);
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
  border: 1px solid rgba(96, 76, 46, 0.08);
  border-radius: 18px;
  color: #24180f;
  display: grid;
  gap: 0.32rem;
  padding: 0.8rem 0.9rem;
`;

const StoryRelatedEyebrow = styled.span`
  color: rgba(102, 81, 48, 0.76);
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
  background: rgba(120, 81, 28, 0.06);
  border: 1px solid rgba(120, 81, 28, 0.14);
  border-radius: 999px;
  color: #6d4b19;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.42rem 0.76rem;
`;

const StorySourceLink = styled.a`
  color: #24180f;
  display: grid;
  gap: 0.28rem;
`;

const StorySourceUrl = styled.span`
  color: rgba(78, 61, 37, 0.84);
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

function StoryList({ emptyLabel, items = [], locale }) {
  return <HomeStoryList emptyLabel={emptyLabel} items={items} locale={locale} />;
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
            <SummaryValue>{pageData.summary.latestStoryCount ?? pageData.latestStories.length}</SummaryValue>
            <SummaryLabel>{common.latestPostsTitle || "Latest stories"}</SummaryLabel>
          </SummaryCard>
        </SummaryGrid>
      </Hero>

      <ContentGrid>
        <div style={{ display: "grid", gap: "1.1rem" }}>
          {pageData.featuredStory ? (
            <Panel>
              <SectionTitle>{pageContent.featuredTitle || "Featured story"}</SectionTitle>
              <HomeStoryList
                emptyLabel={common.emptyStateDescription || "Published stories will appear here soon."}
                items={[pageData.featuredStory]}
                locale={locale}
              />
            </Panel>
          ) : null}

          <Panel>
            <SectionTitle>{pageContent.latestTitle || common.latestPostsTitle || "Latest stories"}</SectionTitle>
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
            <SectionTitle>{pageContent.discoveryTitle || common.topCategoriesTitle || "Top categories"}</SectionTitle>
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

export function PublicCollectionPage({
  collectionCountry = "",
  collectionSlug = "",
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

  return (
    <PageMain>
      <PublicViewTracker
        eventType={showSearch ? "SEARCH_VIEW" : "PAGE_VIEW"}
        locale={locale}
      />
      <Hero>
        <Eyebrow>{pageContent.eyebrow || "Published stories"}</Eyebrow>
        <Title>
          {entity?.name ? <span aria-hidden="true">{entity.logoEmoji || "📰"} </span> : null}
          {entity?.name || pageContent.title}
        </Title>
        <Description>{entity?.description || pageContent.description}</Description>
      </Hero>

      <Panel>
        {showSearch ? (
          <SearchForm action={searchPath} method="get">
            <SearchInput
              defaultValue={query}
              name="q"
              placeholder={common.searchPlaceholder || "Search published stories"}
            />
            <SearchSelect
              aria-label={common.countryFilterLabel || "Filter by country"}
              defaultValue={collectionCountry}
              name="country"
            >
              <option value="">{common.allCountriesOption || "All countries"}</option>
              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.flagEmoji ? `${country.flagEmoji} ` : ""}{country.label}
                </option>
              ))}
            </SearchSelect>
            <ActionButton type="submit">{common.searchAction || "Search"}</ActionButton>
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
            <span>/</span>
            <StoryBreadcrumbLink href={newsPath}>
              News
            </StoryBreadcrumbLink>
            <span>/</span>
            <StoryBreadcrumbCurrent>{article.sourceName}</StoryBreadcrumbCurrent>
          </StoryBreadcrumbs>
          <StoryHeroStatus>
            <StoryStatusDot />
            Published story
          </StoryHeroStatus>
        </StoryHeroBar>

        <StoryHeroLayout>
          <StoryHeroContent>
            <StorySourceBadge>{articleSourceName}</StorySourceBadge>
            <StoryTitle>{articleTitle}</StoryTitle>
            <StoryLead>{articleSummary}</StoryLead>

            <StoryBylineRow>
              <StoryBylineItem>
                <strong>{articleSourceName}</strong>
              </StoryBylineItem>
              {publishedLabel ? <StoryBylineItem>{publishedLabel}</StoryBylineItem> : null}
              <StoryBylineItem>{readingMinutes} min read</StoryBylineItem>
              {updatedLabel ? <StoryBylineItem>{common.updatedLabel || "Updated"} {updatedLabel}</StoryBylineItem> : null}
            </StoryBylineRow>

            <StoryActionRow>
              {article.sourceUrl ? (
                <StoryActionLink href={article.sourceUrl} rel="noreferrer" target="_blank">
                  Read original source
                </StoryActionLink>
              ) : null}
              <StoryActionLink $secondary href="#story-content">
                Jump to article
              </StoryActionLink>
            </StoryActionRow>

            <StoryMetaGrid>
              {publishedLabel ? (
                <StoryMetaCard>
                  <StoryMetaLabel>{common.publishedLabel || "Published"}</StoryMetaLabel>
                  <StoryMetaValue>{publishedLabel}</StoryMetaValue>
                </StoryMetaCard>
              ) : null}
              {updatedLabel ? (
                <StoryMetaCard>
                  <StoryMetaLabel>{common.updatedLabel || "Updated"}</StoryMetaLabel>
                  <StoryMetaValue>{updatedLabel}</StoryMetaValue>
                </StoryMetaCard>
              ) : null}
              <StoryMetaCard>
                <StoryMetaLabel>Reading time</StoryMetaLabel>
                <StoryMetaValue>{readingMinutes} min read</StoryMetaValue>
              </StoryMetaCard>
              <StoryMetaCard>
                <StoryMetaLabel>Filed under</StoryMetaLabel>
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
                  <StoryReadingBadge>{articleProviderLabel}</StoryReadingBadge>
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
                    <SectionTitle>Additional media</SectionTitle>
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
              <StoryRailTitle>{common.referencesHeading || "Source attribution"}</StoryRailTitle>
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
                <StoryRailTitle>{common.shareTitle || "Share this story"}</StoryRailTitle>
                <StoryRailText>{common.shareDescription || "Share this story with your audience."}</StoryRailText>
                <StoryShareGrid>
                  {shareLinks.map((link) => (
                    <StoryShareLink href={link.href} key={link.label} rel="noreferrer" target="_blank">
                      {link.label}
                    </StoryShareLink>
                  ))}
                </StoryShareGrid>
              </StoryRailSection>
            ) : null}

              <StoryRailSection>
                <StoryRailTitle>{common.relatedPostsTitle || "Related stories"}</StoryRailTitle>
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
