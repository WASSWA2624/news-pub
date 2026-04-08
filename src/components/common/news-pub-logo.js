"use client";

/**
 * Brand mark component for NewsPub headers, navigation, and metadata surfaces.
 */

import { useId } from "react";

/**
 * Renders the shared NewsPub brand mark used across public and admin shells.
 */
export default function NewsPubLogo({ className, size = 40, title = "NewsPub" }) {
  const gradientId = useId().replace(/:/g, "");
  const paperGradientId = useId().replace(/:/g, "");
  const accentGradientId = useId().replace(/:/g, "");
  const shadowId = useId().replace(/:/g, "");
  const label = typeof title === "string" && title.trim() ? title.trim() : null;

  return (
    <svg
      aria-hidden={label ? undefined : true}
      className={className}
      height={size}
      role={label ? "img" : undefined}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {label ? <title>{label}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="10" x2="54" y1="8" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#102033" />
          <stop offset="0.5" stopColor="#1b4f93" />
          <stop offset="1" stopColor="#0c6f82" />
        </linearGradient>
        <linearGradient
          id={paperGradientId}
          x1="18"
          x2="49"
          y1="16"
          y2="51"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dce8f4" />
        </linearGradient>
        <linearGradient
          id={accentGradientId}
          x1="38"
          x2="50"
          y1="15"
          y2="27"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffd98d" />
          <stop offset="1" stopColor="#f2b35a" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" floodColor="#102033" floodOpacity="0.16" stdDeviation="4" />
        </filter>
      </defs>
      <g filter={`url(#${shadowId})`}>
        <rect x="4" y="4" width="56" height="56" rx="18" fill={`url(#${gradientId})`} />
        <rect
          x="4.75"
          y="4.75"
          width="54.5"
          height="54.5"
          rx="17.25"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />
      </g>
      <path
        d="M20 16.5C20 14.8431 21.3431 13.5 23 13.5H37.4L48 24.1V45C48 48.3137 45.3137 51 42 51H23C21.3431 51 20 49.6569 20 48V16.5Z"
        fill={`url(#${paperGradientId})`}
      />
      <path d="M37.4 13.5V21.2C37.4 22.8016 38.6984 24.1 40.3 24.1H48" fill="#d2e1f0" />
      <path
        d="M25 24H34.5M25 29.5H35.5M25 35H31.5"
        fill="none"
        stroke="#2f5b86"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="M31 40.5L42 29.5M36.5 29.5H42V35"
        fill="none"
        stroke="#0c6f82"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4.1"
      />
      <circle cx="45.5" cy="18.5" r="5.5" fill={`url(#${accentGradientId})`} />
      <circle cx="45.5" cy="18.5" r="2" fill="#fff3d8" opacity="0.95" />
    </svg>
  );
}
