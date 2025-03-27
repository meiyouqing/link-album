/** @type {import('next').NextConfig} */
const { version } = require("./package.json");
const { i18n } = require("./next-i18next.config");

const nextConfig = {
  i18n,
  reactStrictMode: true,
  staticPageGenerationTimeout: 1000,
  images: {
    // For fetching the favicons
    domains: ["t2.gstatic.com"],

    // For profile pictures (Google OAuth)
    remotePatterns: [
      {
        hostname: "*.googleusercontent.com",
      },
    ],

    minimumCacheTTL: 10,
  },
  env: {
    version,
    NEXT_DISABLE_TELEMETRY: "1",
  },
  swcMinify: true,
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
