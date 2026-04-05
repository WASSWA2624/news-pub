"use client";

import { useState } from "react";
import styled, { css } from "styled-components";

const Panel = styled.section`
  background:
    linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.98), rgba(var(--theme-surface-rgb), 0.95)),
    radial-gradient(circle at top right, rgba(var(--theme-primary-rgb), 0.1), transparent 56%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.72);
  border-radius: 0;
  box-shadow:
    0 24px 54px rgba(var(--theme-primary-rgb), 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  display: grid;
  gap: 0.9rem;
  overflow: hidden;
  padding: clamp(0.95rem, 2.4vw, 1.18rem);
  position: relative;

  ${({ $compact }) =>
    $compact &&
    css`
      gap: 0.72rem;
      padding: 0.82rem 0.85rem 0.88rem;
    `}

  &::before {
    background: linear-gradient(
      90deg,
      rgba(var(--theme-primary-rgb), 0.94),
      rgba(var(--theme-accent-rgb), 0.42)
    );
    content: "";
    height: 3px;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
  }
`;

const SectionHeader = styled.div`
  display: grid;
  gap: 0.22rem;

  ${({ $compact }) =>
    $compact &&
    css`
      gap: 0.16rem;
    `}
`;

const SectionEyebrow = styled.p`
  color: rgba(var(--theme-primary-rgb), 0.74);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  color: var(--theme-text);
  font-size: clamp(1.15rem, 3vw, 1.35rem);
  letter-spacing: -0.04em;
  line-height: 1.08;
  margin: 0;

  ${({ $compact }) =>
    $compact &&
    css`
      font-size: 1.02rem;
      line-height: 1.02;
    `}
`;

const SectionDescription = styled.p`
  color: rgba(var(--theme-muted-rgb), 0.92);
  font-size: 0.94rem;
  line-height: 1.48;
  margin: 0;

  ${({ $compact }) =>
    $compact &&
    css`
      font-size: 0.8rem;
      line-height: 1.34;
    `}
`;

const ShareButtonRow = styled.div`
  display: grid;
  gap: 0.58rem;

  @media (min-width: 460px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  ${({ $compact }) =>
    $compact &&
    css`
      gap: 0.46rem;

      @media (min-width: 560px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    `}
`;

const shareTileStyles = css`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(249, 251, 255, 0.92)),
    linear-gradient(90deg, ${({ $surfaceStrong }) => $surfaceStrong}, transparent 42%),
    radial-gradient(circle at top right, ${({ $surface }) => $surface}, transparent 58%);
  border: 1px solid ${({ $border }) => $border || "rgba(16, 32, 51, 0.1)"};
  border-radius: 0;
  box-shadow:
    0 10px 22px rgba(19, 34, 58, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  color: var(--theme-text);
  display: inline-flex;
  font-weight: 800;
  justify-content: flex-start;
  min-height: 74px;
  padding: 0.72rem 0.8rem;
  position: relative;
  text-align: left;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: ${({ $hoverBorder, $border }) => $hoverBorder || $border};
    box-shadow:
      0 14px 30px rgba(19, 34, 58, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.76);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${({ $accent }) => $accent || "var(--theme-primary)"};
    outline-offset: 2px;
  }

  ${({ $compact }) =>
    $compact &&
    css`
      min-height: 56px;
      padding: 0.52rem 0.58rem;
    `}
`;

const ShareLink = styled.a`
  ${shareTileStyles}
`;

const ShareButton = styled.button`
  ${shareTileStyles}
  cursor: pointer;
`;

const ShareTileContent = styled.span`
  align-items: center;
  display: grid;
  gap: 0.72rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  width: 100%;

  ${({ $compact }) =>
    $compact &&
    css`
      gap: 0.46rem;
      grid-template-columns: auto minmax(0, 1fr);
    `}
`;

const ShareIconBadge = styled.span`
  align-items: center;
  background: ${({ $surface }) => $surface};
  border: 1px solid ${({ $border }) => $border};
  border-radius: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
  color: ${({ $accent }) => $accent};
  display: inline-flex;
  flex: 0 0 auto;
  height: 2.55rem;
  justify-content: center;
  width: 2.55rem;

  ${({ $compact }) =>
    $compact &&
    css`
      height: 2rem;
      width: 2rem;
    `}
`;

const ShareTextGroup = styled.span`
  display: grid;
  gap: 0.12rem;
  min-width: 0;
`;

const ShareLabel = styled.span`
  color: var(--theme-text);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;

  ${({ $compact }) =>
    $compact &&
    css`
      font-size: 0.9rem;
      line-height: 1.04;
    `}
`;

const ShareMeta = styled.span`
  color: rgba(var(--theme-muted-rgb), 0.84);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.24;

  ${({ $compact }) =>
    $compact &&
    css`
      display: none;
    `}
`;

const ShareArrow = styled.span`
  align-items: center;
  color: rgba(var(--theme-primary-rgb), 0.54);
  display: inline-flex;
  font-size: 1rem;
  font-weight: 700;
  justify-content: center;
  line-height: 1;

  ${({ $compact }) =>
    $compact &&
    css`
      display: none;
    `}
`;

const ShareIconSvg = styled.svg`
  display: block;
  height: 1.05rem;
  width: 1.05rem;
`;

function ShareIcon({ network }) {
  if (network === "x") {
    return (
      <ShareIconSvg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M5 4.5 18.8 19.5M18.6 4.5 10.4 13.6 5.6 19.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </ShareIconSvg>
    );
  }

  if (network === "facebook") {
    return (
      <ShareIconSvg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
        <path d="M13.4 20v-6h2.1l.4-2.5h-2.5V9.9c0-.8.3-1.3 1.4-1.3H16V6.4c-.2 0-.9-.1-1.8-.1-2.8 0-4.3 1.5-4.3 4.3v1H8v2.5h1.9v6z" />
      </ShareIconSvg>
    );
  }

  if (network === "linkedin") {
    return (
      <ShareIconSvg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6.3 8.5a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8ZM5 19V10h2.6v9zm4.2 0V10h2.5v1.3h.1c.4-.8 1.3-1.6 2.8-1.6 3 0 3.4 2 3.4 4.6V19h-2.6v-4.2c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2V19z" />
      </ShareIconSvg>
    );
  }

  if (network === "whatsapp") {
    return (
      <ShareIconSvg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 4.5a7 7 0 0 0-5.9 10.7L5.2 19l3.9-1A7 7 0 1 0 12 4.5Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
        <path
          d="M9.7 9.1c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.4 1c.1.2.1.4 0 .6l-.4.7c.6 1.1 1.4 1.9 2.5 2.5l.7-.4c.2-.1.4-.1.6 0l1 .4c.3.1.4.3.4.5v.5c0 .2 0 .4-.4.6-.4.2-.9.3-1.3.2-2-.3-4.8-2.8-5.5-5-.1-.4 0-.9.4-1.2Z"
          fill="currentColor"
        />
      </ShareIconSvg>
    );
  }

  if (network === "email") {
    return (
      <ShareIconSvg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M4.5 7.5h15v9h-15z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
        <path
          d="m5.5 8.5 6.5 5 6.5-5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
      </ShareIconSvg>
    );
  }

  if (network === "check") {
    return (
      <ShareIconSvg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="m5.5 12.5 4.2 4.2 8.8-8.7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
        />
      </ShareIconSvg>
    );
  }

  return (
    <ShareIconSvg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M10.5 7.5h-2A2.5 2.5 0 0 0 6 10v0A2.5 2.5 0 0 0 8.5 12.5h2m3-5h2A2.5 2.5 0 0 1 18 10v0a2.5 2.5 0 0 1-2.5 2.5h-2m-4.5 0 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </ShareIconSvg>
  );
}

export default function ShareActions({ article, copy, variant = "default" }) {
  const isCompact = variant === "compact";
  const [copied, setCopied] = useState(false);
  const title = encodeURIComponent(article.title);
  const url = encodeURIComponent(article.url);
  const shareLinks = [
    {
      accent: "#111827",
      border: "rgba(17, 24, 39, 0.12)",
      href: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
      hoverBorder: "rgba(17, 24, 39, 0.24)",
      label: "X",
      meta: "Post headline",
      network: "x",
      surface: "rgba(17, 24, 39, 0.08)",
      surfaceStrong: "rgba(17, 24, 39, 0.08)",
    },
    {
      accent: "#1877F2",
      border: "rgba(24, 119, 242, 0.14)",
      href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      hoverBorder: "rgba(24, 119, 242, 0.24)",
      label: "Facebook",
      meta: "Share publicly",
      network: "facebook",
      surface: "rgba(24, 119, 242, 0.1)",
      surfaceStrong: "rgba(24, 119, 242, 0.08)",
    },
    {
      accent: "#0A66C2",
      border: "rgba(10, 102, 194, 0.14)",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`,
      hoverBorder: "rgba(10, 102, 194, 0.24)",
      label: "LinkedIn",
      meta: "Send to peers",
      network: "linkedin",
      surface: "rgba(10, 102, 194, 0.1)",
      surfaceStrong: "rgba(10, 102, 194, 0.08)",
    },
    {
      accent: "#25D366",
      border: "rgba(37, 211, 102, 0.16)",
      href: `https://wa.me/?text=${title}%20${url}`,
      hoverBorder: "rgba(37, 211, 102, 0.26)",
      label: "WhatsApp",
      meta: "Send to chat",
      network: "whatsapp",
      surface: "rgba(37, 211, 102, 0.12)",
      surfaceStrong: "rgba(37, 211, 102, 0.09)",
    },
    {
      accent: "#D97706",
      border: "rgba(217, 119, 6, 0.16)",
      href: `mailto:?subject=${title}&body=${encodeURIComponent(`${article.title}\n\n${article.url}`)}`,
      hoverBorder: "rgba(217, 119, 6, 0.24)",
      label: "Email",
      meta: "Draft message",
      network: "email",
      surface: "rgba(217, 119, 6, 0.12)",
      surfaceStrong: "rgba(217, 119, 6, 0.08)",
    },
  ];
  const copyAccent = copied ? "#15803D" : "var(--theme-primary)";
  const copyBorder = copied
    ? "rgba(21, 128, 61, 0.18)"
    : "rgba(var(--theme-primary-rgb), 0.14)";
  const copyHoverBorder = copied
    ? "rgba(21, 128, 61, 0.28)"
    : "rgba(var(--theme-primary-rgb), 0.24)";
  const copySurface = copied
    ? "rgba(21, 128, 61, 0.12)"
    : "rgba(var(--theme-primary-rgb), 0.09)";
  const copySurfaceStrong = copied
    ? "rgba(21, 128, 61, 0.08)"
    : "rgba(var(--theme-primary-rgb), 0.08)";

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(article.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Panel $compact={isCompact}>
      <SectionHeader $compact={isCompact}>
        <SectionEyebrow>Share</SectionEyebrow>
        <SectionTitle $compact={isCompact}>{copy.shareTitle}</SectionTitle>
        <SectionDescription $compact={isCompact}>
          {isCompact ? "Share or save this guide." : copy.shareDescription}
        </SectionDescription>
      </SectionHeader>
      <ShareButtonRow $compact={isCompact}>
        {shareLinks.map((link) => (
          <ShareLink
            $accent={link.accent}
            $border={link.border}
            $compact={isCompact}
            $hoverBorder={link.hoverBorder}
            $surface={link.surface}
            $surfaceStrong={link.surfaceStrong}
            href={link.href}
            key={link.label}
            rel="noreferrer"
            target="_blank"
          >
            <ShareTileContent $compact={isCompact}>
              <ShareIconBadge
                $accent={link.accent}
                $border={link.border}
                $compact={isCompact}
                $surface={link.surface}
              >
                <ShareIcon network={link.network} />
              </ShareIconBadge>
              <ShareTextGroup>
                <ShareLabel $compact={isCompact}>{link.label}</ShareLabel>
                <ShareMeta $compact={isCompact}>{link.meta}</ShareMeta>
              </ShareTextGroup>
              <ShareArrow $compact={isCompact} aria-hidden="true">{"->"}</ShareArrow>
            </ShareTileContent>
          </ShareLink>
        ))}
        <ShareButton
          $accent={copyAccent}
          $border={copyBorder}
          $compact={isCompact}
          $hoverBorder={copyHoverBorder}
          $surface={copySurface}
          $surfaceStrong={copySurfaceStrong}
          onClick={handleCopyLink}
          type="button"
        >
          <ShareTileContent $compact={isCompact}>
            <ShareIconBadge
              $accent={copyAccent}
              $border={copyBorder}
              $compact={isCompact}
              $surface={copySurface}
            >
              <ShareIcon network={copied ? "check" : "copy"} />
            </ShareIconBadge>
            <ShareTextGroup>
              <ShareLabel $compact={isCompact}>
                {copied ? copy.copiedLink : copy.copyLink}
              </ShareLabel>
              <ShareMeta $compact={isCompact}>
                {copied ? "Ready to paste" : "Keep URL handy"}
              </ShareMeta>
            </ShareTextGroup>
            <ShareArrow $compact={isCompact} aria-hidden="true">
              {copied ? "OK" : "->"}
            </ShareArrow>
          </ShareTileContent>
        </ShareButton>
      </ShareButtonRow>
    </Panel>
  );
}
