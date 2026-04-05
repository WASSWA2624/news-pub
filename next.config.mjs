/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  env: {
    DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
    SUPPORTED_LOCALES: process.env.SUPPORTED_LOCALES,
  },
};

export default nextConfig;
