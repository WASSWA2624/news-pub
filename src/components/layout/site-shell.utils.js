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

const publicNavigationIcons = Object.freeze({
  about: "info",
  home: "home",
  news: "news",
  search: "search",
});

/**
 * Shared normalization and navigation helpers used by the public site shell.
 */
export const siteShellUtils = Object.freeze({
  isNavigationActive,
  normalizePathname,
  publicNavigationIcons,
});
