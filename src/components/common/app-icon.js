import styled from "styled-components";

const IconSvg = styled.svg`
  display: block;
  flex: 0 0 auto;
  height: ${({ $size }) => `${$size}px`};
  width: ${({ $size }) => `${$size}px`};
`;

const aliasMap = Object.freeze({
  about: "info",
  archive: "archive",
  article: "file-text",
  badge: "badge-check",
  categories: "tag",
  category: "tag",
  close: "x",
  countries: "globe",
  "countries-regions": "globe",
  country: "globe",
  dashboard: "dashboard",
  delete: "trash",
  destinations: "send",
  disclaimer: "shield",
  edit: "edit",
  eye: "eye",
  "eye-off": "eye-off",
  globe: "globe",
  home: "home",
  jobs: "clock",
  locale: "globe",
  locales: "globe",
  lock: "lock",
  login: "log-in",
  logout: "log-out",
  hamburger: "menu",
  media: "image",
  menu: "menu",
  news: "news",
  privacy: "lock",
  providers: "server",
  published: "badge-check",
  refresh: "refresh",
  retry: "refresh",
  review: "clipboard-check",
  schedule: "calendar-clock",
  search: "search",
  seo: "sparkles",
  settings: "settings",
  source: "external-link",
  streams: "workflow",
  templates: "layout",
  upload: "upload",
});

function resolveName(name) {
  const normalizedName = `${name || ""}`.trim().toLowerCase();

  return aliasMap[normalizedName] || normalizedName || "circle";
}

function renderIcon(name) {
  switch (resolveName(name)) {
    case "activity":
      return (
        <>
          <path d="M4 12h3l2.2-4 4.1 8 2.1-4H20" />
          <path d="M4 5h16v14H4z" />
        </>
      );
    case "arrow-right":
      return (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      );
    case "badge-check":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m8.6 12.2 2.1 2.1 4.7-4.7" />
        </>
      );
    case "bolt":
      return (
        <>
          <path d="M13.5 2 6 13h4.6L9.9 22 18 10.7h-4.7L13.5 2Z" />
        </>
      );
    case "book-open":
      return (
        <>
          <path d="M4 6.5c2.7 0 4.8.7 6 2v11c-1.2-1.3-3.3-2-6-2z" />
          <path d="M20 6.5c-2.7 0-4.8.7-6 2v11c1.2-1.3 3.3-2 6-2z" />
          <path d="M12 8.5v11" />
        </>
      );
    case "calendar":
      return (
        <>
          <rect height="16" rx="2.5" width="18" x="3" y="5" />
          <path d="M16 3v4" />
          <path d="M8 3v4" />
          <path d="M3 9h18" />
        </>
      );
    case "calendar-clock":
      return (
        <>
          <rect height="16" rx="2.5" width="18" x="3" y="5" />
          <path d="M16 3v4" />
          <path d="M8 3v4" />
          <path d="M3 9h18" />
          <circle cx="16" cy="16" r="3.5" />
          <path d="M16 14.4v1.8l1.1.8" />
        </>
      );
    case "check":
      return <path d="m5 12.5 4.1 4.1L19 6.7" />;
    case "chevron-down":
      return <path d="m6 9 6 6 6-6" />;
    case "chevron-right":
      return <path d="m9 6 6 6-6 6" />;
    case "circle":
      return <circle cx="12" cy="12" r="8.5" />;
    case "clipboard-check":
      return (
        <>
          <path d="M9 4.5h6" />
          <path d="M9.5 3h5a1.5 1.5 0 0 1 1.5 1.5V6H8V4.5A1.5 1.5 0 0 1 9.5 3Z" />
          <path d="M7 6H6a2 2 0 0 0-2 2v10.5A2.5 2.5 0 0 0 6.5 21h11A2.5 2.5 0 0 0 20 18.5V8a2 2 0 0 0-2-2h-1" />
          <path d="m8.4 13.1 2.2 2.2 4.8-4.8" />
        </>
      );
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.8v4.6l3 1.8" />
        </>
      );
    case "copy":
      return (
        <>
          <rect height="11" rx="2" width="10" x="9" y="7" />
          <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
        </>
      );
    case "dashboard":
      return (
        <>
          <rect height="6.5" rx="1.6" width="6.5" x="4" y="4" />
          <rect height="6.5" rx="1.6" width="6.5" x="13.5" y="4" />
          <rect height="6.5" rx="1.6" width="6.5" x="4" y="13.5" />
          <rect height="6.5" rx="1.6" width="6.5" x="13.5" y="13.5" />
        </>
      );
    case "database":
      return (
        <>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </>
      );
    case "edit":
      return (
        <>
          <path d="M12 20h8" />
          <path d="M16.5 4.5a2.1 2.1 0 1 1 3 3L8 19l-4 1 1-4Z" />
        </>
      );
    case "external-link":
      return (
        <>
          <path d="M14 5h5v5" />
          <path d="M10 14 19 5" />
          <path d="M19 13v3.5A2.5 2.5 0 0 1 16.5 19H7.5A2.5 2.5 0 0 1 5 16.5V7.5A2.5 2.5 0 0 1 7.5 5H11" />
        </>
      );
    case "eye":
      return (
        <>
          <path d="M2.8 12s3.5-6 9.2-6 9.2 6 9.2 6-3.5 6-9.2 6-9.2-6-9.2-6Z" />
          <circle cx="12" cy="12" r="2.6" />
        </>
      );
    case "eye-off":
      return (
        <>
          <path d="M4 4 20 20" />
          <path d="M9.8 6.5A9.7 9.7 0 0 1 12 6c5.7 0 9.2 6 9.2 6a17 17 0 0 1-3.4 4.2" />
          <path d="M6.1 9.2A17 17 0 0 0 2.8 12s3.5 6 9.2 6a9.9 9.9 0 0 0 3.2-.5" />
          <path d="M10.6 10.6A2.6 2.6 0 0 0 12 14.6" />
        </>
      );
    case "file-text":
      return (
        <>
          <path d="M7 3.5h7l4 4v13H7Z" />
          <path d="M14 3.5v4h4" />
          <path d="M9 11h6" />
          <path d="M9 14h6" />
          <path d="M9 17h4" />
        </>
      );
    case "folder":
      return (
        <>
          <path d="M3 7.5h6l1.5 2H21v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
          <path d="M3 9.5V6.5A2.5 2.5 0 0 1 5.5 4h3l1.5 2H18.5A2.5 2.5 0 0 1 21 8.5V9.5" />
        </>
      );
    case "globe":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5A13.2 13.2 0 0 1 15.5 12 13.2 13.2 0 0 1 12 20.5 13.2 13.2 0 0 1 8.5 12 13.2 13.2 0 0 1 12 3.5Z" />
        </>
      );
    case "home":
      return (
        <>
          <path d="M3.5 10.5 12 3.8l8.5 6.7" />
          <path d="M5.5 9.8V20h13V9.8" />
          <path d="M10 20v-5.5h4V20" />
        </>
      );
    case "image":
      return (
        <>
          <rect height="14" rx="2.5" width="18" x="3" y="5" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m5.5 17 4.2-4.2 3.1 3.1 2.5-2.5 3.2 3.6" />
        </>
      );
    case "info":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 10v5" />
          <circle cx="12" cy="7.2" r=".6" fill="currentColor" stroke="none" />
        </>
      );
    case "layout":
      return (
        <>
          <rect height="14" rx="2.5" width="18" x="3" y="5" />
          <path d="M10 5v14" />
          <path d="M10 10h11" />
        </>
      );
    case "link":
      return (
        <>
          <path d="M10.5 7.5h-2A3.5 3.5 0 0 0 5 11v0a3.5 3.5 0 0 0 3.5 3.5h2" />
          <path d="M13.5 7.5h2A3.5 3.5 0 0 1 19 11v0a3.5 3.5 0 0 1-3.5 3.5h-2" />
          <path d="m9.5 14.5 5-5" />
        </>
      );
    case "lock":
      return (
        <>
          <rect height="9" rx="2" width="12" x="6" y="11" />
          <path d="M8.5 11V8.5a3.5 3.5 0 1 1 7 0V11" />
        </>
      );
    case "log-in":
      return (
        <>
          <path d="M15 4h4v16h-4" />
          <path d="m10 8-4 4 4 4" />
          <path d="M6 12h10" />
        </>
      );
    case "log-out":
      return (
        <>
          <path d="M9 4H5v16h4" />
          <path d="m14 8 4 4-4 4" />
          <path d="M18 12H8" />
        </>
      );
    case "more-horizontal":
      return (
        <>
          <circle cx="6.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </>
      );
    case "menu":
      return (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      );
    case "news":
      return (
        <>
          <rect height="14" rx="2" width="16" x="4" y="5" />
          <path d="M7.5 9h4v4h-4z" />
          <path d="M13.5 9h3" />
          <path d="M13.5 12h3" />
          <path d="M7.5 15.5h9" />
        </>
      );
    case "play":
      return <path d="M8 6.5 18 12 8 17.5Z" fill="currentColor" stroke="currentColor" />;
    case "plus":
      return (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      );
    case "refresh":
      return (
        <>
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M18.2 11A6.8 6.8 0 0 0 6.6 7.6L5 9" />
          <path d="M5.8 13A6.8 6.8 0 0 0 17.4 16.4L19 15" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.2 4.2" />
        </>
      );
    case "share":
      return (
        <>
          <circle cx="7" cy="12" r="2" />
          <circle cx="17" cy="6.5" r="2" />
          <circle cx="17" cy="17.5" r="2" />
          <path d="m8.8 11 6.4-3.3" />
          <path d="m8.8 13 6.4 3.3" />
        </>
      );
    case "send":
      return (
        <>
          <path d="M21 3 10 14" />
          <path d="m21 3-6.5 18-3.8-7.7L3 9.5Z" />
        </>
      );
    case "server":
      return (
        <>
          <rect height="5" rx="1.5" width="15" x="4.5" y="4.5" />
          <rect height="5" rx="1.5" width="15" x="4.5" y="14.5" />
          <path d="M8 7h0" />
          <path d="M8 17h0" />
          <path d="M12 7h4" />
          <path d="M12 17h4" />
        </>
      );
    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="2.8" />
          <path d="M12 4.2v2" />
          <path d="M12 17.8v2" />
          <path d="m6.5 6.5 1.4 1.4" />
          <path d="m16.1 16.1 1.4 1.4" />
          <path d="M4.2 12h2" />
          <path d="M17.8 12h2" />
          <path d="m6.5 17.5 1.4-1.4" />
          <path d="m16.1 7.9 1.4-1.4" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M12 3.5 5.5 6v5.6c0 4 2.8 6.6 6.5 8.9 3.7-2.3 6.5-4.9 6.5-8.9V6Z" />
          <path d="m9.2 11.7 2 2 3.7-4" />
        </>
      );
    case "sliders":
      return (
        <>
          <path d="M5 7h14" />
          <path d="M5 12h14" />
          <path d="M5 17h14" />
          <circle cx="9" cy="7" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="11" cy="17" r="1.8" fill="currentColor" stroke="none" />
        </>
      );
    case "sparkles":
      return (
        <>
          <path d="m12 4 1.2 3.3L16.5 8.5l-3.3 1.2L12 13l-1.2-3.3L7.5 8.5l3.3-1.2Z" />
          <path d="m18 13 0.7 1.8 1.8 0.7-1.8 0.7L18 18l-0.7-1.8-1.8-0.7 1.8-0.7Z" />
          <path d="m6 14 0.8 2 2 0.8-2 0.8L6 19.6l-0.8-2-2-0.8 2-0.8Z" />
        </>
      );
    case "tag":
      return (
        <>
          <path d="M10.5 4H5v5.5L13.5 18a2 2 0 0 0 2.8 0l2.7-2.7a2 2 0 0 0 0-2.8Z" />
          <circle cx="7.8" cy="7.8" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "trash":
      return (
        <>
          <path d="M4 6h16" />
          <path d="M9 6V4.5h6V6" />
          <path d="M18.5 6 17.5 19a2 2 0 0 1-2 1H8.5a2 2 0 0 1-2-1L5.5 6" />
          <path d="M10 10v6" />
          <path d="M14 10v6" />
        </>
      );
    case "upload":
      return (
        <>
          <path d="M12 17V5.5" />
          <path d="m8.5 9 3.5-3.5L15.5 9" />
          <path d="M5 19.5h14" />
        </>
      );
    case "warning":
      return (
        <>
          <path d="M12 4.5 20 18.5H4Z" />
          <path d="M12 9.3v4.4" />
          <circle cx="12" cy="16.4" r=".7" fill="currentColor" stroke="none" />
        </>
      );
    case "workflow":
      return (
        <>
          <circle cx="6" cy="7" r="2.5" />
          <circle cx="18" cy="7" r="2.5" />
          <circle cx="12" cy="17" r="2.5" />
          <path d="M8.3 8.2 10.4 14" />
          <path d="M15.7 8.2 13.6 14" />
        </>
      );
    case "x":
      return (
        <>
          <path d="m6 6 12 12" />
          <path d="M18 6 6 18" />
        </>
      );
    default:
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
        </>
      );
  }
}

export default function AppIcon({
  className,
  label,
  name,
  size = 18,
  strokeWidth = 1.9,
}) {
  const accessibilityProps = label
    ? { "aria-label": label, role: "img" }
    : { "aria-hidden": "true" };

  return (
    <IconSvg
      {...accessibilityProps}
      className={className}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      $size={size}
    >
      {renderIcon(name)}
    </IconSvg>
  );
}
