import bundleAnalyzer from "@next/bundle-analyzer";

function normalizeHostname(value) {
  const normalizedValue = `${value || ""}`.trim();

  if (!normalizedValue) {
    return "";
  }

  try {
    return new URL(normalizedValue).hostname;
  } catch {
    return normalizedValue
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim();
  }
}

function getRemoteImagePatterns() {
  const hostnames = [
    "flagcdn.com",
    normalizeHostname(process.env.NEXT_PUBLIC_APP_URL),
    normalizeHostname(process.env.S3_MEDIA_BASE_URL),
    ...`${process.env.NEXT_IMAGE_REMOTE_HOSTS || ""}`.split(",").map(normalizeHostname),
  ].filter(Boolean);
  const uniqueHostnames = [...new Set(hostnames)];

  return uniqueHostnames.flatMap((hostname) => [
    {
      hostname,
      protocol: "https",
    },
    ...(hostname === "localhost"
      ? [
          {
            hostname,
            protocol: "http",
          },
        ]
      : []),
  ]);
}

const withBundleAnalyzer = bundleAnalyzer({
  analyzerMode: process.env.BUNDLE_ANALYZE_FORMAT || "static",
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const releaseId =
  process.env.NEXT_PUBLIC_RELEASE_ID
  || process.env.GITHUB_SHA
  || process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.npm_package_version
  || "local";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compiler: {
    styledComponents: true,
  },
  experimental: {
    webVitalsAttribution: ["CLS", "INP", "LCP", "TTFB"],
  },
  env: {
    DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
    NEXT_PUBLIC_RELEASE_ID: releaseId,
    SUPPORTED_LOCALES: process.env.SUPPORTED_LOCALES,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    remotePatterns: getRemoteImagePatterns(),
  },
};

export default withBundleAnalyzer(nextConfig);
