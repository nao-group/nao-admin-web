import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Project lives on an external/network volume where macOS writes
    // AppleDouble "._" metadata files. Turbopack's persistent cache
    // scanner chokes on those (fails parsing the numeric filenames),
    // so keep the filesystem cache disabled for both dev and production builds.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
