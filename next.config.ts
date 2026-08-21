import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.152.254.175",
    "10.152.254.175:3000",
    "192.168.10.21",
    "localhost:3000",
  ],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
});
