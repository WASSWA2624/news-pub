"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";

import NewsPubLogo from "@/components/common/news-pub-logo";
import PublicStorySearch from "@/components/layout/public-equipment-search";
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
  gap: 0.9rem;
  margin: 0 auto;
  max-width: 1280px;
  padding: 0.8rem 1rem;

  @media (min-width: 980px) {
    align-items: center;
    grid-template-columns: auto minmax(0, 1fr) minmax(18rem, 24rem);
  }
`;

const BrandLink = styled(Link)`
  align-items: center;
  color: ${({ theme }) => theme.colors.text};
  display: inline-flex;
  gap: 0.65rem;
`;

const BrandTitle = styled.span`
  font-size: clamp(1.45rem, 3vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
`;

const HeaderMeta = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const HeaderTagline = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  margin: 0;
  max-width: 52ch;
`;

const Navigation = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
`;

const NavigationLink = styled(Link)`
  color: ${({ $active }) => ($active ? "var(--theme-primary)" : "var(--theme-text)")};
  font-size: 0.95rem;
  font-weight: ${({ $active }) => ($active ? 800 : 700)};
`;

const SearchWrap = styled.div`
  max-width: 100%;
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
  gap: 1rem;
  margin: 0 auto;
  max-width: 1280px;
  padding: 1.5rem 1rem;

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
  gap: 0.5rem;
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
  gap: 0.45rem;
`;

const FooterLink = styled(Link)`
  color: rgba(255, 255, 255, 0.96);
  font-weight: 700;
`;

const FooterBottom = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(230, 237, 245, 0.82);
  margin: 0 auto;
  max-width: 1280px;
  padding: 0 1rem 1rem;
`;

/**
 * Public-facing NewsPub shell for locale-scoped browsing, navigation, and search.
 */
export default function SiteShell({ children, locale, messages }) {
  const pathname = usePathname();
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
  const primaryLinks = [
    { href: homeHref, key: "home", label: messages.site.navigation.home },
    { href: newsHref, key: "news", label: messages.site.navigation.news },
    { href: searchHref, key: "search", label: messages.site.navigation.search },
    { href: aboutHref, key: "about", label: messages.site.navigation.about },
  ];

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
