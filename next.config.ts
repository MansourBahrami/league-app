import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.152.254.175",
    "10.152.254.175:3000",
    "192.168.10.21",
    "localhost:3000",
  ],
};

export default nextConfig;
