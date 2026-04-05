"use client";

import { useId } from "react";

export default function EquipLogo({ className, size = 40, title = "Equip Blog" }) {
  const gradientId = useId().replace(/:/g, "");
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
          <stop offset="0.55" stopColor="#005f73" />
          <stop offset="1" stopColor="#1d8f95" />
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
      <circle cx="45" cy="19" r="6.5" fill="#f2b35a" />
      <path
        d="M22 18.5V45.5M23 19H42M23 31.5H37.5M23 44H44"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
    </svg>
  );
}
