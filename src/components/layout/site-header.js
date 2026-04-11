"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import styled, { css } from "styled-components";

import AppIcon from "@/components/common/app-icon";
import NewsPubLogo from "@/components/common/news-pub-logo";
import ResponsiveImage from "@/components/common/responsive-image";
import { controlSurfaceCss, elevatedSurfaceCss, focusRingCss } from "@/components/common/ui-surface";
import PublicStorySearch from "@/components/layout/public-story-search";
import { siteShellUtils } from "@/components/layout/site-shell.utils";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";

const { isNavigationActive, normalizePathname, publicNavigationIcons } = siteShellUtils;

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
  gap: 0.6rem;
  margin: 0 auto;
  max-width: var(--theme-shell-max-width);
  padding: 0.7rem 0.88rem;

  @media (min-width: ${mobileBreakpoint}px) {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
  }

  @media (min-width: ${wideBreakpoint}px) {
    align-items: center;
    column-gap: 1rem;
    grid-template-columns: auto minmax(0, 1fr) minmax(17rem, 24rem);
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

const MobileActionGroup = styled.div`
  display: inline-flex;
  gap: 0.42rem;

  @media (min-width: ${mobileBreakpoint}px) {
    display: none;
  }
`;

const HeaderActionButton = styled.button`
  ${controlSurfaceCss}
  ${focusRingCss}
  align-items: center;
  cursor: pointer;
  display: inline-flex;
  height: 2.35rem;
  justify-content: center;
  min-width: 2.35rem;
  padding: 0;

  ${({ $primary }) =>
    $primary
      ? css`
          background: linear-gradient(135deg, var(--theme-primary), var(--theme-story-accent));
          border-color: rgba(var(--theme-primary-rgb), 0.22);
          color: white;
        `
      : ""}

  svg {
    display: block;
    height: 1rem;
    width: 1rem;
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
    justify-self: end;
  }
`;

const NavigationLink = styled(Link)`
  align-items: center;
  color: ${({ $active }) => ($active ? "var(--theme-primary)" : "var(--theme-text)")};
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: ${({ $active }) => ($active ? 800 : 700)};
  gap: 0.28rem;
  min-height: 2rem;
  white-space: nowrap;

  svg {
    display: block;
    height: 0.9rem;
    width: 0.9rem;
  }
`;

const Dropdown = styled.details`
  position: relative;
`;

const DropdownSummary = styled.summary`
  ${controlSurfaceCss}
  ${focusRingCss}
  align-items: center;
  color: ${({ $active }) => ($active ? "var(--theme-primary)" : "var(--theme-text)")};
  cursor: pointer;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: ${({ $active, $open }) => ($active || $open ? 800 : 700)};
  gap: 0.3rem;
  list-style: none;
  min-height: 2rem;
  padding: 0 0.68rem;
  white-space: nowrap;

  &::-webkit-details-marker {
    display: none;
  }
`;

const DropdownChevron = styled.span`
  display: inline-flex;
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "rotate(0deg)")};
  transition: transform 160ms ease;
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

const dialogVariants = Object.freeze({
  menu: css`
    align-items: stretch;
    justify-content: flex-end;
    padding: 0.55rem 0 0.55rem 0.55rem;
  `,
  search: css`
    align-items: flex-start;
    justify-content: center;
    padding: 0.85rem;
  `,
});

const MobileDialog = styled.dialog`
  background: transparent;
  border: none;
  height: 100dvh;
  inset: 0;
  margin: 0;
  max-height: 100dvh;
  max-width: 100vw;
  position: fixed;
  width: 100vw;
  ${({ $variant }) => dialogVariants[$variant] || dialogVariants.search}

  &[open] {
    display: flex;
  }

  &::backdrop {
    background: rgba(9, 16, 25, 0.56);
  }

  @media (min-width: ${mobileBreakpoint}px) {
    display: none;
  }
`;

const MobileSurface = styled.section`
  ${elevatedSurfaceCss}
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-height: calc(100dvh - 1.1rem);
  overflow: hidden;
`;

const MobileMenuSurface = styled(MobileSurface)`
  height: calc(100dvh - 1.1rem);
  margin-left: auto;
  width: min(23rem, calc(100vw - 0.55rem));
`;

const MobileSearchSurface = styled(MobileSurface)`
  margin-top: min(12vh, 5rem);
  width: min(30rem, calc(100vw - 1.7rem));
`;

const MobileDialogHeader = styled.div`
  align-items: start;
  border-bottom: 1px solid rgba(var(--theme-border-rgb), 0.82);
  display: grid;
  gap: 0.6rem;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 0.95rem;
`;

const MobileDialogCopy = styled.div`
  display: grid;
  gap: 0.18rem;
  min-width: 0;
`;

const MobileDialogEyebrow = styled.span`
  color: rgba(var(--theme-primary-rgb), 0.9);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const MobileDialogTitle = styled.h2`
  color: var(--theme-text);
  font-size: 1.05rem;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0;
`;

const MobileDialogDescription = styled.p`
  color: rgba(var(--theme-text-rgb), 0.68);
  font-size: 0.88rem;
  line-height: 1.45;
  margin: 0;
`;

const MobileDialogBody = styled.div`
  display: grid;
  gap: 0.85rem;
  min-height: 0;
  overflow-y: auto;
  padding: 0.95rem;
`;

const MobileQuickGrid = styled.div`
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
`;

const MobileQuickLink = styled(Link)`
  ${controlSurfaceCss}
  align-items: center;
  color: ${({ $active }) => ($active ? "var(--theme-primary)" : "var(--theme-text)")};
  display: inline-flex;
  font-size: 0.92rem;
  font-weight: 800;
  gap: 0.5rem;
  justify-content: center;
  min-height: 3rem;
  padding: 0.72rem 0.8rem;
  text-align: center;
`;

const MobileSectionStack = styled.div`
  display: grid;
  gap: 0.7rem;
`;

const MobileDisclosure = styled.details`
  background: rgba(var(--theme-surface-rgb), 0.9);
  border: 1px solid rgba(var(--theme-border-rgb), 0.8);
  overflow: hidden;
`;

const MobileDisclosureSummary = styled.summary`
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  list-style: none;
  padding: 0.84rem 0.92rem;

  &::-webkit-details-marker {
    display: none;
  }
`;

const MobileDisclosureLead = styled.span`
  align-items: center;
  color: var(--theme-text);
  display: inline-flex;
  font-size: 0.94rem;
  font-weight: 800;
  gap: 0.48rem;
  min-width: 0;
`;

const MobileDisclosureMeta = styled.span`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.48rem;
`;

const MobileCountPill = styled.span`
  background: rgba(var(--theme-primary-rgb), 0.08);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.14);
  color: rgba(var(--theme-primary-rgb), 0.92);
  display: inline-flex;
  font-size: 0.73rem;
  font-weight: 800;
  justify-content: center;
  min-width: 2rem;
  padding: 0.16rem 0.42rem;
`;

const MobileDisclosureChevron = styled.span`
  display: inline-flex;
  transition: transform 160ms ease;

  ${MobileDisclosure}[open] & {
    transform: rotate(180deg);
  }
`;

const MobileDisclosureBody = styled.div`
  border-top: 1px solid rgba(var(--theme-border-rgb), 0.74);
  padding: 0.38rem 0.5rem 0.5rem;
`;

const MobileList = styled.div`
  display: grid;
  gap: 0.32rem;
  max-height: min(34vh, 280px);
  overflow-y: auto;
`;

const MobileListLink = styled(Link)`
  ${controlSurfaceCss}
  align-items: center;
  color: var(--theme-text);
  display: flex;
  font-size: 0.9rem;
  font-weight: 700;
  gap: 0.55rem;
  justify-content: space-between;
  min-height: 2.9rem;
  padding: 0.68rem 0.74rem;
`;

const MobileListLabel = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.5rem;
  min-width: 0;
`;

const MobileListText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MobileMenuFooter = styled.div`
  border-top: 1px solid rgba(var(--theme-border-rgb), 0.8);
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.88rem 0.95rem 0.95rem;
`;

const MobileFooterLink = styled(Link)`
  ${controlSurfaceCss}
  align-items: center;
  color: var(--theme-text);
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  gap: 0.38rem;
  min-height: 2.2rem;
  padding: 0 0.74rem;
`;

function SiteHeaderFrame({
  categoryLinks = [],
  countryLinks = [],
  countryQuery = "",
  locale,
  messages,
  searchQuery = "",
}) {
  const pathname = usePathname();
  const categoryDropdownRef = useRef(null);
  const countryDropdownRef = useRef(null);
  const mobileMenuDialogRef = useRef(null);
  const mobileSearchDialogRef = useRef(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openDropdownRouteKey, setOpenDropdownRouteKey] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const accessibility = messages.site.accessibility || {};
  const searchBarCopy = messages.site.searchBar || {};
  const headerTagline = typeof messages.site.tagline === "string" ? messages.site.tagline.trim() : "";
  const normalizedSearchQuery = typeof searchQuery === "string" ? searchQuery.trim() : "";
  const legalNavigation = messages.site.legalNavigation || {};
  const homeHref = buildLocalizedPath(locale, publicRouteSegments.home);
  const newsHref = buildLocalizedPath(locale, publicRouteSegments.news);
  const searchHref = buildLocalizedPath(locale, publicRouteSegments.search);
  const aboutHref = buildLocalizedPath(locale, publicRouteSegments.about);
  const disclaimerHref = buildLocalizedPath(locale, publicRouteSegments.disclaimer);
  const privacyHref = buildLocalizedPath(locale, publicRouteSegments.privacy);
  const isCategoryActive = normalizePathname(pathname).startsWith(`/${locale}/category`);
  const routeStateKey = `${normalizePathname(pathname)}|${countryQuery}`;
  const isCategoryOpen = openDropdown === "category" && openDropdownRouteKey === routeStateKey;
  const isCountryActive = normalizePathname(pathname) === normalizePathname(searchHref) && Boolean(countryQuery);
  const isCountryOpen = openDropdown === "country" && openDropdownRouteKey === routeStateKey;
  const primaryLinks = [
    { href: homeHref, icon: publicNavigationIcons.home, key: "home", label: messages.site.navigation.home },
    { href: newsHref, icon: publicNavigationIcons.news, key: "news", label: messages.site.navigation.news },
    { href: searchHref, icon: publicNavigationIcons.search, key: "search", label: messages.site.navigation.search },
    { href: aboutHref, icon: publicNavigationIcons.about, key: "about", label: messages.site.navigation.about },
  ];
  const mobilePrimaryLinks = primaryLinks.filter((item) => item.key !== "search");
  const searchDialogTitle =
    messages.public?.search?.title ||
    searchBarCopy.label ||
    messages.site.navigation.search ||
    "Search";
  const searchDialogDescription =
    searchBarCopy.placeholder ||
    messages.public?.search?.description ||
    "Search published stories";

  useEffect(() => {
    function handlePointerDown(event) {
      const target = event.target;
      const clickedInsideCategory = categoryDropdownRef.current?.contains(target);
      const clickedInsideCountry = countryDropdownRef.current?.contains(target);

      if (!clickedInsideCategory && !clickedInsideCountry) {
        setOpenDropdown(null);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const dialog = mobileMenuDialogRef.current;

    if (!dialog) {
      return undefined;
    }

    function handleCancel(event) {
      event.preventDefault();
      setIsMobileMenuOpen(false);
    }

    dialog.addEventListener("cancel", handleCancel);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, []);

  useEffect(() => {
    const dialog = mobileSearchDialogRef.current;

    if (!dialog) {
      return undefined;
    }

    function handleCancel(event) {
      event.preventDefault();
      setIsMobileSearchOpen(false);
    }

    dialog.addEventListener("cancel", handleCancel);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, []);

  useEffect(() => {
    const dialog = mobileMenuDialogRef.current;

    if (!dialog || typeof dialog.showModal !== "function") {
      return;
    }

    if (isMobileMenuOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const dialog = mobileSearchDialogRef.current;

    if (!dialog || typeof dialog.showModal !== "function") {
      return;
    }

    if (isMobileSearchOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [isMobileSearchOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= mobileBreakpoint) {
        setIsMobileMenuOpen(false);
        setIsMobileSearchOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function handleDropdownToggle(kind) {
    setOpenDropdown((currentValue) => (currentValue === kind && openDropdownRouteKey === routeStateKey ? null : kind));
    setOpenDropdownRouteKey(routeStateKey);
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  function closeMobileSearch() {
    setIsMobileSearchOpen(false);
  }

  function openMobileMenu() {
    setOpenDropdown(null);
    setIsMobileSearchOpen(false);
    setIsMobileMenuOpen(true);
  }

  function openMobileSearch() {
    setOpenDropdown(null);
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(true);
  }

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
                <BrandEyebrow>{messages.site.navigation.news || "News"}</BrandEyebrow>
                <BrandTitle>{messages.site.title}</BrandTitle>
              </BrandCopy>
            </BrandLink>

            <MobileActionGroup>
              <HeaderActionButton
                aria-expanded={isMobileSearchOpen}
                aria-haspopup="dialog"
                aria-label={messages.site.navigation.search || "Search"}
                onClick={openMobileSearch}
                type="button"
              >
                <AppIcon name="search" size={18} />
              </HeaderActionButton>
              <HeaderActionButton
                $primary
                aria-expanded={isMobileMenuOpen}
                aria-haspopup="dialog"
                aria-label={accessibility.openMenu || "Open menu"}
                onClick={openMobileMenu}
                type="button"
              >
                <AppIcon name="menu" size={18} />
              </HeaderActionButton>
            </MobileActionGroup>
          </BrandRow>

          {headerTagline ? <HeaderTagline>{headerTagline}</HeaderTagline> : null}
        </BrandCluster>

        <Navigation aria-label="Public navigation">
          {primaryLinks.map((item) => (
            <NavigationLink
              aria-current={isNavigationActive(pathname, item.href) ? "page" : undefined}
              href={item.href}
              key={item.key}
              $active={isNavigationActive(pathname, item.href)}
            >
              <AppIcon name={item.icon} size={15} />
              {item.label}
            </NavigationLink>
          ))}

          {categoryLinks.length ? (
            <Dropdown open={isCategoryOpen} ref={categoryDropdownRef}>
              <DropdownSummary
                $active={isCategoryActive}
                $open={isCategoryOpen}
                onClick={(event) => {
                  event.preventDefault();
                  handleDropdownToggle("category");
                }}
              >
                <AppIcon name="tag" size={15} />
                {messages.site.navigation.categories || "Categories"}
                <DropdownChevron $open={isCategoryOpen}>
                  <AppIcon name="chevron-down" size={13} />
                </DropdownChevron>
              </DropdownSummary>
              <DropdownPanel>
                {categoryLinks.map((category) => (
                  <DropdownLink href={category.path} key={category.slug}>
                    <DropdownLabel>
                      <span aria-hidden="true">{category.logoEmoji || "N"}</span>
                      <span>{category.name}</span>
                    </DropdownLabel>
                    <DropdownMeta>{category.count}</DropdownMeta>
                  </DropdownLink>
                ))}
              </DropdownPanel>
            </Dropdown>
          ) : null}

          {countryLinks.length ? (
            <Dropdown open={isCountryOpen} ref={countryDropdownRef}>
              <DropdownSummary
                $active={isCountryActive}
                $open={isCountryOpen}
                onClick={(event) => {
                  event.preventDefault();
                  handleDropdownToggle("country");
                }}
              >
                <AppIcon name="globe" size={15} />
                {messages.site.navigation.countriesRegions || "Countries/Regions"}
                <DropdownChevron $open={isCountryOpen}>
                  <AppIcon name="chevron-down" size={13} />
                </DropdownChevron>
              </DropdownSummary>
              <DropdownPanel>
                {countryLinks.map((country) => (
                  <DropdownLink href={country.path} key={country.value}>
                    <DropdownLabel>
                      {country.flagImageUrl ? (
                        <CountryFlag
                          alt=""
                          aria-hidden="true"
                          height="14"
                          loading="lazy"
                          src={country.flagImageUrl}
                          width="20"
                        />
                      ) : country.flagEmoji ? (
                        <span aria-hidden="true">{country.flagEmoji}</span>
                      ) : null}
                      <span>{country.label}</span>
                    </DropdownLabel>
                    <DropdownMeta>{country.count}</DropdownMeta>
                  </DropdownLink>
                ))}
              </DropdownPanel>
            </Dropdown>
          ) : null}
        </Navigation>

        <SearchWrap>
          <PublicStorySearch
            country={countryQuery}
            initialQuery={normalizedSearchQuery}
            key={`desktop-search-${normalizedSearchQuery || "empty"}`}
            searchCopy={searchBarCopy}
            searchHref={searchHref}
          />
        </SearchWrap>
      </HeaderInner>

      <MobileDialog
        aria-label={accessibility.mobileMenu || "Mobile navigation menu"}
        onClick={(event) => {
          if (event.target === mobileMenuDialogRef.current) {
            closeMobileMenu();
          }
        }}
        ref={mobileMenuDialogRef}
        $variant="menu"
      >
        <MobileMenuSurface>
          <MobileDialogHeader>
            <MobileDialogCopy>
              <MobileDialogEyebrow>{messages.site.navigation.news || "News"}</MobileDialogEyebrow>
              <MobileDialogTitle>{messages.site.title}</MobileDialogTitle>
            </MobileDialogCopy>
            <HeaderActionButton
              aria-label={accessibility.closeMenu || "Close menu"}
              onClick={closeMobileMenu}
              type="button"
            >
              <AppIcon name="x" size={16} />
            </HeaderActionButton>
          </MobileDialogHeader>

          <MobileDialogBody>
            <MobileQuickGrid>
              {mobilePrimaryLinks.map((item) => (
                <MobileQuickLink
                  href={item.href}
                  key={item.key}
                  onClick={closeMobileMenu}
                  $active={isNavigationActive(pathname, item.href)}
                >
                  <AppIcon name={item.icon} size={15} />
                  {item.label}
                </MobileQuickLink>
              ))}
            </MobileQuickGrid>

            <MobileSectionStack>
              {categoryLinks.length ? (
                <MobileDisclosure open={isCategoryActive || undefined}>
                  <MobileDisclosureSummary>
                    <MobileDisclosureLead>
                      <AppIcon name="tag" size={15} />
                      {messages.site.navigation.categories || "Categories"}
                    </MobileDisclosureLead>
                    <MobileDisclosureMeta>
                      <MobileCountPill>{categoryLinks.length}</MobileCountPill>
                      <MobileDisclosureChevron>
                        <AppIcon name="chevron-down" size={14} />
                      </MobileDisclosureChevron>
                    </MobileDisclosureMeta>
                  </MobileDisclosureSummary>
                  <MobileDisclosureBody>
                    <MobileList>
                      {categoryLinks.map((category) => (
                        <MobileListLink href={category.path} key={category.slug} onClick={closeMobileMenu}>
                          <MobileListLabel>
                            <span aria-hidden="true">{category.logoEmoji || "N"}</span>
                            <MobileListText>{category.name}</MobileListText>
                          </MobileListLabel>
                          <DropdownMeta>{category.count}</DropdownMeta>
                        </MobileListLink>
                      ))}
                    </MobileList>
                  </MobileDisclosureBody>
                </MobileDisclosure>
              ) : null}

              {countryLinks.length ? (
                <MobileDisclosure open={isCountryActive || undefined}>
                  <MobileDisclosureSummary>
                    <MobileDisclosureLead>
                      <AppIcon name="globe" size={15} />
                      {messages.site.navigation.countriesRegions || "Countries/Regions"}
                    </MobileDisclosureLead>
                    <MobileDisclosureMeta>
                      <MobileCountPill>{countryLinks.length}</MobileCountPill>
                      <MobileDisclosureChevron>
                        <AppIcon name="chevron-down" size={14} />
                      </MobileDisclosureChevron>
                    </MobileDisclosureMeta>
                  </MobileDisclosureSummary>
                  <MobileDisclosureBody>
                    <MobileList>
                      {countryLinks.map((country) => (
                        <MobileListLink href={country.path} key={country.value} onClick={closeMobileMenu}>
                          <MobileListLabel>
                            {country.flagImageUrl ? (
                              <CountryFlag
                                alt=""
                                aria-hidden="true"
                                height="14"
                                loading="lazy"
                                src={country.flagImageUrl}
                                width="20"
                              />
                            ) : country.flagEmoji ? (
                              <span aria-hidden="true">{country.flagEmoji}</span>
                            ) : (
                              <AppIcon name="globe" size={14} />
                            )}
                            <MobileListText>{country.label}</MobileListText>
                          </MobileListLabel>
                          <DropdownMeta>{country.count}</DropdownMeta>
                        </MobileListLink>
                      ))}
                    </MobileList>
                  </MobileDisclosureBody>
                </MobileDisclosure>
              ) : null}
            </MobileSectionStack>
          </MobileDialogBody>

          <MobileMenuFooter>
            <MobileFooterLink href={searchHref} onClick={closeMobileMenu}>
              <AppIcon name="search" size={14} />
              {messages.site.navigation.search || "Search"}
            </MobileFooterLink>
            <MobileFooterLink href={privacyHref} onClick={closeMobileMenu}>
              <AppIcon name="lock" size={14} />
              {legalNavigation.privacy || "Privacy"}
            </MobileFooterLink>
            <MobileFooterLink href={disclaimerHref} onClick={closeMobileMenu}>
              <AppIcon name="shield" size={14} />
              {legalNavigation.disclaimer || "Disclaimer"}
            </MobileFooterLink>
          </MobileMenuFooter>
        </MobileMenuSurface>
      </MobileDialog>

      <MobileDialog
        aria-label={accessibility.searchDialog || "Search stories"}
        onClick={(event) => {
          if (event.target === mobileSearchDialogRef.current) {
            closeMobileSearch();
          }
        }}
        ref={mobileSearchDialogRef}
        $variant="search"
      >
        <MobileSearchSurface>
          <MobileDialogHeader>
            <MobileDialogCopy>
              <MobileDialogEyebrow>{messages.site.navigation.search || "Search"}</MobileDialogEyebrow>
              <MobileDialogTitle>{searchDialogTitle}</MobileDialogTitle>
              <MobileDialogDescription>{searchDialogDescription}</MobileDialogDescription>
            </MobileDialogCopy>
            <HeaderActionButton
              aria-label={accessibility.closeSearch || "Close search"}
              onClick={closeMobileSearch}
              type="button"
            >
              <AppIcon name="x" size={16} />
            </HeaderActionButton>
          </MobileDialogHeader>

          <MobileDialogBody>
            <PublicStorySearch
              autoFocus
              condenseSubmit={false}
              country={countryQuery}
              initialQuery={normalizedSearchQuery}
              key={`mobile-search-${normalizedSearchQuery || "empty"}`}
              onSubmitComplete={closeMobileSearch}
              searchCopy={searchBarCopy}
              searchHref={searchHref}
            />
          </MobileDialogBody>
        </MobileSearchSurface>
      </MobileDialog>
    </Header>
  );
}

function SiteHeaderContent(props) {
  const searchParams = useSearchParams();
  const countryQuery =
    typeof searchParams?.get("country") === "string" ? searchParams.get("country").trim() : "";
  const searchQuery =
    typeof searchParams?.get("q") === "string" ? searchParams.get("q").trim() : "";

  return <SiteHeaderFrame {...props} countryQuery={countryQuery} searchQuery={searchQuery} />;
}

export default function SiteHeader(props) {
  return (
    <Suspense fallback={<SiteHeaderFrame {...props} countryQuery="" searchQuery="" />}>
      <SiteHeaderContent {...props} />
    </Suspense>
  );
}
