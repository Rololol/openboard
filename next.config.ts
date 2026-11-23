import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "export",
  basePath: isGitHubPages ? "/openboard" : "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
