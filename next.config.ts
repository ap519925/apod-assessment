import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build to plain HTML/CSS/JS in ./out so it can be served by any static host
  // (deployed on Wasmer Edge with static-web-server, see wasmer.toml).
  output: "export",
  // Emit /apod/2026-01-01/index.html instead of /apod/2026-01-01.html so the
  // static server can resolve clean URLs without rewrites.
  trailingSlash: true,
};

export default nextConfig;
