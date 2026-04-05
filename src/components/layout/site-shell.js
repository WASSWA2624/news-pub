"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import EquipLogo from "@/components/common/equip-logo";
import PublicEquipmentSearch from "@/components/layout/public-equipment-search";
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
  const targetSegments = targetPath.split("/").filter(Boolean);

  if (targetPath === "/" || targetSegments.length <= 1) {
    return currentPath === targetPath;
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function getEntityContextLabel(pathname) {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);
  const entitySegment = segments[1];

  if (entitySegment === "category") {
    return "Category";
  }

  if (entitySegment === "manufacturer") {
    return "Manufacturer";
  }

  if (entitySegment === "equipment") {
    return "Equipment";
  }

  return null;
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
  align-items: center;
  display: flex;
  gap: 0.7rem;
  justify-content: flex-start;
  margin: 0 auto;
  max-width: 1280px;
  min-height: 58px;
  padding: 0 0.7rem;
  width: 100%;

  @media (min-width: 720px) {
    min-height: 62px;
    padding: 0 0.95rem;
  }

  @media (min-width: 1100px) {
    padding: 0 1.15rem;
  }
`;

const HeaderSearchDesktop = styled.div`
  display: none;

  @media (min-width: 980px) {
    display: block;
    flex: 1 1 28rem;
    margin-left: 0.4rem;
    max-width: 34rem;
    min-width: 14rem;
  }
`;

const HeaderSearchMobile = styled.div`
  margin: 0 auto;
  max-width: 1280px;
  padding: 0 0.7rem 0.65rem;
  width: 100%;

  @media (min-width: 720px) {
    padding: 0 0.95rem 0.7rem;
  }

  @media (min-width: 980px) {
    display: none;
  }
`;

const HeaderLeft = styled.div`
  align-items: center;
  display: flex;
  flex: 0 1 auto;
  gap: 0.65rem;
  min-width: 0;
`;

const BrandLink = styled(Link)`
  align-items: center;
  color: ${({ theme }) => theme.colors.text};
  display: inline-flex;
  gap: 0.55rem;
  min-width: 0;
`;

const BrandTitle = styled.span`
  color: var(--theme-text);
  font-size: clamp(1.55rem, 4vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 1;
  white-space: nowrap;
`;

const ContextLabel = styled.span`
  color: var(--theme-text);
  display: none;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;

  @media (min-width: 720px) {
    display: inline-flex;
  }

  @media (min-width: 900px) {
    font-size: 1rem;
  }
`;

const HeaderRight = styled.div`
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 0.55rem;
  margin-left: auto;
`;

const PrimaryNav = styled.nav`
  align-items: center;
  display: none;
  gap: 1.45rem;

  @media (min-width: 720px) {
    display: inline-flex;
  }
`;

const PrimaryNavLink = styled(Link)`
  color: ${({ $active }) =>
    $active ? "var(--theme-text)" : "rgba(var(--theme-text-rgb), 0.92)"};
  font-size: 0.92rem;
  font-weight: ${({ $active }) => ($active ? 800 : 700)};
  letter-spacing: -0.02em;
  position: relative;
  transition: color 160ms ease;
  white-space: nowrap;

  &::after {
    background: var(--theme-primary);
    border-radius: 999px;
    bottom: -0.38rem;
    content: "";
    height: 2px;
    left: 0;
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    position: absolute;
    transform: scaleX(${({ $active }) => ($active ? 1 : 0.6)});
    transform-origin: left;
    transition: opacity 160ms ease, transform 160ms ease;
    width: 100%;
  }

  &:hover {
    color: var(--theme-primary);
  }

  &:hover::after {
    opacity: 1;
    transform: scaleX(1);
  }
`;

const MenuWrap = styled.div`
  position: relative;
`;

const MoreButton = styled.button`
  align-items: center;
  background: ${({ $open }) =>
    $open
      ? "rgba(var(--theme-primary-rgb), 0.14)"
      : "rgba(var(--theme-primary-rgb), 0.08)"};
  border: 1px solid
    ${({ $open }) =>
      $open
        ? "rgba(var(--theme-primary-rgb), 0.24)"
        : "rgba(var(--theme-primary-rgb), 0.14)"};
  border-radius: 999px;
  color: var(--theme-text);
  cursor: pointer;
  display: inline-grid;
  height: 34px;
  justify-content: center;
  padding: 0;
  place-items: center;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    opacity 160ms ease,
    transform 160ms ease;
  width: 34px;

  &:hover {
    background: rgba(var(--theme-primary-rgb), 0.14);
    border-color: rgba(var(--theme-primary-rgb), 0.24);
    transform: translateY(-1px);
  }
`;

const MoreButtonDots = styled.span`
  align-items: center;
  display: inline-grid;
  gap: 0.16rem;
  justify-items: center;
`;

const MoreButtonDot = styled.span`
  background: currentColor;
  border-radius: 999px;
  display: block;
  height: 4px;
  width: 4px;
`;

const MoreMenuPanel = styled.div`
  background:
    linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.99), rgba(var(--theme-surface-rgb), 0.98)),
    radial-gradient(circle at top right, rgba(var(--theme-primary-rgb), 0.08), transparent 48%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.7);
  border-radius: 18px;
  box-shadow:
    0 22px 52px rgba(var(--theme-primary-rgb), 0.16),
    0 2px 8px rgba(var(--theme-text-rgb), 0.06);
  display: ${({ $open }) => ($open ? "grid" : "none")};
  gap: 0.8rem;
  min-width: min(320px, calc(100vw - 1.4rem));
  padding: 0.7rem;
  position: absolute;
  right: 0;
  top: calc(100% + 0.45rem);
  width: min(320px, calc(100vw - 1.4rem));
  z-index: 40;

  @media (min-width: 720px) {
    min-width: 290px;
    width: 320px;
  }
`;

const MoreMenuHeader = styled.div`
  display: grid;
  gap: 0.2rem;
  padding: 0.15rem 0.15rem 0;
`;

const MoreMenuTitle = styled.span`
  color: var(--theme-text);
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const MoreMenuDescription = styled.span`
  color: rgba(var(--theme-muted-rgb), 0.92);
  font-size: 0.78rem;
  line-height: 1.4;
`;

const MoreMenuSections = styled.div`
  display: grid;
  gap: 0.55rem;
`;

const MoreMenuSection = styled.div`
  display: grid;
  gap: 0.4rem;
`;

const MoreMenuSectionLabel = styled.span`
  color: rgba(var(--theme-muted-rgb), 0.9);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  padding: 0 0.3rem;
  text-transform: uppercase;
`;

const MoreMenuList = styled.div`
  display: grid;
  gap: 0.22rem;
`;

const MoreMenuLink = styled(Link)`
  align-items: center;
  background: ${({ $active }) =>
    $active ? "rgba(var(--theme-primary-rgb), 0.12)" : "transparent"};
  border: 1px solid
    ${({ $active }) => ($active ? "rgba(var(--theme-primary-rgb), 0.18)" : "transparent")};
  border-radius: 12px;
  color: ${({ $active }) => ($active ? "var(--theme-primary)" : "var(--theme-text)")};
  display: flex;
  font-size: 0.93rem;
  font-weight: ${({ $active }) => ($active ? 800 : 700)};
  justify-content: space-between;
  min-height: 42px;
  padding: 0.68rem 0.8rem;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;

  &:hover {
    background: rgba(var(--theme-primary-rgb), 0.08);
    border-color: rgba(var(--theme-primary-rgb), 0.14);
    color: var(--theme-primary);
    transform: translateY(-1px);
  }
`;

const MoreMenuItemMeta = styled.span`
  color: rgba(var(--theme-muted-rgb), 0.78);
  font-size: 0.78rem;
  font-weight: 700;
`;

const Content = styled.div`
  display: grid;
  flex: 1;
`;

const Footer = styled.footer`
  background:
    radial-gradient(circle at top left, rgba(78, 145, 192, 0.22), transparent 28%),
    radial-gradient(circle at bottom right, rgba(29, 63, 102, 0.2), transparent 32%),
    linear-gradient(180deg, #17314d 0%, #0f2236 100%);
  color: rgba(255, 255, 255, 0.96);
  margin-top: auto;
`;

const FooterInner = styled.div`
  display: grid;
  gap: 1.75rem;
  margin: 0 auto;
  max-width: 1280px;
  padding: clamp(1.5rem, 4vw, 2.2rem) clamp(1rem, 3vw, 1.5rem) 1rem;
`;

const FooterTop = styled.div`
  display: grid;
  gap: 1.5rem;

  @media (min-width: 560px) {
    align-items: start;
    grid-template-columns: minmax(0, 1.2fr) minmax(105px, 0.6fr) minmax(105px, 0.6fr);
  }

  @media (min-width: 1100px) {
    grid-template-columns: minmax(0, 1.25fr) minmax(105px, 0.6fr) minmax(105px, 0.6fr) minmax(220px, 0.9fr);
  }
`;

const FooterBrand = styled.div`
  display: grid;
  gap: 0.8rem;
`;

const FooterBrandLink = styled(Link)`
  align-items: center;
  color: inherit;
  display: inline-flex;
  gap: 0.7rem;
  justify-self: start;
`;

const FooterBrandTitle = styled.span`
  font-size: clamp(1.15rem, 2.4vw, 1.35rem);
  font-weight: 800;
  letter-spacing: -0.03em;
`;

const FooterCopyStack = styled.div`
  display: grid;
  gap: 0.55rem;
  max-width: 26ch;
`;

const FooterBodyText = styled.p`
  color: rgba(235, 241, 248, 0.82);
  font-size: clamp(0.98rem, 2vw, 1.04rem);
  line-height: 1.55;
  margin: 0;
`;

const FooterNavSection = styled.div`
  align-content: start;
  display: grid;
  gap: 0.75rem;
`;

const FooterSectionTitle = styled.span`
  color: rgba(228, 236, 246, 0.8);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const FooterLinkList = styled.div`
  display: grid;
  gap: 0.55rem;
`;

const FooterLink = styled(Link)`
  color: rgba(255, 255, 255, 0.96);
  font-size: clamp(0.96rem, 2vw, 1.02rem);
  font-weight: 700;
  letter-spacing: -0.02em;

  &:hover {
    color: rgba(233, 242, 255, 0.84);
  }
`;

const FooterUtility = styled.div`
  display: none;

  @media (min-width: 1100px) {
    align-content: start;
    display: grid;
  }
`;

const FooterAdvertiseButton = styled.button`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  cursor: pointer;
  font-size: 0.98rem;
  font-weight: 600;
  min-height: 56px;
  padding: 0 1rem;
  transition: background 160ms ease, border-color 160ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.24);
  }
`;

const FooterBottom = styled.div`
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
  padding-top: 1rem;
`;

const Copyright = styled.span`
  color: rgba(230, 237, 245, 0.82);
  font-size: clamp(0.95rem, 2vw, 1rem);
`;

const FooterLocale = styled.button`
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  cursor: pointer;
  display: inline-flex;
  font-size: clamp(0.96rem, 2vw, 1rem);
  gap: 0.42rem;
  justify-content: center;
  min-height: 48px;
  padding: 0 1rem;
  white-space: nowrap;
`;

const FooterLocaleArrow = styled.span`
  font-size: 1rem;
  line-height: 1;
`;

export default function SiteShell({ children, locale, messages }) {
  const pathname = usePathname();
  const [menuOpenedForPath, setMenuOpenedForPath] = useState(null);
  const [isDesktopPrimaryNavVisible, setIsDesktopPrimaryNavVisible] = useState(false);
  const menuWrapRef = useRef(null);
  const legalNavigation = messages.site.legalNavigation || {};
  const languageLabel = messages.meta?.language || locale.toUpperCase();
  const currentYear = new Date().getFullYear();
  const searchBarCopy = messages.site.searchBar || {};

  const homeHref = buildLocalizedPath(locale, publicRouteSegments.home);
  const blogHref = buildLocalizedPath(locale, publicRouteSegments.blog);
  const aboutHref = buildLocalizedPath(locale, publicRouteSegments.about);
  const contactHref = buildLocalizedPath(locale, publicRouteSegments.contact);
  const searchHref = buildLocalizedPath(locale, publicRouteSegments.search);
  const disclaimerHref = buildLocalizedPath(locale, publicRouteSegments.disclaimer);
  const privacyHref = buildLocalizedPath(locale, publicRouteSegments.privacy);

  const primaryLinks = [
    { href: homeHref, key: "home", label: messages.site.navigation.home },
    { href: blogHref, key: "blog", label: messages.site.navigation.blog },
    { href: aboutHref, key: "about", label: messages.site.navigation.about },
    { href: contactHref, key: "contact", label: messages.site.navigation.contact },
  ];
  const browseLinks = [
    { href: homeHref, key: "home", label: messages.site.navigation.home },
    { href: blogHref, key: "blog", label: messages.site.navigation.blog },
    { href: searchHref, key: "search", label: messages.site.navigation.search },
  ];
  const companyLinks = [
    { href: aboutHref, key: "about", label: messages.site.navigation.about },
    { href: contactHref, key: "contact", label: messages.site.navigation.contact },
    { href: disclaimerHref, key: "disclaimer", label: legalNavigation.disclaimer || "Disclaimer" },
    { href: privacyHref, key: "privacy", label: legalNavigation.privacy || "Privacy" },
  ];
  const matchedContext =
    [...browseLinks, ...companyLinks].find((item) => isNavigationActive(pathname, item.href)) || null;
  const contextLabel =
    matchedContext?.label || getEntityContextLabel(pathname) || messages.site.navigation.home;
  const isMenuOpen = menuOpenedForPath === pathname;
  const visibleHeaderKeys = new Set(
    isDesktopPrimaryNavVisible ? primaryLinks.map((item) => item.key) : [],
  );
  const menuSections = [
    {
      items: browseLinks.filter((item) => !visibleHeaderKeys.has(item.key)),
      key: "browse",
      title: "Browse",
    },
    {
      items: companyLinks.filter((item) => !visibleHeaderKeys.has(item.key)),
      key: "company",
      title: "Company",
    },
  ].filter((section) => section.items.length);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQueryList = window.matchMedia("(min-width: 720px)");
    const handleChange = (event) => {
      setIsDesktopPrimaryNavVisible(event.matches);
    };

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleChange);

      return () => mediaQueryList.removeEventListener("change", handleChange);
    }

    mediaQueryList.addListener(handleChange);

    return () => mediaQueryList.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (menuWrapRef.current?.contains(event.target)) {
        return;
      }

      setMenuOpenedForPath(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  return (
    <Shell>
      <Header>
        <HeaderInner>
          <HeaderLeft>
            <BrandLink href={homeHref}>
              <EquipLogo size={40} />
              <BrandTitle>{messages.site.title}</BrandTitle>
            </BrandLink>
            <ContextLabel>{contextLabel}</ContextLabel>
          </HeaderLeft>

          <HeaderSearchDesktop>
            <PublicEquipmentSearch
              locale={locale}
              searchCopy={searchBarCopy}
              searchHref={searchHref}
            />
          </HeaderSearchDesktop>

          <HeaderRight>
            <PrimaryNav aria-label="Public navigation">
              {primaryLinks.map((item) => {
                const isActive = isNavigationActive(pathname, item.href);

                return (
                  <PrimaryNavLink
                    aria-current={isActive ? "page" : undefined}
                    href={item.href}
                    key={item.href}
                    $active={isActive}
                  >
                    {item.label}
                  </PrimaryNavLink>
                );
              })}
            </PrimaryNav>

            <MenuWrap ref={menuWrapRef}>
              <MoreButton
                aria-controls="public-navigation-overflow"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={() =>
                  setMenuOpenedForPath((currentValue) => (currentValue === pathname ? null : pathname))
                }
                $open={isMenuOpen}
                type="button"
              >
                <MoreButtonDots aria-hidden="true">
                  <MoreButtonDot />
                  <MoreButtonDot />
                  <MoreButtonDot />
                </MoreButtonDots>
              </MoreButton>

              <MoreMenuPanel $open={isMenuOpen} id="public-navigation-overflow">
                <MoreMenuHeader>
                  <MoreMenuTitle>More</MoreMenuTitle>
                  <MoreMenuDescription>
                    Only links hidden from the header are listed here.
                  </MoreMenuDescription>
                </MoreMenuHeader>

                <MoreMenuSections>
                  {menuSections.map((section) => (
                    <MoreMenuSection key={section.key}>
                      <MoreMenuSectionLabel>{section.title}</MoreMenuSectionLabel>
                      <MoreMenuList>
                        {section.items.map((item) => {
                          const isActive = isNavigationActive(pathname, item.href);

                          return (
                            <MoreMenuLink
                              aria-current={isActive ? "page" : undefined}
                              href={item.href}
                              key={item.href}
                              onClick={() => setMenuOpenedForPath(null)}
                              $active={isActive}
                            >
                              <span>{item.label}</span>
                              <MoreMenuItemMeta>{isActive ? "Current" : "Open"}</MoreMenuItemMeta>
                            </MoreMenuLink>
                          );
                        })}
                      </MoreMenuList>
                    </MoreMenuSection>
                  ))}
                </MoreMenuSections>
              </MoreMenuPanel>
            </MenuWrap>
          </HeaderRight>
        </HeaderInner>

        <HeaderSearchMobile>
          <PublicEquipmentSearch
            locale={locale}
            searchCopy={searchBarCopy}
            searchHref={searchHref}
          />
        </HeaderSearchMobile>
      </Header>

      <Content>{children}</Content>

      <Footer>
        <FooterInner>
          <FooterTop>
            <FooterBrand>
              <FooterBrandLink href={homeHref}>
                <EquipLogo size={44} />
                <FooterBrandTitle>{messages.site.title}</FooterBrandTitle>
              </FooterBrandLink>

              <FooterCopyStack>
                <FooterBodyText>{messages.site.footer}</FooterBodyText>
                <FooterBodyText>{messages.site.tagline}</FooterBodyText>
              </FooterCopyStack>
            </FooterBrand>

            <FooterNavSection>
              <FooterSectionTitle>Browse</FooterSectionTitle>
              <FooterLinkList>
                <FooterLink href={homeHref}>{messages.site.navigation.home}</FooterLink>
                <FooterLink href={blogHref}>{messages.site.navigation.blog}</FooterLink>
                <FooterLink href={searchHref}>{messages.site.navigation.search}</FooterLink>
              </FooterLinkList>
            </FooterNavSection>

            <FooterNavSection>
              <FooterSectionTitle>Company</FooterSectionTitle>
              <FooterLinkList>
                <FooterLink href={aboutHref}>{messages.site.navigation.about}</FooterLink>
                <FooterLink href={contactHref}>{messages.site.navigation.contact}</FooterLink>
                <FooterLink href={disclaimerHref}>
                  {legalNavigation.disclaimer || "Disclaimer"}
                </FooterLink>
                <FooterLink href={privacyHref}>{legalNavigation.privacy || "Privacy"}</FooterLink>
              </FooterLinkList>
            </FooterNavSection>

            <FooterUtility>
              <FooterAdvertiseButton type="button">Advertise Here</FooterAdvertiseButton>
            </FooterUtility>
          </FooterTop>

          <FooterBottom>
            <Copyright>
              &copy; {currentYear} {messages.site.title}. All rights reserved.
            </Copyright>
            <FooterLocale type="button">
              Locale: {languageLabel}
              <FooterLocaleArrow aria-hidden="true">v</FooterLocaleArrow>
            </FooterLocale>
          </FooterBottom>
        </FooterInner>
      </Footer>
    </Shell>
  );
}
