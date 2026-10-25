import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // The app is opened at 127.0.0.1 while the dev server also answers on localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
