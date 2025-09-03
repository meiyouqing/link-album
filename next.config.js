/** @type {import('next').NextConfig} */
const { version } = require("./package.json");
const { i18n } = require("./next-i18next.config");

const nextConfig = {
  i18n,
  reactStrictMode: true,
  staticPageGenerationTimeout: 10000,
  images: {
    // For fetching the favicons
    domains: ["t2.gstatic.com"],

    // For profile pictures (Google OAuth)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.kukecloud.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],

    minimumCacheTTL: 10,
    unoptimized: true,
  },
  env: {
    version,
  },
};

module.exports = nextConfig;
