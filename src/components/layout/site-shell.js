"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import styled from "styled-components";

import NewsPubLogo from "@/components/common/news-pub-logo";
import PublicStorySearch from "@/components/layout/public-story-search";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";

function normalizePathname(pathname) {
  if (typeof pathname !== "string" || !pathname.trim()) {
    return "/";
  }

  const value = pathname.trim();

  if (value === "/") {
    return value;
  }

  return value.replace(/\/+$/, "") || "/";
}

function isNavigationActive(pathname, href) {
  const currentPath = normalizePathname(pathname);
  const targetPath = normalizePathname(href);

  if (targetPath === "/" || targetPath.split("/").filter(Boolean).length <= 1) {
    return currentPath === targetPath;
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Header = styled.header`
  background:
    linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.98), rgba(var(--theme-bg-rgb), 0.96)),
    radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.06), transparent 32%);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(var(--theme-border-rgb), 0.88);
  box-shadow: 0 14px 42px rgba(var(--theme-primary-rgb), 0.07);
  position: sticky;
  top: 0;
  z-index: 30;
`;

const HeaderInner = styled.div`
  display: grid;
  gap: 0.6rem;
  margin: 0 auto;
  max-width: var(--theme-shell-max-width);
  padding: clamp(0.56rem, 1.4vw, 0.72rem) clamp(0.7rem, 1.8vw, 0.88rem);

  @media (min-width: 980px) {
    align-items: center;
    grid-template-columns: auto minmax(0, 1fr) minmax(18rem, 24rem);
  }
`;

const BrandLink = styled(Link)`
  align-items: center;
  color: ${({ theme }) => theme?.colors?.text ?? "var(--theme-text)"};
  display: inline-flex;
  gap: 0.48rem;
`;

const BrandTitle = styled.span`
  font-size: clamp(1.45rem, 3vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
`;

const HeaderMeta = styled.div`
  display: grid;
  gap: 0.22rem;
`;

const HeaderTagline = styled.p`
  color: ${({ theme }) => theme?.colors?.muted ?? "var(--theme-muted)"};
  margin: 0;
  max-width: 64ch;
`;

const Navigation = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 0.62rem;
  overflow-x: auto;
  padding-bottom: 0.08rem;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: 980px) {
    align-items: center;
    overflow: visible;
    padding-bottom: 0;
  }
`;

const NavigationLink = styled(Link)`
  color: ${({ $active }) => ($active ? "var(--theme-primary)" : "var(--theme-text)")};
  font-size: 0.95rem;
  font-weight: ${({ $active }) => ($active ? 800 : 700)};
  line-height: 1.2;
  min-height: 2rem;
`;

const Dropdown = styled.details`
  position: relative;
`;

const DropdownSummary = styled.summary`
  align-items: center;
  background: ${({ $active, $open }) => (
    $open || $active ? "rgba(var(--theme-primary-rgb), 0.12)" : "rgba(var(--theme-primary-rgb), 0.05)"
  )};
  border: 1px solid ${({ $active }) => ($active ? "rgba(var(--theme-primary-rgb), 0.42)" : "rgba(var(--theme-border-rgb), 0.85)")};
  border-radius: 999px;
  color: ${({ $active, $open }) => ($open || $active ? "var(--theme-primary)" : "var(--theme-text)")};
  cursor: pointer;
  display: inline-flex;
  font-size: 0.95rem;
  font-weight: ${({ $active, $open }) => ($open || $active ? 800 : 700)};
  gap: 0.32rem;
  list-style: none;
  padding: 0.28rem 0.62rem;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    background: rgba(var(--theme-primary-rgb), 0.12);
    border-color: rgba(var(--theme-primary-rgb), 0.42);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-rgb), 0.2);
    outline: none;
  }

  &::-webkit-details-marker {
    display: none;
  }
`;

const DropdownChevron = styled.span`
  color: inherit;
  font-size: 0.68rem;
  transform: ${({ $open }) => ($open ? "translateY(1px) rotate(180deg)" : "translateY(1px) rotate(0deg)")};
  transition: transform 0.18s ease;
`;

const DropdownList = styled.div`
  background: rgba(var(--theme-surface-rgb), 0.98);
  border: 1px solid rgba(var(--theme-border-rgb), 0.92);
  border-radius: var(--theme-radius-md);
  box-shadow: 0 24px 48px rgba(var(--theme-primary-rgb), 0.12);
  display: grid;
  gap: 0.18rem;
  max-height: min(62vh, 360px);
  min-width: 260px;
  overflow-y: auto;
  padding: 0.38rem;
  position: absolute;
  top: calc(100% + 0.6rem);
  z-index: 10;
  animation: fadeDropdownIn 0.15s ease;

  @keyframes fadeDropdownIn {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 780px) {
    position: static;
    margin-top: 0.4rem;
    width: 100%;
  }
`;

const DropdownLink = styled(Link)`
  align-items: center;
  border-radius: var(--theme-radius-sm);
  color: var(--theme-text);
  display: flex;
  font-size: 0.92rem;
  font-weight: 700;
  justify-content: space-between;
  gap: 0.55rem;
  padding: 0.5rem 0.56rem;
  transition: background 0.18s ease, color 0.18s ease;
  min-height: 38px;

  &:hover {
    background: rgba(var(--theme-primary-rgb), 0.08);
  }
`;

const DropdownCount = styled.span`
  color: rgba(var(--theme-text-rgb), 0.62);
  font-size: 0.78rem;
`;

const DropdownLabel = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.45rem;
`;

const CountryFlag = styled.img`
  border: 1px solid rgba(var(--theme-border-rgb), 0.8);
  border-radius: 2px;
  display: inline-flex;
  height: 14px;
  object-fit: cover;
  width: 20px;
`;

const SearchWrap = styled.div`
  max-width: 100%;
  width: 100%;
`;

const Content = styled.div`
  display: grid;
  flex: 1;
`;

const Footer = styled.footer`
  background:
    radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.24), transparent 28%),
    radial-gradient(circle at bottom right, rgba(var(--theme-primary-rgb), 0.22), transparent 32%),
    linear-gradient(180deg, rgba(var(--theme-text-rgb), 0.96) 0%, rgba(var(--theme-primary-rgb), 0.98) 100%);
  color: rgba(255, 255, 255, 0.96);
  margin-top: auto;
`;

const FooterInner = styled.div`
  display: grid;
  gap: 0.72rem;
  margin: 0 auto;
  max-width: var(--theme-shell-max-width);
  padding: 1.1rem 0.88rem;

  @media (min-width: 900px) {
    align-items: start;
    grid-template-columns: minmax(0, 1.3fr) repeat(2, minmax(0, 0.7fr));
  }
`;

const FooterCopy = styled.p`
  color: rgba(235, 241, 248, 0.82);
  line-height: 1.55;
  margin: 0;
  max-width: 28ch;
`;

const FooterSection = styled.div`
  display: grid;
  gap: 0.34rem;
`;

const FooterSectionTitle = styled.span`
  color: rgba(228, 236, 246, 0.8);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const FooterLinkList = styled.div`
  display: grid;
  gap: 0.3rem;
`;

const FooterLink = styled(Link)`
  color: rgba(255, 255, 255, 0.96);
  font-weight: 700;
`;

const FooterBottom = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(230, 237, 245, 0.82);
  margin: 0 auto;
  max-width: var(--theme-shell-max-width);
  padding: 0 0.88rem 0.72rem;
`;

/**
 * Public-facing NewsPub shell for locale-scoped browsing, navigation, and search.
 */
export default function SiteShell({ categoryLinks = [], children, countryLinks = [], locale, messages }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryDropdownRef = useRef(null);
  const countryDropdownRef = useRef(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openDropdownRouteKey, setOpenDropdownRouteKey] = useState("");
  const currentYear = new Date().getFullYear();
  const searchBarCopy = messages.site.searchBar || {};
  const headerTagline = typeof messages.site.tagline === "string" ? messages.site.tagline.trim() : "";
  const legalNavigation = messages.site.legalNavigation || {};
  const homeHref = buildLocalizedPath(locale, publicRouteSegments.home);
  const newsHref = buildLocalizedPath(locale, publicRouteSegments.news);
  const searchHref = buildLocalizedPath(locale, publicRouteSegments.search);
  const aboutHref = buildLocalizedPath(locale, publicRouteSegments.about);
  const disclaimerHref = buildLocalizedPath(locale, publicRouteSegments.disclaimer);
  const privacyHref = buildLocalizedPath(locale, publicRouteSegments.privacy);
  const isCategoryActive = normalizePathname(pathname).startsWith(`/${locale}/category`);
  const countryQuery = typeof searchParams?.get("country") === "string" ? searchParams.get("country").trim() : "";
  const routeStateKey = `${normalizePathname(pathname)}|${countryQuery}`;
  const isCategoryOpen =
    openDropdown === "category" && openDropdownRouteKey === routeStateKey;
  const isCountryActive = normalizePathname(pathname) === normalizePathname(searchHref) && Boolean(countryQuery);
  const isCountryOpen =
    openDropdown === "country" && openDropdownRouteKey === routeStateKey;
  const primaryLinks = [
    { href: homeHref, key: "home", label: messages.site.navigation.home },
    { href: newsHref, key: "news", label: messages.site.navigation.news },
    { href: searchHref, key: "search", label: messages.site.navigation.search },
    { href: aboutHref, key: "about", label: messages.site.navigation.about },
  ];

  useEffect(() => {
    function handlePointerDown(event) {
      const target = event.target;

      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(target) &&
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(target)
      ) {
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

  function handleDropdownToggle(kind) {
    const nextIsOpen = openDropdown === kind && openDropdownRouteKey === routeStateKey ? null : kind;

    setOpenDropdown(nextIsOpen);
    setOpenDropdownRouteKey(routeStateKey);
  }

  return (
    <Shell>
      <Header>
        <HeaderInner>
          <HeaderMeta>
            <BrandLink href={homeHref}>
              <NewsPubLogo size={40} />
              <BrandTitle>{messages.site.title}</BrandTitle>
            </BrandLink>
            {headerTagline ? <HeaderTagline>{headerTagline}</HeaderTagline> : null}
          </HeaderMeta>

          <Navigation aria-label="Public navigation">
            {primaryLinks.map((item) => (
              <NavigationLink
                aria-current={isNavigationActive(pathname, item.href) ? "page" : undefined}
                href={item.href}
                key={item.key}
                $active={isNavigationActive(pathname, item.href)}
              >
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
                  {messages.site.navigation.categories || "Categories"}
                  <DropdownChevron $open={isCategoryOpen} aria-hidden="true">▼</DropdownChevron>
                </DropdownSummary>
                <DropdownList>
                  {categoryLinks.map((category) => (
                    <DropdownLink href={category.path} key={category.slug}>
                      <DropdownLabel>
                        <span aria-hidden="true">{category.logoEmoji || "📰"}</span>
                        <span>{category.name}</span>
                      </DropdownLabel>
                      <DropdownCount>{category.count}</DropdownCount>
                    </DropdownLink>
                  ))}
                </DropdownList>
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
                  {messages.site.navigation.countriesRegions || "Countries/Regions"}
                  <DropdownChevron $open={isCountryOpen} aria-hidden="true">▼</DropdownChevron>
                </DropdownSummary>
                <DropdownList>
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
                      <DropdownCount>{country.count}</DropdownCount>
                    </DropdownLink>
                  ))}
                </DropdownList>
              </Dropdown>
            ) : null}
          </Navigation>

          <SearchWrap>
            <PublicStorySearch
              locale={locale}
              searchCopy={searchBarCopy}
              searchHref={searchHref}
            />
          </SearchWrap>
        </HeaderInner>
      </Header>

      <Content>{children}</Content>

      <Footer>
        <FooterInner>
          <div>
            <BrandLink href={homeHref}>
              <NewsPubLogo size={42} />
              <BrandTitle>{messages.site.title}</BrandTitle>
            </BrandLink>
            <FooterCopy>{messages.site.footer}</FooterCopy>
          </div>

          <FooterSection>
            <FooterSectionTitle>Browse</FooterSectionTitle>
            <FooterLinkList>
              <FooterLink href={homeHref}>{messages.site.navigation.home}</FooterLink>
              <FooterLink href={newsHref}>{messages.site.navigation.news}</FooterLink>
              <FooterLink href={searchHref}>{messages.site.navigation.search}</FooterLink>
              {categoryLinks[0] ? (
                <FooterLink href={categoryLinks[0].path}>
                  {messages.site.navigation.categories || "Categories"}
                </FooterLink>
              ) : null}
              {countryLinks[0] ? (
                <FooterLink href={countryLinks[0].path}>
                  {messages.site.navigation.countriesRegions || "Countries/Regions"}
                </FooterLink>
              ) : null}
            </FooterLinkList>
          </FooterSection>

          <FooterSection>
            <FooterSectionTitle>Company</FooterSectionTitle>
            <FooterLinkList>
              <FooterLink href={aboutHref}>{messages.site.navigation.about}</FooterLink>
              <FooterLink href={disclaimerHref}>
                {legalNavigation.disclaimer || "Disclaimer"}
              </FooterLink>
              <FooterLink href={privacyHref}>{legalNavigation.privacy || "Privacy"}</FooterLink>
            </FooterLinkList>
          </FooterSection>
        </FooterInner>

        <FooterBottom>
          &copy; {currentYear} {messages.site.title}. All rights reserved.
        </FooterBottom>
      </Footer>
    </Shell>
  );
}
