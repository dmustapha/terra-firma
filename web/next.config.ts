// File: web/next.config.ts
// [VERIFIED] Next.js 15.5 config; turbopack.root pins the workspace (a stray ~/package-lock.json exists on the dev machine).
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: path.join(__dirname) },
  experimental: { optimizePackageImports: ["viem", "wagmi", "@tanstack/react-query"] },
};

export default nextConfig;
