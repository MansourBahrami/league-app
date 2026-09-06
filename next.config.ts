import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://us.i.posthog.com https://*.ingest.de.sentry.io https://*.ingest.sentry.io wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // پوستهٔ ثابت صفحه‌ها در زمان build ساخته می‌شود و داده‌های شخصی/زنده داخل
  // Suspense در زمان درخواست استریم می‌شوند. این همان PPR در Next.js 16 است.
  cacheComponents: true,
  deploymentId: process.env.APP_VERSION || undefined,
  poweredByHeader: false,
  experimental: {
    // صفحه‌های شخصی همچنان روی سرور dynamic می‌مانند؛ این مقدار فقط payload
    // اخیر را در Router Cache مرورگر نگه می‌دارد تا رفت‌وبرگشت سریع بین تب‌های
    // پایین دوباره همان RSC را از شبکه نگیرد. mutationها طبق الگوی موجود
    // router.refresh() می‌کنند.
    staleTimes: {
      dynamic: 15,
      static: 180,
    },
  },
  allowedDevOrigins: [
    "10.152.254.175",
    "10.152.254.175:3000",
    "192.168.10.21",
    "localhost:3000",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
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
