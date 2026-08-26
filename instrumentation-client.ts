import * as Sentry from "@sentry/nextjs";
import { schedulePostHogInitialization } from "@/lib/posthog-client";

const device = navigator as Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};
const lowMemory = typeof device.deviceMemory === "number" && device.deviceMemory <= 2;
const constrainedDevice = typeof device.deviceMemory === "number"
  && device.deviceMemory <= 4
  && navigator.hardwareConcurrency <= 4;
if (device.connection?.saveData || lowMemory || constrainedDevice) {
  document.documentElement.dataset.performance = "low";
}

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
      if (event.request.url) {
        event.request.url = event.request.url.split("?")[0];
      }
    }
    if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
    return event;
  },
});

schedulePostHogInitialization();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
