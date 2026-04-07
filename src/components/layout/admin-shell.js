"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import AdminLogoutButton from "@/components/auth/admin-logout-button";
import AppIcon from "@/components/common/app-icon";
import NewsPubLogo from "@/components/common/news-pub-logo";
import { defaultLocale } from "@/features/i18n/config";
import { buildLocaleRootPath } from "@/features/i18n/routing";
import { getAdminNavigation } from "@/lib/auth/rbac";

/**
 * Responsive NewsPub admin shell that adapts navigation density by viewport.
 */
const MOBILE_BREAKPOINT = 720;
const DESKTOP_BREAKPOINT = 1220;
const TABLET_HEADER_BREAKPOINT = 720;

const MOBILE_PRIMARY_KEYS = Object.freeze(["dashboard", "review", "published"]);

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

function getAdminNavigationLabel(messages, key) {
  const adminMessages = messages?.admin || {};

  return adminMessages.navigation?.[key] || adminMessages[key]?.title || key;
}

function getAdminShellTitle(title) {
  return `${title || "NewsPub"}`.replace(/\s+admin$/i, "").trim() || "NewsPub";
}

function getUserFirstNameInitials(name) {
  const normalizedName = `${name || ""}`.trim();

  if (!normalizedName) {
    return "A";
  }

  const [firstName] = normalizedName.split(/\s+/);
  const letters = firstName.replace(/[^a-z0-9]/gi, "").slice(0, 2);

  return (letters || firstName.slice(0, 1) || "A").toUpperCase();
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
    radial-gradient(circle at top left, rgba(130, 166, 198, 0.18), transparent 26%),
    radial-gradient(circle at 88% 16%, rgba(255, 255, 255, 0.78), transparent 24%),
    linear-gradient(180deg, #f7f9fc 0%, #f0f4fa 54%, #edf2f9 100%);
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
    radial-gradient(circle at top right, rgba(38, 138, 164, 0.3), transparent 24%),
    radial-gradient(circle at 8% 12%, rgba(255, 255, 255, 0.07), transparent 20%),
    linear-gradient(135deg, #102438 0%, #163248 46%, #0f5d73 100%);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 36px rgba(16, 32, 51, 0.12);
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
  gap: 0.2rem;
  margin: 0 auto;
  max-width: 1420px;
  padding:
    clamp(0.22rem, 0.65vw, 0.34rem)
    clamp(0.38rem, 0.95vw, 0.66rem)
    clamp(0.22rem, 0.65vw, 0.36rem);
  position: relative;
  width: 100%;

  @media (max-width: 479px) {
    padding:
      0.32rem
      0.28rem
      0.34rem;
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
    gap: 0.3rem;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
  }
`;

const TopRow = styled.div`
  align-items: start;
  display: grid;
  gap: 0.24rem;
  grid-template-columns: minmax(0, 1fr) auto;
`;

const BrandLink = styled(Link)`
  align-items: start;
  color: white;
  display: inline-flex;
  gap: 0.32rem;
  min-width: 0;

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    align-items: center;
    gap: 0.38rem;
  }
`;

const BrandCopy = styled.span`
  display: grid;
  gap: 0;
  min-width: 0;
`;

const BrandTitle = styled.span`
  font-size: clamp(0.84rem, 1.2vw, 0.96rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.05;
`;

const ProfileMenuWrap = styled.div`
  position: relative;
`;

const ProfileTrigger = styled.button`
  align-items: center;
  backdrop-filter: blur(14px);
  background:
    radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.2), transparent 44%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 10px 18px rgba(4, 14, 24, 0.18);
  color: white;
  cursor: pointer;
  display: inline-grid;
  height: 2.15rem;
  justify-self: end;
  padding: 0;
  place-items: center;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
  width: 2.15rem;

  &:hover {
    background:
      radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.24), transparent 46%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
    border-color: rgba(255, 255, 255, 0.22);
    transform: translateY(-1px);
  }
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
  backdrop-filter: blur(20px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.985), rgba(243, 247, 251, 0.975)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.05), transparent 40%);
  border: 1px solid rgba(16, 32, 51, 0.07);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    0 14px 28px rgba(16, 32, 51, 0.12),
    0 3px 8px rgba(16, 32, 51, 0.05);
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
  grid-template-columns: minmax(0, 1fr) auto;
`;

const PrimaryNavScroller = styled.div`
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 0.04rem;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

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
  position: relative;
`;

const OverflowButton = styled.button`
  align-items: center;
  backdrop-filter: blur(14px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--theme-radius-lg, 2px);
  color: white;
  cursor: pointer;
  display: inline-grid;
  height: 28px;
  justify-items: center;
  padding: 0;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
  width: 28px;

  @media (max-width: 479px) {
    height: 26px;
    width: 26px;
  }

  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    height: 28px;
    width: 28px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
  }
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
  backdrop-filter: blur(20px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(245, 248, 252, 0.98)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.08), transparent 44%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    0 16px 34px rgba(16, 32, 51, 0.14),
    0 6px 14px rgba(16, 32, 51, 0.08);
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

export default function AdminShell({ children, messages, user }) {
  const pathname = usePathname();
  const menuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const primaryNavViewportRef = useRef(null);
  const measurementRefs = useRef({});
  const [openMenuContext, setOpenMenuContext] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(null);
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
  }, [navigationItems, viewportWidth]);

  const effectiveViewportWidth = viewportWidth ?? MOBILE_BREAKPOINT;
  const isDesktopViewport =
    viewportWidth !== null && viewportWidth >= TABLET_HEADER_BREAKPOINT;
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
      const isActive = isNavigationActive(pathname, item.href);

      return (
        <PrimaryNavLink
          aria-current={isActive ? "page" : undefined}
          href={item.href}
          key={item.key}
          onClick={() => setOpenMenuContext(null)}
          $active={isActive}
        >
          {item.icon ? <AppIcon name={item.icon} size={14} /> : null}
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
          <OverflowLinkDot aria-hidden="true" $active={isActive}>
            {item.icon ? <AppIcon name={item.icon} size={14} /> : null}
          </OverflowLinkDot>
          <OverflowLinkText>
            <OverflowLinkLabel>{item.label}</OverflowLinkLabel>
            <OverflowLinkHint>{isActive ? "Current section" : "Open section"}</OverflowLinkHint>
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
              <DesktopBar>
                <BrandLink href="/admin">
                  <NewsPubLogo size={34} />
                  <BrandCopy>
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
                    <NewsPubLogo size={32} />
                    <BrandCopy>
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

                <NavRow>
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
