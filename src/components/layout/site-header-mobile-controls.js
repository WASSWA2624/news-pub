"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import styled, { css } from "styled-components";
import { usePathname } from "next/navigation";

import AppIcon from "@/components/common/app-icon";
import { controlSurfaceCss, focusRingCss } from "@/components/common/ui-surface";

const SiteHeaderMobileOverlay = dynamic(() => import("./site-header-mobile-overlay"));

const MobileActionGroup = styled.div`
  display: inline-flex;
  gap: 0.42rem;

  @media (min-width: 980px) {
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

export default function SiteHeaderMobileControls(props) {
  const pathname = usePathname();
  const [panel, setPanel] = useState("");

  return (
    <>
      <MobileActionGroup>
        <HeaderActionButton
          aria-expanded={panel === "search"}
          aria-haspopup="dialog"
          aria-label={props.messages.site.navigation.search || "Search"}
          onClick={() => setPanel("search")}
          type="button"
        >
          <AppIcon name="search" size={18} />
        </HeaderActionButton>
        <HeaderActionButton
          $primary
          aria-expanded={panel === "menu"}
          aria-haspopup="dialog"
          aria-label={props.accessibility.openMenu || "Open menu"}
          onClick={() => setPanel("menu")}
          type="button"
        >
          <AppIcon name="menu" size={18} />
        </HeaderActionButton>
      </MobileActionGroup>

      {panel ? (
        <SiteHeaderMobileOverlay
          {...props}
          onClose={() => setPanel("")}
          openPanel={panel}
          pathname={pathname}
        />
      ) : null}
    </>
  );
}
