"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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

  if (targetPath === "/" || targetPath.split("/").filter(Boolean).length <= 1) {
    return currentPath === targetPath;
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function setDiscoveryActiveState(selector, is_active) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.dataset.active = is_active ? "true" : "false";
}

export default function SiteHeaderState({ categoryPrefix, homePath, searchPath }) {
  const pathname = usePathname() || homePath;

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const query = searchParams.get("q")?.trim() || "";
    const country = searchParams.get("country")?.trim() || "";

    document.querySelectorAll("[data-public-nav-link='true']").forEach((node) => {
      const href = node.getAttribute("href") || "";
      const is_active = isNavigationActive(pathname, href);

      node.dataset.active = is_active ? "true" : "false";
      if (is_active) {
        node.setAttribute("aria-current", "page");
      } else {
        node.removeAttribute("aria-current");
      }
    });

    setDiscoveryActiveState("[data-public-discovery='category']", pathname.startsWith(categoryPrefix));
    setDiscoveryActiveState(
      "[data-public-discovery='country']",
      pathname === searchPath && Boolean(country),
    );

    document.querySelectorAll("[data-public-search-input='true']").forEach((node) => {
      if ("value" in node) {
        node.value = query;
      }
    });
  }, [categoryPrefix, pathname, searchPath]);

  return null;
}
