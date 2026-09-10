import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // whatsapp-web.js (and its puppeteer dependency) pull in optional,
  // native, or otherwise-unbundlable code paths (e.g. an AWS SDK import
  // used only by an auth strategy we don't use). Keeping them external
  // means Node's own require() loads them at runtime instead of Next
  // trying to statically bundle every import inside them.
  serverExternalPackages: ["whatsapp-web.js", "puppeteer", "unzipper"],
};

export default nextConfig;
