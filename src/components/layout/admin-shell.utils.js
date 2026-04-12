/**
 * Responsive layout constants and helpers shared by the NewsPub admin shell.
 */

export const MOBILE_BREAKPOINT = 720;
export const DESKTOP_BREAKPOINT = 1220;
export const TABLET_HEADER_BREAKPOINT = 720;
export const PRIMARY_NAV_GAP_PX = 2;

const MOBILE_PRIMARY_KEYS = Object.freeze(["dashboard", "review", "published"]);
const TABLET_PRIMARY_KEYS = Object.freeze([...MOBILE_PRIMARY_KEYS, "media"]);
const DESKTOP_PRIMARY_KEYS = Object.freeze([...TABLET_PRIMARY_KEYS, "jobs", "categories"]);

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

function getPrimaryKeysForViewport(viewport_width) {
  if (viewport_width < MOBILE_BREAKPOINT) {
    return MOBILE_PRIMARY_KEYS;
  }

  if (viewport_width < DESKTOP_BREAKPOINT) {
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

/**
 * Shared layout math and normalization helpers used by the admin shell.
 */
export const adminShellUtils = Object.freeze({
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
});
