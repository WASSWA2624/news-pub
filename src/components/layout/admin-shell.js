"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import AdminLogoutButton from "@/components/auth/admin-logout-button";
import EquipLogo from "@/components/common/equip-logo";
import { defaultLocale } from "@/features/i18n/config";
import { buildLocaleRootPath } from "@/features/i18n/routing";
import { getAdminNavigation } from "@/lib/auth/rbac";

const MOBILE_BREAKPOINT = 720;
const DESKTOP_BREAKPOINT = 1220;

const MOBILE_PRIMARY_KEYS = Object.freeze([
  "dashboard",
  "generate",
  "drafts",
  "published",
  "comments",
]);

const TABLET_PRIMARY_KEYS = Object.freeze([...MOBILE_PRIMARY_KEYS, "media"]);

const DESKTOP_PRIMARY_KEYS = Object.freeze([...TABLET_PRIMARY_KEYS, "jobs", "categories"]);
const PRIMARY_NAV_GAP_PX = 2;

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

  if (targetPath === "/admin") {
    return currentPath === targetPath;
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function getViewportWidth() {
  if (typeof window === "undefined") {
    return DESKTOP_BREAKPOINT;
  }

  return window.innerWidth;
}

function getPrimaryKeysForViewport(viewportWidth) {
  if (viewportWidth < MOBILE_BREAKPOINT) {
    return MOBILE_PRIMARY_KEYS;
  }

  if (viewportWidth < DESKTOP_BREAKPOINT) {
    return TABLET_PRIMARY_KEYS;
  }

  return DESKTOP_PRIMARY_KEYS;
}

function distributeNavigationItems(items, pathname, primaryKeys) {
  const primaryLookup = new Set(primaryKeys);
  let primaryItems = items.filter((item) => primaryLookup.has(item.key));
  const activeItem = items.find((item) => isNavigationActive(pathname, item.href)) || null;
  const maxPrimaryItems = primaryKeys.filter((key) => items.some((item) => item.key === key)).length;

  if (activeItem && !primaryItems.some((item) => item.key === activeItem.key)) {
    primaryItems = [...primaryItems, activeItem];

    while (primaryItems.length > maxPrimaryItems) {
      let removableIndex = -1;

      for (let index = primaryItems.length - 1; index >= 0; index -= 1) {
        if (primaryItems[index].key !== activeItem.key) {
          removableIndex = index;
          break;
        }
      }

      if (removableIndex === -1) {
        break;
      }

      primaryItems = primaryItems.filter((_, index) => index !== removableIndex);
    }
  }

  const primaryItemKeys = new Set(primaryItems.map((item) => item.key));
  const overflowItems = items.filter((item) => !primaryItemKeys.has(item.key));

  return {
    overflowItems,
    primaryItems,
  };
}

function getCollectionWidth(items, widthsByKey) {
  if (!items.length) {
    return 0;
  }

  return items.reduce((totalWidth, item, index) => {
    const itemWidth = widthsByKey[item.key] || 0;

    return totalWidth + itemWidth + (index > 0 ? PRIMARY_NAV_GAP_PX : 0);
  }, 0);
}

function areWidthMapsEqual(leftMap, rightMap) {
  const leftKeys = Object.keys(leftMap);
  const rightKeys = Object.keys(rightMap);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => leftMap[key] === rightMap[key]);
}

function normalizeIdentityLabel(value) {
  return `${value || ""}`
    .replace(/_/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function distributeNavigationItemsByWidth(items, pathname, widthsByKey, availableWidth) {
  if (!items.length || !availableWidth) {
    return null;
  }

  const hasCompleteMeasurements = items.every((item) => Number.isFinite(widthsByKey[item.key]));

  if (!hasCompleteMeasurements) {
    return null;
  }

  const activeItem = items.find((item) => isNavigationActive(pathname, item.href)) || null;
  const visibleItems = [];
  const hiddenItems = [];

  for (const item of items) {
    const nextWidth = getCollectionWidth([...visibleItems, item], widthsByKey);

    if (!visibleItems.length || nextWidth <= availableWidth) {
      visibleItems.push(item);
    } else {
      hiddenItems.push(item);
    }
  }

  if (activeItem && hiddenItems.some((item) => item.key === activeItem.key)) {
    const promotedVisibleItems = [...visibleItems];

    while (
      promotedVisibleItems.length > 1 &&
      getCollectionWidth([...promotedVisibleItems, activeItem], widthsByKey) > availableWidth
    ) {
      const removableIndex = promotedVisibleItems.findLastIndex((item) => item.key !== activeItem.key);

      if (removableIndex === -1) {
        break;
      }

      promotedVisibleItems.splice(removableIndex, 1);
    }

    const activeVisibleItems = [...promotedVisibleItems, activeItem];
    const activeVisibleKeys = new Set(activeVisibleItems.map((item) => item.key));

    return {
      overflowItems: items.filter((item) => !activeVisibleKeys.has(item.key)),
      primaryItems: items.filter((item) => activeVisibleKeys.has(item.key)),
    };
  }

  const visibleKeys = new Set(visibleItems.map((item) => item.key));

  return {
    overflowItems: items.filter((item) => !visibleKeys.has(item.key)),
    primaryItems: items.filter((item) => visibleKeys.has(item.key)),
  };
}

const Shell = styled.div`
  background:
    radial-gradient(circle at top left, rgba(152, 176, 205, 0.24), transparent 24%),
    radial-gradient(circle at 88% 22%, rgba(255, 255, 255, 0.84), transparent 26%),
    linear-gradient(180deg, #f7f8fc 0%, #eef2f9 55%, #edf1f8 100%);
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
`;

const HeaderSurface = styled.div`
  background:
    radial-gradient(circle at top right, rgba(38, 138, 164, 0.36), transparent 24%),
    radial-gradient(circle at 8% 12%, rgba(255, 255, 255, 0.08), transparent 20%),
    linear-gradient(135deg, #11273d 0%, #17374d 44%, #0f6177 100%);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 22px 48px rgba(16, 32, 51, 0.16);
  overflow: visible;
  position: relative;

  &::before {
    background:
      radial-gradient(circle at center, rgba(255, 255, 255, 0.03) 0, transparent 56%),
      repeating-linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.02) 0,
        rgba(255, 255, 255, 0.02) 1px,
        transparent 1px,
        transparent 7px
      );
    content: "";
    inset: 0;
    pointer-events: none;
    position: absolute;
  }
`;

const HeaderInner = styled.div`
  display: grid;
  gap: 0.35rem;
  margin: 0 auto;
  max-width: 1560px;
  padding:
    clamp(0.2rem, 0.7vw, 0.35rem)
    clamp(0.3rem, 1vw, 0.7rem)
    clamp(0.2rem, 0.7vw, 0.35rem);
  position: relative;
  width: 100%;

  @media (max-width: 479px) {
    padding:
      0.4rem
      0.3rem
      0.4rem;
  }
`;

const MobileHeaderLayout = styled.div`
  display: grid;
  gap: 0.32rem;

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    display: none;
  }
`;

const DesktopBar = styled.div`
  display: none;

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    align-items: center;
    display: grid;
    gap: 0.45rem;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
  }
`;

const TopRow = styled.div`
  align-items: start;
  display: grid;
  gap: 0.42rem;
  grid-template-columns: minmax(0, 1fr) auto;
`;

const BrandLink = styled(Link)`
  align-items: start;
  color: white;
  display: inline-flex;
  gap: 0.48rem;
  min-width: 0;

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    align-items: center;
    gap: 0.55rem;
  }
`;

const BrandCopy = styled.span`
  display: grid;
  gap: 0;
  min-width: 0;
`;

const BrandTitle = styled.span`
  font-size: clamp(0.9rem, 1.4vw, 1rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.05;
`;

const UserBadge = styled.div`
  align-items: center;
  backdrop-filter: blur(14px);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  display: grid;
  gap: 0.35rem;
  grid-template-columns: minmax(0, 1fr);
  justify-self: end;
  max-width: min(100%, 20rem);
  padding: 0.35rem 0.5rem;
  width: fit-content;

  @media (min-width: 480px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    gap: 0.45rem;
    padding: 0.32rem 0.48rem;
  }
`;

const UserCopy = styled.div`
  display: grid;
  gap: 0.05rem;
  min-width: 0;
`;

const UserName = styled.strong`
  color: white;
  font-size: clamp(0.76rem, 1vw, 0.84rem);
  line-height: 1.08;
`;

const UserMeta = styled.span`
  color: rgba(242, 247, 252, 0.84);
  font-size: clamp(0.64rem, 0.9vw, 0.72rem);
  line-height: 1.18;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RolePill = styled.span`
  align-items: center;
  background: rgba(185, 205, 192, 0.18);
  border: 1px solid rgba(215, 228, 217, 0.22);
  border-radius: 999px;
  color: rgba(246, 250, 247, 0.92);
  display: none;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 0.28rem 0.5rem;
  text-transform: uppercase;
  white-space: nowrap;

  @media (min-width: 640px) {
    display: inline-flex;
  }
`;

const NavRow = styled.div`
  align-items: center;
  display: grid;
  gap: 0.35rem;
  grid-template-columns: minmax(0, 1fr) auto;
`;

const PrimaryNavScroller = styled.div`
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 0.1rem;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const PrimaryNav = styled.nav`
  display: inline-flex;
  gap: 0.12rem;
  min-width: max-content;

  @media (max-width: 479px) {
    gap: 0.08rem;
  }
`;

const PrimaryNavLink = styled(Link)`
  align-items: center;
  background: ${({ $active }) => ($active ? "rgba(31, 49, 76, 0.58)" : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? "rgba(255, 255, 255, 0.08)" : "transparent")};
  border-radius: 14px;
  color: ${({ $active }) => ($active ? "white" : "rgba(244, 248, 252, 0.94)")};
  display: inline-flex;
  font-size: clamp(0.76rem, 0.95vw, 0.84rem);
  font-weight: ${({ $active }) => ($active ? 800 : 700)};
  letter-spacing: -0.02em;
  min-height: 34px;
  padding: 0 0.62rem;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform 160ms ease;
  white-space: nowrap;

  @media (max-width: 479px) {
    font-size: 0.72rem;
    min-height: 30px;
    padding: 0 0.42rem;
  }

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    min-height: 32px;
    padding: 0 0.58rem;
  }

  &:hover {
    background: ${({ $active }) =>
      $active ? "rgba(31, 49, 76, 0.64)" : "rgba(255, 255, 255, 0.08)"};
    color: white;
    transform: translateY(-1px);
  }
`;

const MenuWrap = styled.div`
  position: relative;
`;

const OverflowButton = styled.button`
  align-items: center;
  backdrop-filter: blur(14px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: white;
  cursor: pointer;
  display: inline-grid;
  height: 34px;
  justify-items: center;
  padding: 0;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
  width: 34px;

  @media (max-width: 479px) {
    height: 30px;
    width: 30px;
  }

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    height: 32px;
    width: 32px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
  }
`;

const OverflowDots = styled.span`
  display: grid;
  gap: 0.14rem;
  justify-items: center;
`;

const OverflowDot = styled.span`
  background: currentColor;
  border-radius: 999px;
  display: block;
  height: 3px;
  opacity: 0.96;
  width: 3px;
`;

const MeasureNav = styled.div`
  left: -9999px;
  pointer-events: none;
  position: absolute;
  top: -9999px;
  visibility: hidden;
`;

const MeasureNavRail = styled.div`
  display: inline-flex;
  gap: ${PRIMARY_NAV_GAP_PX}px;
`;

const MeasureNavItem = styled.span`
  align-items: center;
  border: 1px solid transparent;
  border-radius: 14px;
  display: inline-flex;
  font-size: clamp(0.76rem, 0.95vw, 0.84rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  min-height: 34px;
  padding: 0 0.62rem;
  white-space: nowrap;

  @media (max-width: 479px) {
    font-size: 0.72rem;
    min-height: 30px;
    padding: 0 0.42rem;
  }

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    min-height: 32px;
    padding: 0 0.58rem;
  }
`;

const OverflowMenu = styled.div`
  backdrop-filter: blur(20px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(245, 248, 252, 0.98)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.08), transparent 44%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 22px;
  box-shadow:
    0 18px 40px rgba(16, 32, 51, 0.14),
    0 6px 14px rgba(16, 32, 51, 0.08);
  display: ${({ $open }) => ($open ? "grid" : "none")};
  gap: 0.2rem;
  min-width: min(calc(100vw - 1.4rem), 296px);
  overflow: hidden;
  position: absolute;
  right: 0;
  top: calc(100% + 0.45rem);
  width: min(calc(100vw - 1.4rem), 296px);
  z-index: 50;
`;

const OverflowSection = styled.div`
  display: grid;
  gap: 0.38rem;
  padding: 0.75rem;
`;

const OverflowSectionTitle = styled.span`
  color: rgba(80, 92, 115, 0.92);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  padding: 0 0.2rem;
  text-transform: uppercase;
`;

const OverflowList = styled.div`
  display: grid;
  gap: 0.24rem;
`;

const OverflowLink = styled(Link)`
  align-items: center;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(180deg, rgba(36, 75, 115, 0.12), rgba(36, 75, 115, 0.08))"
      : "rgba(255, 255, 255, 0.8)"};
  border: 1px solid ${({ $active }) => ($active ? "rgba(36, 75, 115, 0.14)" : "rgba(16, 32, 51, 0.06)")};
  border-radius: 15px;
  color: ${({ $active }) => ($active ? "#244b73" : "#182742")};
  display: grid;
  gap: 0.2rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  font-size: 0.9rem;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  letter-spacing: -0.02em;
  min-height: 52px;
  padding: 0.72rem 0.8rem;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;

  &:hover {
    background: rgba(36, 75, 115, 0.06);
    border-color: rgba(36, 75, 115, 0.12);
    color: #244b73;
    transform: translateY(-1px);
  }
`;

const OverflowLinkDot = styled.span`
  background: ${({ $active }) => ($active ? "#244b73" : "rgba(36, 75, 115, 0.34)")};
  border-radius: 999px;
  display: block;
  height: 6px;
  width: 6px;
`;

const OverflowLinkText = styled.div`
  display: grid;
  gap: 0.08rem;
  min-width: 0;
`;

const OverflowLinkLabel = styled.span`
  display: block;
  min-width: 0;
`;

const OverflowLinkHint = styled.span`
  color: rgba(80, 92, 115, 0.9);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.2;
`;

const OverflowLinkChevron = styled.span`
  color: rgba(80, 92, 115, 0.8);
  font-size: 0.9rem;
  line-height: 1;
`;

const OverflowActions = styled.div`
  display: grid;
  gap: 0.45rem;
`;

const OverflowActionLink = styled(Link)`
  align-items: center;
  background: rgba(36, 75, 115, 0.05);
  border: 1px solid rgba(36, 75, 115, 0.08);
  border-radius: 999px;
  color: #244b73;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  justify-content: center;
  min-height: 40px;
  padding: 0 0.9rem;
`;

const OverflowLogoutButton = styled(AdminLogoutButton)`
  background: linear-gradient(180deg, #244b73, #1d3d5e);
  border-color: transparent;
  display: inline-flex;
  font-size: 0.84rem;
  justify-content: center;
  min-height: 40px;
  width: 100%;
`;

const Main = styled.div`
  flex: 1;
`;

export default function AdminShell({ children, messages, user }) {
  const pathname = usePathname();
  const menuRef = useRef(null);
  const primaryNavViewportRef = useRef(null);
  const measurementRefs = useRef({});
  const [openMenuContext, setOpenMenuContext] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(DESKTOP_BREAKPOINT);
  const [navViewportWidth, setNavViewportWidth] = useState(0);
  const [navItemWidths, setNavItemWidths] = useState({});
  const publicSiteHref = buildLocaleRootPath(defaultLocale);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(getViewportWidth());
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpenMenuContext(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const navigationItems = useMemo(() => {
    return getAdminNavigation(user).map((item) => ({
      ...item,
      label: messages.admin.navigation[item.key] || item.key,
    }));
  }, [messages.admin.navigation, user]);

  useEffect(() => {
    function syncNavMeasurements() {
      const nextWidths = {};

      for (const item of navigationItems) {
        const measurementNode = measurementRefs.current[item.key];

        if (measurementNode) {
          nextWidths[item.key] = Math.ceil(measurementNode.getBoundingClientRect().width);
        }
      }

      const nextViewportWidth = Math.ceil(primaryNavViewportRef.current?.clientWidth || 0);

      setNavViewportWidth((currentWidth) =>
        currentWidth === nextViewportWidth ? currentWidth : nextViewportWidth,
      );
      setNavItemWidths((currentWidths) =>
        areWidthMapsEqual(currentWidths, nextWidths) ? currentWidths : nextWidths,
      );
    }

    syncNavMeasurements();

    const observedNode = primaryNavViewportRef.current;

    if (!observedNode || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      syncNavMeasurements();
    });

    observer.observe(observedNode);

    return () => {
      observer.disconnect();
    };
  }, [navigationItems, viewportWidth]);

  const primaryKeys = getPrimaryKeysForViewport(viewportWidth);
  const widthDrivenDistribution = useMemo(() => {
    return distributeNavigationItemsByWidth(navigationItems, pathname, navItemWidths, navViewportWidth);
  }, [navigationItems, pathname, navItemWidths, navViewportWidth]);
  const fallbackDistribution = useMemo(() => {
    return distributeNavigationItems(navigationItems, pathname, primaryKeys);
  }, [navigationItems, pathname, primaryKeys]);
  const { overflowItems, primaryItems } = widthDrivenDistribution || fallbackDistribution;

  const menuContext = `${pathname}:${primaryKeys.join("|")}`;
  const isOverflowOpen = openMenuContext === menuContext;
  const roleLabel = user.role.replace(/_/g, " ");
  const shouldShowRolePill = normalizeIdentityLabel(user.name) !== normalizeIdentityLabel(roleLabel);

  function renderPrimaryNavigation() {
    return primaryItems.map((item) => {
      const isActive = isNavigationActive(pathname, item.href);

      return (
        <PrimaryNavLink
          aria-current={isActive ? "page" : undefined}
          href={item.href}
          key={item.key}
          onClick={() => setOpenMenuContext(null)}
          $active={isActive}
        >
          {item.label}
        </PrimaryNavLink>
      );
    });
  }

  function renderOverflowNavigation() {
    return overflowItems.map((item) => {
      const isActive = isNavigationActive(pathname, item.href);

      return (
        <OverflowLink
          aria-current={isActive ? "page" : undefined}
          href={item.href}
          key={item.key}
          onClick={() => setOpenMenuContext(null)}
          $active={isActive}
        >
          <OverflowLinkDot aria-hidden="true" $active={isActive} />
          <OverflowLinkText>
            <OverflowLinkLabel>{item.label}</OverflowLinkLabel>
            <OverflowLinkHint>{isActive ? "Current section" : "Open section"}</OverflowLinkHint>
          </OverflowLinkText>
          <OverflowLinkChevron aria-hidden="true">&gt;</OverflowLinkChevron>
        </OverflowLink>
      );
    });
  }

  return (
    <Shell>
      <MeasureNav aria-hidden="true">
        <MeasureNavRail>
          {navigationItems.map((item) => (
            <MeasureNavItem
              key={item.key}
              ref={(node) => {
                if (node) {
                  measurementRefs.current[item.key] = node;
                }
              }}
            >
              {item.label}
            </MeasureNavItem>
          ))}
        </MeasureNavRail>
      </MeasureNav>

      <Header>
        <HeaderSurface>
          <HeaderInner>
            {viewportWidth >= DESKTOP_BREAKPOINT ? (
              <DesktopBar>
                <BrandLink href="/admin">
                  <EquipLogo size={34} />
                  <BrandCopy>
                    <BrandTitle>{messages.admin.title}</BrandTitle>
                  </BrandCopy>
                </BrandLink>

                <PrimaryNavScroller ref={primaryNavViewportRef}>
                  <PrimaryNav aria-label="Admin navigation">{renderPrimaryNavigation()}</PrimaryNav>
                </PrimaryNavScroller>

                <MenuWrap ref={menuRef}>
                  <OverflowButton
                    aria-controls="admin-overflow-navigation"
                    aria-expanded={isOverflowOpen}
                    aria-label={isOverflowOpen ? "Close more menu" : "Open more menu"}
                    onClick={() =>
                      setOpenMenuContext((currentValue) =>
                        currentValue === menuContext ? null : menuContext,
                      )
                    }
                    type="button"
                  >
                    <OverflowDots aria-hidden="true">
                      <OverflowDot />
                      <OverflowDot />
                      <OverflowDot />
                    </OverflowDots>
                  </OverflowButton>

                  <OverflowMenu $open={isOverflowOpen} id="admin-overflow-navigation">
                    {overflowItems.length ? (
                      <OverflowSection>
                        <OverflowSectionTitle>Hidden Navigation</OverflowSectionTitle>
                        <OverflowList>{renderOverflowNavigation()}</OverflowList>
                      </OverflowSection>
                    ) : null}

                    <OverflowSection>
                      <OverflowSectionTitle>Workspace</OverflowSectionTitle>
                      <OverflowActions>
                        <OverflowActionLink href={publicSiteHref} onClick={() => setOpenMenuContext(null)}>
                          Open public site
                        </OverflowActionLink>
                        <OverflowLogoutButton />
                      </OverflowActions>
                    </OverflowSection>
                  </OverflowMenu>
                </MenuWrap>

                <UserBadge aria-label="Authenticated admin">
                  <UserCopy>
                    <UserName>{user.name}</UserName>
                    <UserMeta>{user.email}</UserMeta>
                  </UserCopy>
                  {shouldShowRolePill ? <RolePill>{roleLabel}</RolePill> : null}
                </UserBadge>
              </DesktopBar>
            ) : (
              <MobileHeaderLayout>
                <TopRow>
                  <BrandLink href="/admin">
                    <EquipLogo size={32} />
                    <BrandCopy>
                      <BrandTitle>{messages.admin.title}</BrandTitle>
                    </BrandCopy>
                  </BrandLink>

                  <UserBadge aria-label="Authenticated admin">
                    <UserCopy>
                      <UserName>{user.name}</UserName>
                      <UserMeta>{user.email}</UserMeta>
                    </UserCopy>
                    {shouldShowRolePill ? <RolePill>{roleLabel}</RolePill> : null}
                  </UserBadge>
                </TopRow>

                <NavRow>
                  <PrimaryNavScroller ref={primaryNavViewportRef}>
                    <PrimaryNav aria-label="Admin navigation">{renderPrimaryNavigation()}</PrimaryNav>
                  </PrimaryNavScroller>

                  <MenuWrap ref={menuRef}>
                    <OverflowButton
                      aria-controls="admin-overflow-navigation"
                      aria-expanded={isOverflowOpen}
                      aria-label={isOverflowOpen ? "Close more menu" : "Open more menu"}
                      onClick={() =>
                        setOpenMenuContext((currentValue) =>
                          currentValue === menuContext ? null : menuContext,
                        )
                      }
                      type="button"
                    >
                      <OverflowDots aria-hidden="true">
                        <OverflowDot />
                        <OverflowDot />
                        <OverflowDot />
                      </OverflowDots>
                    </OverflowButton>

                    <OverflowMenu $open={isOverflowOpen} id="admin-overflow-navigation">
                      {overflowItems.length ? (
                        <OverflowSection>
                          <OverflowSectionTitle>Hidden Navigation</OverflowSectionTitle>
                          <OverflowList>{renderOverflowNavigation()}</OverflowList>
                        </OverflowSection>
                      ) : null}

                      <OverflowSection>
                        <OverflowSectionTitle>Workspace</OverflowSectionTitle>
                        <OverflowActions>
                          <OverflowActionLink href={publicSiteHref} onClick={() => setOpenMenuContext(null)}>
                            Open public site
                          </OverflowActionLink>
                          <OverflowLogoutButton />
                        </OverflowActions>
                      </OverflowSection>
                    </OverflowMenu>
                  </MenuWrap>
                </NavRow>
              </MobileHeaderLayout>
            )}
          </HeaderInner>
        </HeaderSurface>
      </Header>

      <Main>{children}</Main>
    </Shell>
  );
}
