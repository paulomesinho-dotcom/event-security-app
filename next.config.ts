import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.79"],
  turbopack: {}, // Silence the Turbopack warning
};

export default nextConfig;
