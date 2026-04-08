/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compiler: {
    styledComponents: true,
  },
  env: {
    DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
    SUPPORTED_LOCALES: process.env.SUPPORTED_LOCALES,
  },
  images: {
    remotePatterns: [
      {
        hostname: "**",
        protocol: "https",
      },
      {
        hostname: "**",
        protocol: "http",
      },
    ],
  },
};

export default nextConfig;
