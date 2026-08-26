import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  deploymentId: process.env.APP_VERSION || undefined,
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
    treeshake: {
      removeDebugLogging: true,
      // Product performance is reported through the lightweight Web Vitals
      // pipeline. Keep Sentry focused on errors so low-end devices do not pay
      // for a second tracing implementation.
      removeTracing: true,
      excludeReplayIframe: true,
      excludeReplayShadowDOM: true,
    },
  },
});
