import Link from "next/link";
import styled from "styled-components";

import AppIcon from "@/components/common/app-icon";
import NewsPubLogo from "@/components/common/news-pub-logo";
import ResponsiveImage from "@/components/common/responsive-image";
import SiteHeaderMobileControls from "@/components/layout/site-header-mobile-controls";
import SiteHeaderState from "@/components/layout/site-header-state";
import { controlSurfaceCss, elevatedSurfaceCss, focusRingCss } from "@/components/common/ui-surface";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";

const mobileBreakpoint = 980;
const wideBreakpoint = 1240;

const Header = styled.header`
  background:
    linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.985), rgba(var(--theme-bg-rgb), 0.96)),
    radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.1), transparent 34%);
  border-bottom: 1px solid rgba(var(--theme-border-rgb), 0.82);
  box-shadow: 0 10px 24px rgba(var(--theme-primary-rgb), 0.08);
  position: sticky;
  top: 0;
  z-index: 30;
`;

const HeaderInner = styled.div`
  display: grid;
  gap: 0.7rem;
  margin: 0 auto;
  max-width: var(--theme-shell-max-width);
  padding: 0.7rem 0.88rem;

  @media (min-width: ${mobileBreakpoint}px) {
    align-items: start;
    grid-template-columns: auto minmax(0, 1fr);
  }

  @media (min-width: ${wideBreakpoint}px) {
    align-items: center;
    column-gap: 1rem;
    grid-template-columns: auto minmax(0, 1fr) minmax(18rem, 24rem);
  }
`;

const BrandCluster = styled.div`
  display: grid;
  gap: 0.3rem;
`;

const BrandRow = styled.div`
  align-items: center;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
`;

const BrandLink = styled(Link)`
  align-items: center;
  color: var(--theme-text);
  display: inline-flex;
  gap: 0.65rem;
  min-width: 0;
`;

const BrandMark = styled.span`
  align-items: center;
  background: rgba(var(--theme-primary-rgb), 0.08);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.14);
  display: inline-flex;
  padding: 0.18rem;
`;

const BrandLogo = styled(NewsPubLogo)`
  height: 34px;
  width: 34px;
`;

const BrandCopy = styled.span`
  display: grid;
  gap: 0.04rem;
  min-width: 0;
`;

const BrandEyebrow = styled.span`
  color: rgba(var(--theme-primary-rgb), 0.84);
  font-size: 0.48rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  line-height: 1;
  text-transform: uppercase;
`;

const BrandTitle = styled.span`
  font-size: clamp(1rem, 3vw, 1.3rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.96;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HeaderTagline = styled.p`
  color: var(--theme-muted);
  font-size: 0.82rem;
  line-height: 1.4;
  margin: 0;
  max-width: 62ch;

  @media (max-width: ${wideBreakpoint - 1}px) {
    display: none;
  }
`;

const Navigation = styled.nav`
  align-items: center;
  display: none;
  flex-wrap: wrap;
  gap: 0.38rem;

  @media (min-width: ${mobileBreakpoint}px) {
    display: flex;
    grid-column: 1 / -1;
  }

  @media (min-width: ${wideBreakpoint}px) {
    grid-column: auto;
  }
`;

const NavigationLink = styled(Link)`
  align-items: center;
  color: var(--theme-text);
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  gap: 0.28rem;
  min-height: 2rem;
  white-space: nowrap;

  &[data-active="true"] {
    color: var(--theme-primary);
    font-weight: 800;
  }

  &:hover,
  &:focus-visible {
    color: var(--theme-primary);
  }
`;

const Dropdown = styled.details`
  position: relative;
`;

const DropdownSummary = styled.summary`
  ${controlSurfaceCss}
  ${focusRingCss}
  align-items: center;
  color: var(--theme-text);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  gap: 0.3rem;
  list-style: none;
  min-height: 2rem;
  padding: 0 0.68rem;
  white-space: nowrap;

  &[data-active="true"] {
    color: var(--theme-primary);
    font-weight: 800;
  }

  &::-webkit-details-marker {
    display: none;
  }
`;

const DropdownChevron = styled.span`
  display: inline-flex;
  transition: transform 160ms ease;

  ${Dropdown}[open] & {
    transform: rotate(180deg);
  }
`;

const DropdownPanel = styled.div`
  ${elevatedSurfaceCss}
  display: grid;
  gap: 0.18rem;
  max-height: min(62vh, 360px);
  min-width: 260px;
  overflow-y: auto;
  padding: 0.42rem;
  position: absolute;
  top: calc(100% + 0.45rem);
  z-index: 20;
`;

const DropdownLink = styled(Link)`
  align-items: center;
  color: var(--theme-text);
  display: flex;
  font-size: 0.9rem;
  font-weight: 700;
  gap: 0.55rem;
  justify-content: space-between;
  min-height: 2.4rem;
  padding: 0.48rem 0.56rem;

  &:hover {
    background: rgba(var(--theme-primary-rgb), 0.06);
  }
`;

const DropdownLabel = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.45rem;
`;

const DropdownMeta = styled.span`
  color: rgba(var(--theme-text-rgb), 0.62);
  font-size: 0.76rem;
`;

const CountryFlag = styled(ResponsiveImage)`
  border: 1px solid rgba(var(--theme-border-rgb), 0.8);
  display: inline-flex;
  height: 14px;
  object-fit: cover;
  width: 20px;
`;

const SearchWrap = styled.div`
  display: none;

  @media (min-width: ${mobileBreakpoint}px) {
    display: block;
    max-width: 100%;
    width: 100%;
  }
`;

const SearchForm = styled.form`
  align-items: stretch;
  background:
    linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.98), rgba(255, 255, 255, 0.94)),
    radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.08), transparent 48%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.92);
  border-radius: var(--theme-radius-md);
  box-shadow: 0 8px 20px rgba(var(--theme-primary-rgb), 0.06);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  overflow: hidden;
`;

const SearchField = styled.label`
  align-items: center;
  display: flex;
  gap: 0.44rem;
  min-height: 36px;
  padding: 0 0.72rem;
`;

const SearchInputIcon = styled.span`
  color: rgba(var(--theme-primary-rgb), 0.76);
  display: inline-flex;
  flex: 0 0 auto;

  svg {
    display: block;
    height: 0.96rem;
    width: 0.96rem;
  }
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  color: var(--theme-text);
  flex: 1 1 auto;
  font: inherit;
  min-height: 100%;
  padding: 0;
  width: 100%;

  &:focus {
    outline: none;
  }
`;

const SearchButton = styled.button`
  align-items: center;
  background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-story-accent) 100%);
  border: none;
  border-left: 1px solid rgba(var(--theme-primary-rgb), 0.16);
  color: white;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-weight: 700;
  gap: 0.38rem;
  justify-content: center;
  min-height: 36px;
  padding: 0 0.94rem;
`;

function renderDesktopSearchForm({ locale, messages }) {
  const searchCopy = messages.site.searchBar || {};
  const searchHref = buildLocalizedPath(locale, publicRouteSegments.search);

  return (
    <SearchForm action={searchHref} method="get">
      <SearchField>
        <SearchInputIcon aria-hidden="true">
          <AppIcon name="search" size={15} />
        </SearchInputIcon>
        <SearchInput
          aria-label={searchCopy.label || "Search published news"}
          data-public-search-input="true"
          name="q"
          placeholder={searchCopy.placeholder || "Search published stories"}
          type="search"
        />
      </SearchField>
      <SearchButton aria-label={searchCopy.submitAction || "Search"} type="submit">
        <AppIcon name="search" size={14} />
        {searchCopy.submitAction || "Search"}
      </SearchButton>
    </SearchForm>
  );
}

function renderDiscoveryMenu({ discoveryKey, items, label, icon }) {
  if (!items.length) {
    return null;
  }

  return (
    <Dropdown>
      <DropdownSummary data-active="false" data-public-discovery={discoveryKey}>
        <AppIcon name={icon} size={15} />
        {label}
        <DropdownChevron>
          <AppIcon name="chevron-down" size={13} />
        </DropdownChevron>
      </DropdownSummary>
      <DropdownPanel>
        {items.map((item) => (
          <DropdownLink href={item.path} key={item.slug || item.value}>
            <DropdownLabel>
              {item.flagImageUrl ? (
                <CountryFlag
                  alt=""
                  aria-hidden="true"
                  height="14"
                  loading="lazy"
                  sizes="20px"
                  src={item.flagImageUrl}
                  width="20"
                />
              ) : item.flagEmoji ? (
                <span aria-hidden="true">{item.flagEmoji}</span>
              ) : (
                <span aria-hidden="true">{item.logoEmoji || "N"}</span>
              )}
              <span>{item.label || item.name}</span>
            </DropdownLabel>
            <DropdownMeta>{item.count}</DropdownMeta>
          </DropdownLink>
        ))}
      </DropdownPanel>
    </Dropdown>
  );
}

export default function SiteHeader({
  categoryLinks = [],
  countryLinks = [],
  locale,
  messages,
}) {
  const navigation = messages.site.navigation || {};
  const accessibility = messages.site.accessibility || {};
  const legalNavigation = messages.site.legalNavigation || {};
  const homeHref = buildLocalizedPath(locale, publicRouteSegments.home);
  const newsHref = buildLocalizedPath(locale, publicRouteSegments.news);
  const searchHref = buildLocalizedPath(locale, publicRouteSegments.search);
  const aboutHref = buildLocalizedPath(locale, publicRouteSegments.about);
  const disclaimerHref = buildLocalizedPath(locale, publicRouteSegments.disclaimer);
  const privacyHref = buildLocalizedPath(locale, publicRouteSegments.privacy);
  const headerTagline = typeof messages.site.tagline === "string" ? messages.site.tagline.trim() : "";
  const primaryLinks = [
    { href: homeHref, icon: "home", key: "home", label: navigation.home || "Home" },
    { href: newsHref, icon: "news", key: "news", label: navigation.news || "News" },
    { href: searchHref, icon: "search", key: "search", label: navigation.search || "Search" },
    { href: aboutHref, icon: "info", key: "about", label: navigation.about || "About" },
  ];

  return (
    <Header>
      <HeaderInner>
        <BrandCluster>
          <BrandRow>
            <BrandLink href={homeHref}>
              <BrandMark>
                <BrandLogo size={34} title="" />
              </BrandMark>
              <BrandCopy>
                <BrandEyebrow>{navigation.news || "News"}</BrandEyebrow>
                <BrandTitle>{messages.site.title}</BrandTitle>
              </BrandCopy>
            </BrandLink>

            <SiteHeaderMobileControls
              accessibility={accessibility}
              categoryLinks={categoryLinks}
              countryLinks={countryLinks}
              legalNavigation={legalNavigation}
              locale={locale}
              messages={messages}
              privacyHref={privacyHref}
              primaryLinks={primaryLinks}
              disclaimerHref={disclaimerHref}
              searchHref={searchHref}
            />
          </BrandRow>

          {headerTagline ? <HeaderTagline>{headerTagline}</HeaderTagline> : null}
        </BrandCluster>

        <Navigation aria-label="Public navigation">
          {primaryLinks.map((item) => (
            <NavigationLink data-active="false" data-public-nav-link="true" href={item.href} key={item.key}>
              <AppIcon name={item.icon} size={15} />
              {item.label}
            </NavigationLink>
          ))}
          {renderDiscoveryMenu({
            discoveryKey: "category",
            icon: "tag",
            items: categoryLinks,
            label: navigation.categories || "Categories",
          })}
          {renderDiscoveryMenu({
            discoveryKey: "country",
            icon: "globe",
            items: countryLinks,
            label: navigation.countriesRegions || "Countries/Regions",
          })}
        </Navigation>

        <SearchWrap>{renderDesktopSearchForm({ locale, messages })}</SearchWrap>
        <SiteHeaderState categoryPrefix={`/${locale}/category`} homePath={homeHref} searchPath={searchHref} />
      </HeaderInner>
    </Header>
  );
}
