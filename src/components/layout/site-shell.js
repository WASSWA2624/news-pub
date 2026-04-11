/**
 * Public site shell that keeps the footer and page chrome server-rendered while
 * delegating header interactions to a smaller client boundary.
 */

import Link from "next/link";
import styled from "styled-components";

import AppIcon from "@/components/common/app-icon";
import NewsPubLogo from "@/components/common/news-pub-logo";
import SiteHeader from "@/components/layout/site-header";
import { siteShellUtils } from "@/components/layout/site-shell.utils";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";

const { buildFooterSections } = siteShellUtils;

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Content = styled.main`
  display: grid;
  flex: 1;
`;

const Footer = styled.footer`
  background:
    linear-gradient(180deg, rgba(18, 34, 56, 0.98), rgba(16, 52, 78, 0.96)),
    radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.12), transparent 28%);
  color: rgba(255, 255, 255, 0.95);
  margin-top: auto;
`;

const FooterInner = styled.div`
  display: grid;
  gap: 1rem;
  margin: 0 auto;
  max-width: var(--theme-shell-max-width);
  padding: 1.1rem 0.88rem 0.95rem;

  @media (min-width: 980px) {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.7fr);
  }
`;

const FooterBrandPanel = styled.div`
  display: grid;
  gap: 0.65rem;
`;

const BrandLink = styled(Link)`
  align-items: center;
  color: inherit;
  display: inline-flex;
  gap: 0.5rem;
`;

const BrandTitle = styled.span`
  font-size: clamp(1.1rem, 3vw, 1.7rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
`;

const FooterCopy = styled.p`
  color: rgba(235, 241, 248, 0.78);
  line-height: 1.55;
  margin: 0;
  max-width: 34ch;
`;

const FooterSectionsGrid = styled.div`
  display: grid;
  gap: 0.72rem;

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const FooterSection = styled.section`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 0.52rem;
  padding: 0.8rem;
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
  gap: 0.42rem;
`;

const FooterLink = styled(Link)`
  align-items: center;
  color: rgba(255, 255, 255, 0.96);
  display: flex;
  gap: 0.5rem;
  font-weight: 700;
  justify-content: space-between;
  min-height: 2rem;

  &:hover {
    color: white;
  }

  svg {
    display: block;
    height: 0.92rem;
    width: 0.92rem;
  }
`;

const FooterLinkLabel = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.38rem;
  min-width: 0;
`;

const FooterLinkMeta = styled.span`
  color: rgba(235, 241, 248, 0.68);
  font-size: 0.76rem;
  font-weight: 800;
`;

const FooterBottom = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(230, 237, 245, 0.8);
  margin: 0 auto;
  max-width: var(--theme-shell-max-width);
  padding: 0 0.88rem 0.72rem;
`;

export default function SiteShell({
  categoryLinks = [],
  children,
  countryLinks = [],
  locale,
  messages,
}) {
  const currentYear = new Date().getFullYear();
  const footerBottomCopy = messages.site.footerBottom || "All rights reserved.";
  const homeHref = buildLocalizedPath(locale, publicRouteSegments.home);
  const newsHref = buildLocalizedPath(locale, publicRouteSegments.news);
  const searchHref = buildLocalizedPath(locale, publicRouteSegments.search);
  const aboutHref = buildLocalizedPath(locale, publicRouteSegments.about);
  const disclaimerHref = buildLocalizedPath(locale, publicRouteSegments.disclaimer);
  const privacyHref = buildLocalizedPath(locale, publicRouteSegments.privacy);
  const footerSections = buildFooterSections({
    aboutHref,
    categoryLinks,
    countryLinks,
    disclaimerHref,
    homeHref,
    messages,
    newsHref,
    privacyHref,
    searchHref,
  });

  return (
    <Shell>
      <SiteHeader
        categoryLinks={categoryLinks}
        countryLinks={countryLinks}
        locale={locale}
        messages={messages}
      />

      <Content>{children}</Content>

      <Footer>
        <FooterInner>
          <FooterBrandPanel>
            <BrandLink href={homeHref}>
              <NewsPubLogo size={42} />
              <BrandTitle>{messages.site.title}</BrandTitle>
            </BrandLink>
            <FooterCopy>{messages.site.footer}</FooterCopy>
          </FooterBrandPanel>

          <FooterSectionsGrid>
            {footerSections.map((section) => (
              <FooterSection key={section.key}>
                <FooterSectionTitle>{section.title}</FooterSectionTitle>
                <FooterLinkList>
                  {section.links.map((link) => (
                    <FooterLink href={link.href} key={link.key}>
                      <FooterLinkLabel>
                        <AppIcon name={link.icon} size={15} />
                        {link.label}
                      </FooterLinkLabel>
                      {link.meta ? <FooterLinkMeta>{link.meta}</FooterLinkMeta> : null}
                    </FooterLink>
                  ))}
                </FooterLinkList>
              </FooterSection>
            ))}
          </FooterSectionsGrid>
        </FooterInner>

        <FooterBottom>
          &copy; {currentYear} {messages.site.title}. {footerBottomCopy}
        </FooterBottom>
      </Footer>
    </Shell>
  );
}
