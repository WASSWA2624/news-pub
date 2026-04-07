"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import styled, { css } from "styled-components";

import AppIcon from "@/components/common/app-icon";
import NewsPubLogo from "@/components/common/news-pub-logo";
import ResponsiveImage from "@/components/common/responsive-image";
import { controlSurfaceCss, elevatedSurfaceCss, focusRingCss } from "@/components/common/ui-surface";
import { siteShellUtils } from "@/components/layout/site-shell.utils";
import PublicStorySearch from "@/components/layout/public-story-search";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";

const { isNavigationActive, normalizePathname, publicNavigationIcons } = siteShellUtils;

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Header = styled.header`
  background:
    radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.16), transparent 34%),
    radial-gradient(circle at top right, rgba(var(--theme-primary-rgb), 0.12), transparent 30%),
    linear-gradient(
      180deg,
      rgba(var(--theme-surface-rgb), 0.995) 0%,
      rgba(var(--theme-surface-rgb), 0.985) 58%,
      rgba(var(--theme-bg-rgb), 0.95) 100%
    );
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(var(--theme-primary-rgb), 0.18);
  box-shadow:
    0 18px 42px rgba(var(--theme-primary-rgb), 0.12),
    inset 0 -1px 0 rgba(255, 255, 255, 0.72);
  isolation: isolate;
  position: sticky;
  top: 0;
  z-index: 30;

  &::after {
    background: linear-gradient(
      90deg,
      rgba(var(--theme-accent-rgb), 0),
      rgba(var(--theme-primary-rgb), 0.28),
      rgba(var(--theme-accent-rgb), 0)
    );
    bottom: 0;
    content: "";
    height: 3px;
    left: 0;
    opacity: 0.95;
    position: absolute;
    right: 0;
  }
`;

const HeaderInner = styled.div`
  display: grid;
  gap: 0.34rem;
  margin: 0 auto;
  max-width: var(--theme-shell-max-width);
  padding: clamp(0.26rem, 0.95vw, 0.46rem) clamp(0.52rem, 1.45vw, 0.84rem);

  @media (min-width: 980px) {
    align-items: center;
    column-gap: clamp(0.9rem, 1.8vw, 1.55rem);
    gap: 0.38rem;
    grid-template-columns: auto minmax(0, 1fr) minmax(16.5rem, 22rem);
  }
`;

const HeaderBrandLogo = styled(NewsPubLogo)`
  flex: 0 0 auto;
  height: 30px;
  width: 30px;

  @media (min-width: 640px) {
    height: 34px;
    width: 34px;
  }
`;

const HeaderBrandLink = styled(Link)`
  align-items: center;
  background:
    linear-gradient(135deg, rgba(var(--theme-surface-rgb), 0.92), rgba(255, 255, 255, 0.84)),
    radial-gradient(circle at top left, rgba(var(--theme-accent-rgb), 0.12), transparent 48%);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.16);
  box-shadow:
    0 10px 24px rgba(var(--theme-primary-rgb), 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  color: ${({ theme }) => theme?.colors?.text ?? "var(--theme-text)"};
  display: inline-flex;
  gap: 0.46rem;
  min-width: 0;
  padding: 0.24rem 0.58rem 0.24rem 0.26rem;
  position: relative;

  &::after {
    background: linear-gradient(
      90deg,
      rgba(var(--theme-accent-rgb), 0.7),
      rgba(var(--theme-primary-rgb), 0.82),
      rgba(var(--theme-accent-rgb), 0.26)
    );
    content: "";
    height: 2px;
    left: 0.66rem;
    opacity: 0.84;
    position: absolute;
    right: 0.66rem;
    top: 0;
  }

  &:hover {
    border-color: rgba(var(--theme-primary-rgb), 0.24);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--theme-primary-rgb), 0.24);
    outline-offset: 2px;
  }
`;

const HeaderBrandMark = styled.span`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(var(--theme-primary-rgb), 0.12), rgba(var(--theme-primary-rgb), 0.05)),
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.32), transparent 46%);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
  display: inline-flex;
  flex: 0 0 auto;
  padding: 0.12rem;
`;

const HeaderBrandCopy = styled.span`
  display: grid;
  gap: 0.02rem;
  min-width: 0;
`;

const HeaderBrandEyebrow = styled.span`
  color: rgba(var(--theme-primary-rgb), 0.82);
  font-size: 0.48rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  line-height: 1;
  text-transform: uppercase;
`;

const HeaderBrandTitle = styled.span`
  font-size: clamp(1rem, 3vw, 1.34rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.96;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BrandLink = styled(Link)`
  align-items: center;
  color: ${({ theme }) => theme?.colors?.text ?? "var(--theme-text)"};
  display: inline-flex;
  gap: 0.42rem;
  min-width: 0;
`;

const BrandTitle = styled.span`
  font-size: clamp(1.1rem, 4.2vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HeaderMeta = styled.div`
  display: grid;
  gap: 0.1rem;
  min-width: 0;

  @media (min-width: 980px) {
    min-width: max-content;
    padding-right: clamp(0.36rem, 0.8vw, 0.66rem);
  }

  @media (max-width: 979px) {
    align-items: center;
    background:
      linear-gradient(135deg, rgba(var(--theme-surface-rgb), 0.99), rgba(255, 255, 255, 0.97)),
      radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.14), transparent 52%);
    border: 1px solid rgba(var(--theme-primary-rgb), 0.14);
    border-radius: 0;
    box-shadow:
      0 16px 30px rgba(var(--theme-primary-rgb), 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.78);
    display: flex;
    gap: 0.58rem;
    justify-content: space-between;
    padding: 0.34rem 0.46rem;
  }
`;

const HeaderTagline = styled.p`
  color: ${({ theme }) => theme?.colors?.muted ?? "var(--theme-muted)"};
  font-size: 0.82rem;
  line-height: 1.28;
  margin: 0;
  max-width: 58ch;

  @media (max-width: 979px) {
    display: none;
  }
`;

const MobileActionGroup = styled.div`
  display: inline-flex;
  gap: 0.36rem;

  @media (min-width: 980px) {
    display: none;
  }
`;

const MobileActionButton = styled.button`
  align-items: center;
  background: ${({ $tone }) => (
    $tone === "solid"
      ? "linear-gradient(135deg, rgba(var(--theme-primary-rgb), 0.96), rgba(var(--theme-story-accent-rgb), 0.92))"
      : "linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.98), rgba(255, 255, 255, 0.96))"
  )};
  border: 1px solid ${({ $tone }) => (
    $tone === "solid"
      ? "rgba(var(--theme-primary-rgb), 0.24)"
      : "rgba(var(--theme-border-rgb), 0.85)"
  )};
  border-radius: 0;
  box-shadow: ${({ $tone }) => (
    $tone === "solid"
      ? "0 16px 30px rgba(var(--theme-primary-rgb), 0.24)"
      : "0 10px 22px rgba(var(--theme-primary-rgb), 0.1)"
  )};
  color: ${({ $tone }) => ($tone === "solid" ? "white" : "var(--theme-text)")};
  cursor: pointer;
  display: inline-flex;
  height: 2.3rem;
  justify-content: center;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
  width: 2.3rem;

  &:hover {
    border-color: rgba(var(--theme-primary-rgb), 0.32);
    box-shadow: ${({ $tone }) => (
      $tone === "solid"
        ? "0 18px 34px rgba(var(--theme-primary-rgb), 0.28)"
        : "0 14px 26px rgba(var(--theme-primary-rgb), 0.14)"
    )};
    transform: translateY(-1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(var(--theme-primary-rgb), 0.14);
    outline: none;
  }

  svg {
    display: block;
    height: 1.02rem;
    width: 1.02rem;
  }
`;

const Navigation = styled.nav`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.28rem 0.38rem;
  overflow-x: auto;
  padding-bottom: 0.02rem;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 979px) {
    display: none;
  }

  @media (min-width: 980px) {
    align-items: center;
    justify-self: end;
    max-width: 100%;
    min-width: max-content;
    padding-left: clamp(0.24rem, 0.6vw, 0.5rem);
    overflow: visible;
    padding-bottom: 0;
  }
`;

const NavigationLink = styled(Link)`
  align-items: center;
  color: ${({ $active }) => ($active ? "var(--theme-primary)" : "var(--theme-text)")};
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: ${({ $active }) => ($active ? 800 : 700)};
  gap: 0.24rem;
  line-height: 1.2;
  min-height: 1.52rem;
  white-space: nowrap;

  svg {
    display: block;
    height: 0.88rem;
    width: 0.88rem;
  }
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
  border-radius: 0;
  color: ${({ $active, $open }) => ($open || $active ? "var(--theme-primary)" : "var(--theme-text)")};
  cursor: pointer;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: ${({ $active, $open }) => ($open || $active ? 800 : 700)};
  gap: 0.24rem;
  list-style: none;
  padding: 0.18rem 0.46rem;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  white-space: nowrap;

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

  svg {
    display: block;
    height: 0.88rem;
    width: 0.88rem;
  }
`;

const DropdownChevron = styled.span`
  color: inherit;
  display: inline-flex;
  transform: ${({ $open }) => ($open ? "translateY(1px) rotate(180deg)" : "translateY(1px) rotate(0deg)")};
  transition: transform 0.18s ease;

  svg {
    display: block;
    height: 0.82rem;
    width: 0.82rem;
  }
`;

const DropdownList = styled.div`
  ${elevatedSurfaceCss}
  border-radius: var(--theme-radius-md);
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

const CountryFlag = styled(ResponsiveImage)`
  border: 1px solid rgba(var(--theme-border-rgb), 0.8);
  border-radius: 0;
  display: inline-flex;
  height: 14px;
  object-fit: cover;
  width: 20px;
`;

const SearchWrap = styled.div`
  max-width: 100%;
  width: 100%;

  @media (max-width: 979px) {
    display: none;
  }

  @media (min-width: 980px) {
    align-self: center;
  }
`;

const mobileDialogVariants = Object.freeze({
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
  ${({ $variant }) => mobileDialogVariants[$variant] || mobileDialogVariants.search}

  &[open] {
    display: flex;
  }

  &::backdrop {
    backdrop-filter: blur(12px);
    background:
      linear-gradient(180deg, rgba(10, 16, 25, 0.46), rgba(10, 16, 25, 0.68)),
      radial-gradient(circle at top, rgba(var(--theme-primary-rgb), 0.16), transparent 36%);
  }

  @media (min-width: 980px) {
    display: none;
  }
`;

const MobileDialogHeader = styled.div`
  align-items: start;
  border-bottom: 1px solid rgba(var(--theme-border-rgb), 0.82);
  display: grid;
  gap: 0.6rem;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 0.95rem 0.95rem 0.88rem;
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

const MobileDialogCloseButton = styled.button`
  align-items: center;
  ${controlSurfaceCss}
  ${focusRingCss}
  border-radius: 0;
  color: var(--theme-text);
  cursor: pointer;
  display: inline-flex;
  height: 2.2rem;
  justify-content: center;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;
  width: 2.2rem;

  &:hover {
    background: rgba(var(--theme-primary-rgb), 0.1);
    border-color: rgba(var(--theme-primary-rgb), 0.26);
    transform: translateY(-1px);
  }

  &:focus-visible {
    transform: translateY(-1px);
  }
`;

const MobileDialogBody = styled.div`
  display: grid;
  gap: 0.85rem;
  min-height: 0;
  overflow-y: auto;
  padding: 0.95rem;
  scrollbar-color: rgba(var(--theme-primary-rgb), 0.24) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(var(--theme-primary-rgb), 0.24);
    background-clip: padding-box;
    border: 3px solid transparent;
    border-radius: 0;
  }
`;

const MobileMenuSurface = styled.section`
  ${elevatedSurfaceCss}
  border-radius: 0;
  box-shadow:
    -18px 0 42px rgba(9, 17, 28, 0.12),
    0 32px 84px rgba(9, 17, 28, 0.28);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: calc(100dvh - 1.1rem);
  margin-left: auto;
  overflow: hidden;
  width: min(23.5rem, calc(100vw - 0.55rem));
`;

const MobileSearchSurface = styled.section`
  ${elevatedSurfaceCss}
  border-radius: 0;
  box-shadow:
    0 24px 64px rgba(9, 17, 28, 0.22),
    0 8px 18px rgba(var(--theme-primary-rgb), 0.08);
  display: grid;
  margin-top: min(12vh, 5rem);
  overflow: hidden;
  width: min(30rem, calc(100vw - 1.7rem));
`;

const MobileQuickGrid = styled.div`
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
`;

const MobileQuickLink = styled(Link)`
  align-items: center;
  background: ${({ $active }) => (
    $active ? "rgba(var(--theme-primary-rgb), 0.12)" : "rgba(var(--theme-primary-rgb), 0.04)"
  )};
  border: 1px solid ${({ $active }) => (
    $active ? "rgba(var(--theme-primary-rgb), 0.24)" : "rgba(var(--theme-border-rgb), 0.78)"
  )};
  border-radius: 0;
  color: ${({ $active }) => ($active ? "var(--theme-primary)" : "var(--theme-text)")};
  display: inline-flex;
  font-size: 0.92rem;
  font-weight: 800;
  gap: 0.5rem;
  justify-content: center;
  min-height: 3rem;
  padding: 0.72rem 0.8rem;
  text-align: center;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;

  &:hover {
    background: rgba(var(--theme-primary-rgb), 0.1);
    border-color: rgba(var(--theme-primary-rgb), 0.28);
    transform: translateY(-1px);
  }
`;

const MobileSectionStack = styled.div`
  display: grid;
  gap: 0.7rem;
`;

const MobileDisclosure = styled.details`
  background: rgba(var(--theme-surface-rgb), 0.78);
  border: 1px solid rgba(var(--theme-border-rgb), 0.8);
  border-radius: 0;
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
  border-radius: 0;
  color: rgba(var(--theme-primary-rgb), 0.92);
  display: inline-flex;
  font-size: 0.73rem;
  font-weight: 800;
  justify-content: center;
  min-width: 2rem;
  padding: 0.16rem 0.42rem;
`;

const MobileDisclosureChevron = styled.span`
  color: rgba(var(--theme-text-rgb), 0.7);
  display: inline-flex;
  transition: transform 0.18s ease;

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
  align-items: center;
  background: rgba(var(--theme-primary-rgb), 0.04);
  border: 1px solid rgba(var(--theme-border-rgb), 0.74);
  border-radius: 0;
  color: var(--theme-text);
  display: flex;
  font-size: 0.9rem;
  font-weight: 700;
  gap: 0.55rem;
  justify-content: space-between;
  min-height: 2.9rem;
  padding: 0.68rem 0.74rem;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;

  &:hover {
    background: rgba(var(--theme-primary-rgb), 0.08);
    border-color: rgba(var(--theme-primary-rgb), 0.24);
    transform: translateY(-1px);
  }
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
  align-items: center;
  background: rgba(var(--theme-primary-rgb), 0.04);
  border: 1px solid rgba(var(--theme-border-rgb), 0.78);
  border-radius: 0;
  color: var(--theme-text);
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  gap: 0.38rem;
  min-height: 2.2rem;
  padding: 0 0.74rem;
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
  align-items: center;
  color: rgba(255, 255, 255, 0.96);
  display: inline-flex;
  gap: 0.38rem;
  font-weight: 700;

  svg {
    display: block;
    height: 0.92rem;
    width: 0.92rem;
  }
`;

const FooterBottom = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(230, 237, 245, 0.82);
  margin: 0 auto;
  max-width: var(--theme-shell-max-width);
  padding: 0 0.88rem 0.72rem;
`;

function SiteShellFrame({
  categoryLinks = [],
  children,
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
  const currentYear = new Date().getFullYear();
  const searchBarCopy = messages.site.searchBar || {};
  const headerTagline = typeof messages.site.tagline === "string" ? messages.site.tagline.trim() : "";
  const normalizedSearchQuery =
    typeof searchQuery === "string" ? searchQuery.trim() : "";
  const legalNavigation = messages.site.legalNavigation || {};
  const homeHref = buildLocalizedPath(locale, publicRouteSegments.home);
  const newsHref = buildLocalizedPath(locale, publicRouteSegments.news);
  const searchHref = buildLocalizedPath(locale, publicRouteSegments.search);
  const aboutHref = buildLocalizedPath(locale, publicRouteSegments.about);
  const disclaimerHref = buildLocalizedPath(locale, publicRouteSegments.disclaimer);
  const privacyHref = buildLocalizedPath(locale, publicRouteSegments.privacy);
  const isCategoryActive = normalizePathname(pathname).startsWith(`/${locale}/category`);
  const routeStateKey = `${normalizePathname(pathname)}|${countryQuery}`;
  const isCategoryOpen =
    openDropdown === "category" && openDropdownRouteKey === routeStateKey;
  const isCountryActive = normalizePathname(pathname) === normalizePathname(searchHref) && Boolean(countryQuery);
  const isCountryOpen =
    openDropdown === "country" && openDropdownRouteKey === routeStateKey;
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
      if (window.innerWidth >= 980) {
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
    const nextIsOpen = openDropdown === kind && openDropdownRouteKey === routeStateKey ? null : kind;

    setOpenDropdown(nextIsOpen);
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
    <Shell>
      <Header>
          <HeaderInner>
            <HeaderMeta>
              <HeaderBrandLink href={homeHref}>
                <HeaderBrandMark>
                  <HeaderBrandLogo size={34} title="" />
                </HeaderBrandMark>
                <HeaderBrandCopy>
                  <HeaderBrandEyebrow>{messages.site.navigation.news || "News"}</HeaderBrandEyebrow>
                  <HeaderBrandTitle>{messages.site.title}</HeaderBrandTitle>
                </HeaderBrandCopy>
              </HeaderBrandLink>
              {headerTagline ? <HeaderTagline>{headerTagline}</HeaderTagline> : null}
              <MobileActionGroup>
              <MobileActionButton
                aria-expanded={isMobileSearchOpen}
                aria-haspopup="dialog"
                aria-label={messages.site.navigation.search || "Search"}
                onClick={openMobileSearch}
                type="button"
              >
                <AppIcon name="search" size={18} />
              </MobileActionButton>
              <MobileActionButton
                $tone="solid"
                aria-expanded={isMobileMenuOpen}
                aria-haspopup="dialog"
                aria-label="Open menu"
                onClick={openMobileMenu}
                type="button"
              >
                <AppIcon name="menu" size={18} />
              </MobileActionButton>
            </MobileActionGroup>
          </HeaderMeta>

          <Navigation aria-label="Public navigation">
            {primaryLinks.map((item) => (
              <NavigationLink
                aria-current={isNavigationActive(pathname, item.href) ? "page" : undefined}
                href={item.href}
                key={item.key}
                $active={isNavigationActive(pathname, item.href)}
              >
                {item.icon ? <AppIcon name={item.icon} size={15} /> : null}
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
                  <DropdownChevron $open={isCategoryOpen} aria-hidden="true">
                    <AppIcon name="chevron-down" size={13} />
                  </DropdownChevron>
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
                  <AppIcon name="globe" size={15} />
                  {messages.site.navigation.countriesRegions || "Countries/Regions"}
                  <DropdownChevron $open={isCountryOpen} aria-hidden="true">
                    <AppIcon name="chevron-down" size={13} />
                  </DropdownChevron>
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
              initialQuery={normalizedSearchQuery}
              key={`desktop-search-${normalizedSearchQuery || "empty"}`}
              locale={locale}
              searchCopy={searchBarCopy}
              searchHref={searchHref}
            />
          </SearchWrap>
        </HeaderInner>

        <MobileDialog
          aria-label="Mobile navigation menu"
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
              <MobileDialogCloseButton
                aria-label="Close menu"
                onClick={closeMobileMenu}
                type="button"
              >
                <AppIcon name="x" size={16} />
              </MobileDialogCloseButton>
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
                        <MobileDisclosureChevron aria-hidden="true">
                          <AppIcon name="chevron-down" size={14} />
                        </MobileDisclosureChevron>
                      </MobileDisclosureMeta>
                    </MobileDisclosureSummary>
                    <MobileDisclosureBody>
                      <MobileList>
                        {categoryLinks.map((category) => (
                          <MobileListLink
                            href={category.path}
                            key={category.slug}
                            onClick={closeMobileMenu}
                          >
                            <MobileListLabel>
                              {category.logoEmoji ? (
                                <span aria-hidden="true">{category.logoEmoji}</span>
                              ) : (
                                <AppIcon name="news" size={14} />
                              )}
                              <MobileListText>{category.name}</MobileListText>
                            </MobileListLabel>
                            <DropdownCount>{category.count}</DropdownCount>
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
                        <MobileDisclosureChevron aria-hidden="true">
                          <AppIcon name="chevron-down" size={14} />
                        </MobileDisclosureChevron>
                      </MobileDisclosureMeta>
                    </MobileDisclosureSummary>
                    <MobileDisclosureBody>
                      <MobileList>
                        {countryLinks.map((country) => (
                          <MobileListLink
                            href={country.path}
                            key={country.value}
                            onClick={closeMobileMenu}
                          >
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
                            <DropdownCount>{country.count}</DropdownCount>
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
          aria-label="Search stories"
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
              <MobileDialogCloseButton
                aria-label="Close search"
                onClick={closeMobileSearch}
                type="button"
              >
                <AppIcon name="x" size={16} />
              </MobileDialogCloseButton>
            </MobileDialogHeader>

            <MobileDialogBody>
              <PublicStorySearch
                autoFocus
                condenseSubmit={false}
                initialQuery={normalizedSearchQuery}
                key={`mobile-search-${normalizedSearchQuery || "empty"}`}
                locale={locale}
                onSubmitComplete={closeMobileSearch}
                searchCopy={searchBarCopy}
                searchHref={searchHref}
              />
            </MobileDialogBody>
          </MobileSearchSurface>
        </MobileDialog>
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
              <FooterLink href={homeHref}>
                <AppIcon name="home" size={15} />
                {messages.site.navigation.home}
              </FooterLink>
              <FooterLink href={newsHref}>
                <AppIcon name="news" size={15} />
                {messages.site.navigation.news}
              </FooterLink>
              <FooterLink href={searchHref}>
                <AppIcon name="search" size={15} />
                {messages.site.navigation.search}
              </FooterLink>
              {categoryLinks[0] ? (
                <FooterLink href={categoryLinks[0].path}>
                  <AppIcon name="tag" size={15} />
                  {messages.site.navigation.categories || "Categories"}
                </FooterLink>
              ) : null}
              {countryLinks[0] ? (
                <FooterLink href={countryLinks[0].path}>
                  <AppIcon name="globe" size={15} />
                  {messages.site.navigation.countriesRegions || "Countries/Regions"}
                </FooterLink>
              ) : null}
            </FooterLinkList>
          </FooterSection>

          <FooterSection>
            <FooterSectionTitle>Company</FooterSectionTitle>
            <FooterLinkList>
              <FooterLink href={aboutHref}>
                <AppIcon name="info" size={15} />
                {messages.site.navigation.about}
              </FooterLink>
              <FooterLink href={disclaimerHref}>
                <AppIcon name="shield" size={15} />
                {legalNavigation.disclaimer || "Disclaimer"}
              </FooterLink>
              <FooterLink href={privacyHref}>
                <AppIcon name="lock" size={15} />
                {legalNavigation.privacy || "Privacy"}
              </FooterLink>
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

function SiteShellContent(props) {
  const searchParams = useSearchParams();
  const countryQuery =
    typeof searchParams?.get("country") === "string" ? searchParams.get("country").trim() : "";
  const searchQuery =
    typeof searchParams?.get("q") === "string" ? searchParams.get("q").trim() : "";

  return (
    <SiteShellFrame
      {...props}
      countryQuery={countryQuery}
      searchQuery={searchQuery}
    />
  );
}

/**
 * Wraps locale-scoped public pages with navigation, search, and footer chrome.
 *
 * @param {object} props - Shell content and navigation props.
 * @returns {JSX.Element} The responsive public site shell.
 */
export default function SiteShell(props) {
  return (
    <Suspense fallback={<SiteShellFrame {...props} countryQuery="" searchQuery="" />}>
      <SiteShellContent {...props} />
    </Suspense>
  );
}
