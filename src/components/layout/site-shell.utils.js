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

function buildFooterSections({
  aboutHref,
  categoryLinks = [],
  countryLinks = [],
  disclaimerHref,
  homeHref,
  messages,
  newsHref,
  privacyHref,
  searchHref,
}) {
  const footerNavigation = messages?.site?.footerNavigation || {};
  const legalNavigation = messages?.site?.legalNavigation || {};
  const topCategories = categoryLinks.slice(0, 4).map((category) => ({
    href: category.path,
    icon: "tag",
    key: `category-${category.slug}`,
    label: category.name,
    meta: category.count ? `${category.count}` : "",
  }));
  const topCountries = countryLinks.slice(0, 4).map((country) => ({
    href: country.path,
    icon: "globe",
    key: `country-${country.value}`,
    label: country.label,
    meta: country.count ? `${country.count}` : "",
  }));
  const sections = [
    {
      key: "browse",
      links: [
        {
          href: homeHref,
          icon: "home",
          key: "home",
          label: messages?.site?.navigation?.home || "Home",
        },
        {
          href: newsHref,
          icon: "news",
          key: "news",
          label: messages?.site?.navigation?.news || "News",
        },
        {
          href: searchHref,
          icon: "search",
          key: "search",
          label: messages?.site?.navigation?.search || "Search",
        },
      ],
      title: footerNavigation.browse || "Browse",
    },
    {
      key: "discover",
      links: [...topCategories, ...topCountries],
      title: footerNavigation.discover || "Discover",
    },
    {
      key: "company",
      links: [
        {
          href: aboutHref,
          icon: "info",
          key: "about",
          label: messages?.site?.navigation?.about || "About",
        },
      ],
      title: footerNavigation.company || "Company",
    },
    {
      key: "legal",
      links: [
        {
          href: privacyHref,
          icon: "lock",
          key: "privacy",
          label: legalNavigation.privacy || "Privacy",
        },
        {
          href: disclaimerHref,
          icon: "shield",
          key: "disclaimer",
          label: legalNavigation.disclaimer || "Disclaimer",
        },
      ],
      title: footerNavigation.legal || "Legal",
    },
  ];

  return sections
    .map((section) => ({
      ...section,
      links: section.links.filter(
        (link, index, links) => link?.href && links.findIndex((candidate) => candidate.href === link.href) === index,
      ),
    }))
    .filter((section) => section.links.length);
}

/**
 * Shared normalization and navigation helpers used by the public site shell.
 */
export const siteShellUtils = Object.freeze({
  buildFooterSections,
  isNavigationActive,
  normalizePathname,
  publicNavigationIcons,
});
