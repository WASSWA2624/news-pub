"use client";

import { useEffect } from "react";
import Link from "next/link";
import styled from "styled-components";

import AppIcon from "@/components/common/app-icon";
import ResponsiveImage from "@/components/common/responsive-image";
import { controlSurfaceCss, elevatedSurfaceCss, focusRingCss } from "@/components/common/ui-surface";
import { siteShellUtils } from "@/components/layout/site-shell.utils";

const { isNavigationActive } = siteShellUtils;

const Overlay = styled.div`
  background: rgba(9, 16, 25, 0.56);
  inset: 0;
  position: fixed;
  z-index: 40;

  @media (min-width: 980px) {
    display: none;
  }
`;

const Panel = styled.section`
  ${elevatedSurfaceCss}
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  inset: 0 auto 0 0;
  margin-left: auto;
  max-height: 100dvh;
  overflow: hidden;
  position: absolute;
  width: ${({ $mode }) => ($mode === "search" ? "min(30rem, calc(100vw - 1.2rem))" : "min(23rem, calc(100vw - 0.55rem))")};
`;

const SearchPanel = styled(Panel)`
  margin: min(12vh, 5rem) auto auto;
  position: relative;
`;

const PanelHeader = styled.div`
  align-items: start;
  border-bottom: 1px solid rgba(var(--theme-border-rgb), 0.82);
  display: grid;
  gap: 0.6rem;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 0.95rem;
`;

const PanelCopy = styled.div`
  display: grid;
  gap: 0.18rem;
  min-width: 0;
`;

const PanelEyebrow = styled.span`
  color: rgba(var(--theme-primary-rgb), 0.9);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const PanelTitle = styled.h2`
  color: var(--theme-text);
  font-size: 1.05rem;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0;
`;

const PanelDescription = styled.p`
  color: rgba(var(--theme-text-rgb), 0.68);
  font-size: 0.88rem;
  line-height: 1.45;
  margin: 0;
`;

const CloseButton = styled.button`
  ${controlSurfaceCss}
  ${focusRingCss}
  align-items: center;
  cursor: pointer;
  display: inline-flex;
  height: 2.3rem;
  justify-content: center;
  min-width: 2.3rem;
  padding: 0;
`;

const PanelBody = styled.div`
  display: grid;
  gap: 0.85rem;
  min-height: 0;
  overflow-y: auto;
  padding: 0.95rem;
`;

const QuickGrid = styled.div`
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
`;

const QuickLink = styled(Link)`
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

const SectionStack = styled.div`
  display: grid;
  gap: 0.7rem;
`;

const Disclosure = styled.details`
  background: rgba(var(--theme-surface-rgb), 0.9);
  border: 1px solid rgba(var(--theme-border-rgb), 0.8);
  overflow: hidden;
`;

const DisclosureSummary = styled.summary`
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

const DisclosureLead = styled.span`
  align-items: center;
  color: var(--theme-text);
  display: inline-flex;
  font-size: 0.94rem;
  font-weight: 800;
  gap: 0.48rem;
  min-width: 0;
`;

const DisclosureMeta = styled.span`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.48rem;
`;

const CountPill = styled.span`
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

const DisclosureBody = styled.div`
  border-top: 1px solid rgba(var(--theme-border-rgb), 0.74);
  padding: 0.38rem 0.5rem 0.5rem;
`;

const List = styled.div`
  display: grid;
  gap: 0.32rem;
  max-height: min(34vh, 280px);
  overflow-y: auto;
`;

const ListLink = styled(Link)`
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

const ListLabel = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.5rem;
  min-width: 0;
`;

const ListText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CountryFlag = styled(ResponsiveImage)`
  border: 1px solid rgba(var(--theme-border-rgb), 0.8);
  display: inline-flex;
  height: 14px;
  object-fit: cover;
  width: 20px;
`;

const Footer = styled.div`
  border-top: 1px solid rgba(var(--theme-border-rgb), 0.8);
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.88rem 0.95rem 0.95rem;
`;

const FooterLink = styled(Link)`
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

const SearchForm = styled.form`
  align-items: stretch;
  display: grid;
  gap: 0.68rem;
`;

const SearchField = styled.label`
  align-items: center;
  background: white;
  border: 1px solid rgba(var(--theme-border-rgb), 0.82);
  display: flex;
  gap: 0.44rem;
  min-height: 46px;
  padding: 0 0.78rem;
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  color: var(--theme-text);
  flex: 1 1 auto;
  font: inherit;
  min-height: 100%;
  padding: 0;

  &:focus {
    outline: none;
  }
`;

const SearchButton = styled.button`
  align-items: center;
  background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-story-accent) 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-weight: 800;
  gap: 0.38rem;
  justify-content: center;
  min-height: 46px;
  padding: 0 0.94rem;
`;

function renderCountryItem(item) {
  if (item.flagImageUrl) {
    return (
      <CountryFlag
        alt=""
        aria-hidden="true"
        height="14"
        loading="lazy"
        sizes="20px"
        src={item.flagImageUrl}
        width="20"
      />
    );
  }

  if (item.flagEmoji) {
    return <span aria-hidden="true">{item.flagEmoji}</span>;
  }

  return <AppIcon name="globe" size={14} />;
}

export default function SiteHeaderMobileOverlay({
  accessibility = {},
  categoryLinks = [],
  countryLinks = [],
  legalNavigation = {},
  messages,
  onClose,
  openPanel,
  pathname,
  primaryLinks = [],
  privacyHref,
  disclaimerHref,
  searchHref,
}) {
  const searchCopy = messages.site.searchBar || {};
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const countryQuery = searchParams?.get("country")?.trim() || "";
  const searchQuery = searchParams?.get("q")?.trim() || "";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (openPanel === "search") {
    return (
      <Overlay onClick={onClose} role="presentation">
        <SearchPanel
          $mode="search"
          aria-label={accessibility.searchDialog || "Search stories"}
          onClick={(event) => event.stopPropagation()}
        >
          <PanelHeader>
            <PanelCopy>
              <PanelEyebrow>{messages.site.navigation.search || "Search"}</PanelEyebrow>
              <PanelTitle>{messages.public?.search?.title || searchCopy.label || "Search"}</PanelTitle>
              <PanelDescription>
                {searchCopy.placeholder || messages.public?.search?.description || "Search published stories"}
              </PanelDescription>
            </PanelCopy>
            <CloseButton aria-label={accessibility.closeSearch || "Close search"} onClick={onClose} type="button">
              <AppIcon name="x" size={16} />
            </CloseButton>
          </PanelHeader>
          <PanelBody>
            <SearchForm action={searchHref} method="get">
              <SearchField>
                <AppIcon name="search" size={15} />
                <SearchInput
                  aria-label={searchCopy.label || "Search published news"}
                  autoFocus
                  defaultValue={searchQuery}
                  name="q"
                  placeholder={searchCopy.placeholder || "Search published stories"}
                  type="search"
                />
              </SearchField>
              {countryQuery ? <input name="country" type="hidden" value={countryQuery} /> : null}
              <SearchButton onClick={onClose} type="submit">
                <AppIcon name="search" size={14} />
                {searchCopy.submitAction || "Search"}
              </SearchButton>
            </SearchForm>
          </PanelBody>
        </SearchPanel>
      </Overlay>
    );
  }

  return (
    <Overlay onClick={onClose} role="presentation">
      <Panel
        $mode="menu"
        aria-label={accessibility.mobileMenu || "Mobile navigation menu"}
        onClick={(event) => event.stopPropagation()}
      >
        <PanelHeader>
          <PanelCopy>
            <PanelEyebrow>{messages.site.navigation.news || "News"}</PanelEyebrow>
            <PanelTitle>{messages.site.title}</PanelTitle>
          </PanelCopy>
          <CloseButton aria-label={accessibility.closeMenu || "Close menu"} onClick={onClose} type="button">
            <AppIcon name="x" size={16} />
          </CloseButton>
        </PanelHeader>

        <PanelBody>
          <QuickGrid>
            {primaryLinks
              .filter((item) => item.key !== "search")
              .map((item) => (
                <QuickLink
                  href={item.href}
                  key={item.key}
                  onClick={onClose}
                  $active={isNavigationActive(pathname, item.href)}
                >
                  <AppIcon name={item.icon} size={15} />
                  {item.label}
                </QuickLink>
              ))}
          </QuickGrid>

          <SectionStack>
            {categoryLinks.length ? (
              <Disclosure>
                <DisclosureSummary>
                  <DisclosureLead>
                    <AppIcon name="tag" size={15} />
                    {messages.site.navigation.categories || "Categories"}
                  </DisclosureLead>
                  <DisclosureMeta>
                    <CountPill>{categoryLinks.length}</CountPill>
                    <AppIcon name="chevron-down" size={14} />
                  </DisclosureMeta>
                </DisclosureSummary>
                <DisclosureBody>
                  <List>
                    {categoryLinks.map((category) => (
                      <ListLink href={category.path} key={category.slug} onClick={onClose}>
                        <ListLabel>
                          <span aria-hidden="true">{category.logoEmoji || "N"}</span>
                          <ListText>{category.name}</ListText>
                        </ListLabel>
                        <span>{category.count}</span>
                      </ListLink>
                    ))}
                  </List>
                </DisclosureBody>
              </Disclosure>
            ) : null}

            {countryLinks.length ? (
              <Disclosure>
                <DisclosureSummary>
                  <DisclosureLead>
                    <AppIcon name="globe" size={15} />
                    {messages.site.navigation.countriesRegions || "Countries/Regions"}
                  </DisclosureLead>
                  <DisclosureMeta>
                    <CountPill>{countryLinks.length}</CountPill>
                    <AppIcon name="chevron-down" size={14} />
                  </DisclosureMeta>
                </DisclosureSummary>
                <DisclosureBody>
                  <List>
                    {countryLinks.map((country) => (
                      <ListLink href={country.path} key={country.value} onClick={onClose}>
                        <ListLabel>
                          {renderCountryItem(country)}
                          <ListText>{country.label}</ListText>
                        </ListLabel>
                        <span>{country.count}</span>
                      </ListLink>
                    ))}
                  </List>
                </DisclosureBody>
              </Disclosure>
            ) : null}
          </SectionStack>
        </PanelBody>

        <Footer>
          <FooterLink href={searchHref} onClick={onClose}>
            <AppIcon name="search" size={14} />
            {messages.site.navigation.search || "Search"}
          </FooterLink>
          <FooterLink href={privacyHref} onClick={onClose}>
            <AppIcon name="lock" size={14} />
            {legalNavigation.privacy || "Privacy"}
          </FooterLink>
          <FooterLink href={disclaimerHref} onClick={onClose}>
            <AppIcon name="shield" size={14} />
            {legalNavigation.disclaimer || "Disclaimer"}
          </FooterLink>
        </Footer>
      </Panel>
    </Overlay>
  );
}
