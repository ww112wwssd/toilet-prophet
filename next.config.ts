import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel runs the Next.js adapter; the Cloudflare build remains available
  // through the existing Vinext scripts.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
