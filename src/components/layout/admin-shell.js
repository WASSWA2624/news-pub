"use client";

/**
 * Admin shell that frames authenticated NewsPub workspaces with shared navigation, status, and operator controls.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";

import AdminLogoutButton from "@/components/auth/admin-logout-button";
import AppIcon from "@/components/common/app-icon";
import NewsPubLogo from "@/components/common/news-pub-logo";
import { elevatedSurfaceCss } from "@/components/common/ui-surface";
import {
  adminShellUtils,
  DESKTOP_BREAKPOINT,
  MOBILE_BREAKPOINT,
  PRIMARY_NAV_GAP_PX,
  TABLET_HEADER_BREAKPOINT,
} from "@/components/layout/admin-shell.utils";
import { defaultLocale } from "@/features/i18n/config";
import { buildLocaleRootPath } from "@/features/i18n/routing";
import { getAdminNavigation } from "@/lib/auth/rbac";

/**
 * Responsive NewsPub admin shell that adapts navigation density by viewport.
 */
const {
  areWidthMapsEqual,
  distributeNavigationItems,
  distributeNavigationItemsByWidth,
  getAdminNavigationLabel,
  getAdminShellTitle,
  getPrimaryKeysForViewport,
  getUserFirstNameInitials,
  getViewportWidth,
  isNavigationActive,
  normalizeIdentityLabel,
} = adminShellUtils;

const Shell = styled.div`
  background:
    linear-gradient(180deg, #f7f9fc 0%, #eef3f8 52%, #edf2f7 100%),
    radial-gradient(circle at top left, rgba(130, 166, 198, 0.1), transparent 28%);
  color: var(--theme-text, #152844);
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
    linear-gradient(135deg, #102438 0%, #17364d 100%),
    radial-gradient(circle at top right, rgba(64, 162, 188, 0.12), transparent 28%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 24px rgba(16, 32, 51, 0.12);
  overflow: visible;
  position: relative;
`;

const HeaderInner = styled.div`
  display: grid;
  gap: 0.14rem;
  margin: 0 auto;
  max-width: 1420px;
  padding:
    clamp(0.14rem, 0.45vw, 0.24rem)
    clamp(0.36rem, 0.9vw, 0.62rem)
    clamp(0.14rem, 0.45vw, 0.24rem);
  position: relative;
  width: 100%;

  @media (max-width: 479px) {
    padding:
      0.24rem
      0.24rem
      0.26rem;
  }
`;

const MobileHeaderLayout = styled.div`
  display: grid;
  gap: 0.2rem;

  @media (min-width: ${TABLET_HEADER_BREAKPOINT}px) {
    display: none;
  }
`;

const DesktopBar = styled.div`
  display: none;

  @media (min-width: ${TABLET_HEADER_BREAKPOINT}px) {
    align-items: center;
    display: grid;
    column-gap: clamp(0.7rem, 1.25vw, 1.15rem);
    gap: 0.18rem;
    grid-template-columns: ${({ $hasOverflow }) =>
      $hasOverflow
        ? "auto minmax(0, 1fr) auto auto"
        : "auto minmax(0, 1fr) auto"};
  }
`;

const TopRow = styled.div`
  align-items: start;
  display: grid;
  gap: 0.24rem;
  grid-template-columns: minmax(0, 1fr) auto;
`;

const BrandLink = styled(Link)`
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(129, 212, 255, 0.16);
  border-radius: calc(var(--theme-radius-lg, 2px) + 1px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  color: white;
  display: inline-flex;
  gap: 0.5rem;
  min-width: 0;
  padding: 0.22rem 0.62rem 0.22rem 0.28rem;
  position: relative;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;

  &::after {
    background: linear-gradient(90deg, rgba(255, 214, 120, 0.72), rgba(123, 234, 255, 0.56));
    border-radius: 999px;
    content: "";
    height: 1.5px;
    left: 0.7rem;
    opacity: 0.78;
    position: absolute;
    right: 0.7rem;
    top: 0;
  }

  &:hover {
    border-color: rgba(145, 222, 255, 0.28);
  }

  &:focus-visible {
    outline: 2px solid rgba(165, 228, 255, 0.72);
    outline-offset: 2px;
  }

  @media (max-width: 479px) {
    gap: 0.38rem;
    padding: 0.2rem 0.48rem 0.2rem 0.24rem;
  }

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    gap: 0.56rem;
    padding-right: 0.7rem;
  }
`;

const BrandMark = styled.span`
  align-items: center;
  background:
    radial-gradient(circle at 26% 22%, rgba(255, 255, 255, 0.14), transparent 44%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.06));
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  display: inline-flex;
  flex: 0 0 auto;
  padding: 0.14rem;
`;

const BrandCopy = styled.span`
  display: grid;
  gap: 0.02rem;
  min-width: 0;
`;

const BrandTitle = styled.span`
  font-size: clamp(0.96rem, 1.28vw, 1.12rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.94;
  text-shadow: 0 1px 6px rgba(9, 22, 37, 0.18);
`;

const BrandMeta = styled.span`
  color: rgba(221, 242, 255, 0.84);
  font-size: 0.48rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  line-height: 1;
  text-transform: uppercase;
`;

const headerActionButtonCss = css`
  --header-action-size: 2.15rem;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  color: white;
  cursor: pointer;
  display: inline-grid;
  height: var(--header-action-size);
  padding: 0;
  place-items: center;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;

  @media (max-width: 479px) {
    --header-action-size: 2.05rem;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.22);
  }
`;

const ProfileMenuWrap = styled.div`
  align-items: center;
  display: flex;
  position: relative;
`;

const ProfileTrigger = styled.button`
  ${headerActionButtonCss}
  justify-self: end;
  min-width: var(--header-action-size);
  padding-inline: 0.54rem;
`;

const ProfileInitials = styled.span`
  align-items: center;
  color: white;
  display: inline-flex;
  font-size: 0.8rem;
  font-weight: 900;
  justify-content: center;
  letter-spacing: 0.08em;
  line-height: 1;
  text-indent: 0.08em;
  text-transform: uppercase;
`;

const ProfileMenu = styled.div`
  ${elevatedSurfaceCss}
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: 0 12px 24px rgba(16, 32, 51, 0.12);
  display: ${({ $open }) => ($open ? "grid" : "none")};
  gap: 0;
  min-width: min(calc(100vw - 1.2rem), 300px);
  overflow: hidden;
  position: absolute;
  right: 0;
  top: calc(100% + 0.35rem);
  width: min(calc(100vw - 1.2rem), 300px);
  z-index: 55;
`;

const ProfileHeader = styled.div`
  align-items: center;
  display: grid;
  gap: 0.55rem;
  grid-template-columns: auto minmax(0, 1fr);
`;

const ProfileInitialsBadge = styled.span`
  align-items: center;
  background:
    radial-gradient(circle at 28% 20%, rgba(255, 255, 255, 0.18), transparent 40%),
    linear-gradient(135deg, #214b69 0%, #17687c 100%);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 6px 14px rgba(22, 67, 92, 0.12);
  color: white;
  display: inline-flex;
  font-size: 0.94rem;
  font-weight: 900;
  height: 2.65rem;
  justify-content: center;
  letter-spacing: 0.08em;
  text-indent: 0.08em;
  width: 2.65rem;
`;

const ProfileCopy = styled.div`
  display: grid;
  gap: 0.12rem;
  min-width: 0;
`;

const ProfileName = styled.strong`
  color: #152844;
  font-size: 0.95rem;
  line-height: 1.14;
`;

const ProfileMeta = styled.span`
  color: rgba(92, 103, 124, 0.95);
  font-size: 0.78rem;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProfileRolePill = styled.span`
  align-items: center;
  background: linear-gradient(180deg, rgba(40, 77, 113, 0.07), rgba(40, 77, 113, 0.04));
  border: 1px solid rgba(36, 75, 115, 0.09);
  border-radius: var(--theme-radius-md, 1px);
  color: #244b73;
  display: inline-flex;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 0.24rem 0.44rem;
  text-transform: uppercase;
  white-space: nowrap;
`;

const NavRow = styled.div`
  align-items: center;
  display: grid;
  gap: 0.2rem;
  grid-template-columns: ${({ $hasOverflow }) =>
    $hasOverflow ? "minmax(0, 1fr) auto" : "minmax(0, 1fr)"};
`;

const PrimaryNavScroller = styled.div`
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 0.04rem;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  @media (min-width: ${TABLET_HEADER_BREAKPOINT}px) {
    justify-self: stretch;
    max-width: 100%;
    padding-left: clamp(0.55rem, 1.2vw, 1.05rem);
    width: 100%;
  }

  &::-webkit-scrollbar {
    display: none;
  }
`;

const PrimaryNav = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 0.14rem;
  min-width: max-content;

  @media (max-width: 479px) {
    gap: 0.02rem;
  }

  @media (min-width: ${TABLET_HEADER_BREAKPOINT}px) {
    margin-left: auto;
  }
`;

const PrimaryNavLink = styled(Link)`
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 0;
  color: ${({ $active }) => ($active ? "#ffffff" : "rgba(244, 248, 252, 0.88)")};
  display: inline-flex;
  gap: 0.32rem;
  font-size: clamp(0.76rem, 0.92vw, 0.88rem);
  font-weight: ${({ $active }) => ($active ? 800 : 650)};
  letter-spacing: -0.03em;
  min-height: 28px;
  padding: 0.08rem 0.36rem 0.18rem;
  position: relative;
  transition:
    color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
  white-space: nowrap;

  svg {
    display: block;
    height: 0.84rem;
    width: 0.84rem;
  }

  @media (max-width: 479px) {
    font-size: 0.74rem;
    min-height: 25px;
    padding: 0.06rem 0.24rem 0.16rem;
  }

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    min-height: 28px;
    padding: 0.06rem 0.34rem 0.18rem;
  }

  &::after {
    background: ${({ $active }) =>
      $active ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.42)"};
    border-radius: var(--theme-radius-lg, 2px);
    bottom: 0;
    content: "";
    height: ${({ $active }) => ($active ? "2px" : "1px")};
    left: 0.36rem;
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    position: absolute;
    right: 0.36rem;
    transform: translateY(0);
    transition:
      opacity 160ms ease,
      background 160ms ease;

    @media (max-width: 479px) {
      left: 0.24rem;
      right: 0.24rem;
    }

    @media (min-width: ${DESKTOP_BREAKPOINT}px) {
      left: 0.34rem;
      right: 0.34rem;
    }
  }

  &:hover {
    color: white;
    transform: translateY(-1px);

    &::after {
      opacity: 1;
    }
  }
`;

const MenuWrap = styled.div`
  align-items: center;
  display: flex;
  position: relative;
`;

const OverflowButton = styled.button`
  ${headerActionButtonCss}
  justify-items: center;
  width: var(--header-action-size);
`;

const OverflowDots = styled.span`
  display: grid;
  gap: 0.1rem;
  justify-items: center;
`;

const OverflowDot = styled.span`
  background: currentColor;
  border-radius: var(--theme-radius-lg, 2px);
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
  border-radius: var(--theme-radius-lg, 2px);
  display: inline-flex;
  gap: 0.32rem;
  font-size: clamp(0.76rem, 0.95vw, 0.84rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  min-height: 34px;
  padding: 0 0.62rem;
  white-space: nowrap;

  svg {
    display: block;
    height: 0.84rem;
    width: 0.84rem;
  }

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
  ${elevatedSurfaceCss}
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: 0 14px 28px rgba(16, 32, 51, 0.14);
  display: ${({ $open }) => ($open ? "grid" : "none")};
  gap: 0.14rem;
  min-width: min(calc(100vw - 1.2rem), 280px);
  overflow: hidden;
  position: absolute;
  right: 0;
  top: calc(100% + 0.32rem);
  width: min(calc(100vw - 1.2rem), 280px);
  z-index: 50;

  @media (max-width: 479px) {
    right: -0.2rem;
    width: min(calc(100vw - 0.8rem), 280px);
  }
`;

const OverflowSection = styled.div`
  display: grid;
  gap: 0.24rem;
  padding: 0.72rem 0.82rem;

  & + & {
    border-top: 1px solid rgba(16, 32, 51, 0.07);
  }
`;

const OverflowSectionTitle = styled.span`
  color: rgba(80, 92, 115, 0.88);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  padding: 0 0.05rem;
  text-transform: uppercase;
`;

const OverflowList = styled.div`
  display: grid;
  gap: 0.18rem;
`;

const OverflowLink = styled(Link)`
  align-items: center;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(180deg, rgba(36, 75, 115, 0.12), rgba(36, 75, 115, 0.08))"
      : "rgba(255, 255, 255, 0.8)"};
  border: 1px solid ${({ $active }) => ($active ? "rgba(36, 75, 115, 0.14)" : "rgba(16, 32, 51, 0.06)")};
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $active }) => ($active ? "#244b73" : "#182742")};
  display: grid;
  gap: 0.2rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  font-size: 0.86rem;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  letter-spacing: -0.02em;
  min-height: 42px;
  padding: 0.52rem 0.6rem;
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
  align-items: center;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(180deg, rgba(36, 75, 115, 0.14), rgba(36, 75, 115, 0.08))"
      : "rgba(36, 75, 115, 0.06)"};
  border: 1px solid ${({ $active }) => ($active ? "rgba(36, 75, 115, 0.14)" : "rgba(36, 75, 115, 0.08)")};
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $active }) => ($active ? "#244b73" : "rgba(36, 75, 115, 0.72)")};
  display: inline-flex;
  height: 1.8rem;
  justify-content: center;
  width: 1.8rem;

  svg {
    display: block;
    height: 0.88rem;
    width: 0.88rem;
  }
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
  display: inline-flex;

  svg {
    display: block;
    height: 0.9rem;
    width: 0.9rem;
  }
`;

const OverflowActions = styled.div`
  display: grid;
  gap: 0.32rem;
`;

const OverflowActionLink = styled(Link)`
  align-items: center;
  background: linear-gradient(180deg, rgba(36, 75, 115, 0.04), rgba(36, 75, 115, 0.02));
  border: 1px solid rgba(36, 75, 115, 0.08);
  border-radius: var(--theme-radius-md, 1px);
  color: #244b73;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  gap: 0.38rem;
  justify-content: center;
  min-height: 38px;
  padding: 0 0.72rem;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;

  &:hover {
    background: linear-gradient(180deg, rgba(36, 75, 115, 0.07), rgba(36, 75, 115, 0.04));
    border-color: rgba(36, 75, 115, 0.12);
    transform: translateY(-1px);
  }

  svg {
    display: block;
    height: 0.88rem;
    width: 0.88rem;
  }
`;

const OverflowLogoutButton = styled(AdminLogoutButton)`
  background: linear-gradient(180deg, #274c73, #234568);
  border-color: transparent;
  border-radius: var(--theme-radius-md, 1px);
  box-shadow: 0 8px 18px rgba(36, 75, 115, 0.16);
  display: inline-flex;
  font-size: 0.84rem;
  justify-content: center;
  min-height: 40px;
  width: 100%;
`;

const Main = styled.div`
  flex: 1;
  padding-bottom: 0.7rem;
`;

/**
 * Wraps authenticated admin pages with responsive primary navigation and workspace controls.
 *
 * @param {object} props - Shell content, messages, and authenticated user details.
 * @returns {JSX.Element} The rendered admin shell.
 */
export default function AdminShell({ children, messages, user }) {
  const pathname = usePathname();
  const menuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const primaryNavViewportRef = useRef(null);
  const measurementRefs = useRef({});
  const [openMenuContext, setOpenMenuContext] = useState(null);
  const [viewport_width, setViewportWidth] = useState(null);
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

      if (!profileMenuRef.current?.contains(event.target)) {
        setOpenMenuContext((currentValue) =>
          currentValue === "profile" ? null : currentValue,
        );
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
      label: getAdminNavigationLabel(messages, item.key),
    }));
  }, [messages, user]);

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
  }, [navigationItems, viewport_width]);

  const effectiveViewportWidth = viewport_width ?? MOBILE_BREAKPOINT;
  const isDesktopViewport =
    viewport_width !== null && viewport_width >= TABLET_HEADER_BREAKPOINT;
  const primaryKeys = getPrimaryKeysForViewport(effectiveViewportWidth);
  const widthDrivenDistribution = useMemo(() => {
    return distributeNavigationItemsByWidth(navigationItems, pathname, navItemWidths, navViewportWidth);
  }, [navigationItems, pathname, navItemWidths, navViewportWidth]);
  const fallbackDistribution = useMemo(() => {
    return distributeNavigationItems(navigationItems, pathname, primaryKeys);
  }, [navigationItems, pathname, primaryKeys]);
  const { overflowItems, primaryItems } = widthDrivenDistribution || fallbackDistribution;

  const menuContext = `${pathname}:${primaryKeys.join("|")}`;
  const isOverflowOpen = openMenuContext === menuContext;
  const isProfileMenuOpen = openMenuContext === "profile";
  const roleLabel = user.role.replace(/_/g, " ");
  const shouldShowRolePill = normalizeIdentityLabel(user.name) !== normalizeIdentityLabel(roleLabel);
  const userInitials = getUserFirstNameInitials(user.name);
  const shellTitle = getAdminShellTitle(messages.admin.title);

  function renderPrimaryNavigation() {
    return primaryItems.map((item) => {
      const is_active = isNavigationActive(pathname, item.href);

      return (
        <PrimaryNavLink
          aria-current={is_active ? "page" : undefined}
          href={item.href}
          key={item.key}
          onClick={() => setOpenMenuContext(null)}
          $active={is_active}
        >
          {item.icon ? <AppIcon name={item.icon} size={14} /> : null}
          {item.label}
        </PrimaryNavLink>
      );
    });
  }

  function renderOverflowNavigation() {
    return overflowItems.map((item) => {
      const is_active = isNavigationActive(pathname, item.href);

      return (
        <OverflowLink
          aria-current={is_active ? "page" : undefined}
          href={item.href}
          key={item.key}
          onClick={() => setOpenMenuContext(null)}
          $active={is_active}
        >
          <OverflowLinkDot aria-hidden="true" $active={is_active}>
            {item.icon ? <AppIcon name={item.icon} size={14} /> : null}
          </OverflowLinkDot>
          <OverflowLinkText>
            <OverflowLinkLabel>{item.label}</OverflowLinkLabel>
            <OverflowLinkHint>{is_active ? "Current section" : "Open section"}</OverflowLinkHint>
          </OverflowLinkText>
          <OverflowLinkChevron aria-hidden="true">
            <AppIcon name="chevron-right" size={14} />
          </OverflowLinkChevron>
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
              {item.icon ? <AppIcon name={item.icon} size={14} /> : null}
              {item.label}
            </MeasureNavItem>
          ))}
        </MeasureNavRail>
      </MeasureNav>

      <Header>
        <HeaderSurface>
          <HeaderInner>
            {isDesktopViewport ? (
              <DesktopBar $hasOverflow={overflowItems.length > 0}>
                <BrandLink href="/admin">
                  <BrandMark>
                    <NewsPubLogo size={34} />
                  </BrandMark>
                  <BrandCopy>
                    <BrandMeta>Publishing Desk</BrandMeta>
                    <BrandTitle>{shellTitle}</BrandTitle>
                  </BrandCopy>
                </BrandLink>

                <PrimaryNavScroller ref={primaryNavViewportRef}>
                  <PrimaryNav aria-label="Admin navigation">{renderPrimaryNavigation()}</PrimaryNav>
                </PrimaryNavScroller>

                {overflowItems.length ? (
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
                      <OverflowSection>
                        <OverflowSectionTitle>Hidden Navigation</OverflowSectionTitle>
                        <OverflowList>{renderOverflowNavigation()}</OverflowList>
                      </OverflowSection>
                    </OverflowMenu>
                  </MenuWrap>
                ) : null}

                <ProfileMenuWrap ref={profileMenuRef}>
                  <ProfileTrigger
                    aria-controls="admin-profile-menu"
                    aria-expanded={isProfileMenuOpen}
                    aria-label={isProfileMenuOpen ? "Close account menu" : "Open account menu"}
                    onClick={() =>
                      setOpenMenuContext((currentValue) =>
                        currentValue === "profile" ? null : "profile",
                      )
                    }
                    type="button"
                  >
                    <ProfileInitials aria-hidden="true">{userInitials}</ProfileInitials>
                  </ProfileTrigger>

                  <ProfileMenu $open={isProfileMenuOpen} id="admin-profile-menu">
                    <OverflowSection>
                      <ProfileHeader>
                        <ProfileInitialsBadge aria-hidden="true">{userInitials}</ProfileInitialsBadge>
                        <ProfileCopy>
                          <ProfileName>{user.name}</ProfileName>
                          <ProfileMeta>{user.email}</ProfileMeta>
                          {shouldShowRolePill ? <ProfileRolePill>{roleLabel}</ProfileRolePill> : null}
                        </ProfileCopy>
                      </ProfileHeader>
                    </OverflowSection>

                    <OverflowSection>
                      <OverflowSectionTitle>Workspace</OverflowSectionTitle>
                      <OverflowActions>
                        <OverflowActionLink
                          href={publicSiteHref}
                          onClick={() => setOpenMenuContext(null)}
                        >
                          <AppIcon name="external-link" size={14} />
                          Open public site
                        </OverflowActionLink>
                        <OverflowLogoutButton />
                      </OverflowActions>
                    </OverflowSection>
                  </ProfileMenu>
                </ProfileMenuWrap>
              </DesktopBar>
            ) : (
              <MobileHeaderLayout>
                <TopRow>
                  <BrandLink href="/admin">
                    <BrandMark>
                      <NewsPubLogo size={32} />
                    </BrandMark>
                    <BrandCopy>
                      <BrandMeta>Publishing Desk</BrandMeta>
                      <BrandTitle>{shellTitle}</BrandTitle>
                    </BrandCopy>
                  </BrandLink>

                  <ProfileMenuWrap ref={profileMenuRef}>
                    <ProfileTrigger
                      aria-controls="admin-profile-menu"
                      aria-expanded={isProfileMenuOpen}
                      aria-label={isProfileMenuOpen ? "Close account menu" : "Open account menu"}
                      onClick={() =>
                        setOpenMenuContext((currentValue) =>
                          currentValue === "profile" ? null : "profile",
                        )
                      }
                      type="button"
                    >
                      <ProfileInitials aria-hidden="true">{userInitials}</ProfileInitials>
                    </ProfileTrigger>

                    <ProfileMenu $open={isProfileMenuOpen} id="admin-profile-menu">
                      <OverflowSection>
                        <ProfileHeader>
                          <ProfileInitialsBadge aria-hidden="true">{userInitials}</ProfileInitialsBadge>
                          <ProfileCopy>
                            <ProfileName>{user.name}</ProfileName>
                            <ProfileMeta>{user.email}</ProfileMeta>
                            {shouldShowRolePill ? <ProfileRolePill>{roleLabel}</ProfileRolePill> : null}
                          </ProfileCopy>
                        </ProfileHeader>
                      </OverflowSection>

                      <OverflowSection>
                        <OverflowSectionTitle>Workspace</OverflowSectionTitle>
                        <OverflowActions>
                          <OverflowActionLink
                            href={publicSiteHref}
                            onClick={() => setOpenMenuContext(null)}
                          >
                            <AppIcon name="external-link" size={14} />
                            Open public site
                          </OverflowActionLink>
                          <OverflowLogoutButton />
                        </OverflowActions>
                      </OverflowSection>
                    </ProfileMenu>
                  </ProfileMenuWrap>
                </TopRow>

                <NavRow $hasOverflow={overflowItems.length > 0}>
                  <PrimaryNavScroller ref={primaryNavViewportRef}>
                    <PrimaryNav aria-label="Admin navigation">{renderPrimaryNavigation()}</PrimaryNav>
                  </PrimaryNavScroller>

                  {overflowItems.length ? (
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
                        <OverflowSection>
                          <OverflowSectionTitle>Hidden Navigation</OverflowSectionTitle>
                          <OverflowList>{renderOverflowNavigation()}</OverflowList>
                        </OverflowSection>
                      </OverflowMenu>
                    </MenuWrap>
                  ) : null}
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
