import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.GITHUB_ACTIONS ? "/KI" : "",
  assetPrefix: process.env.GITHUB_ACTIONS ? "/KI/" : "",
};

export default nextConfig;
