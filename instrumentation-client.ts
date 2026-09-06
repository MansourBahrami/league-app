import { captureRouterTransitionStart, init } from "@sentry/nextjs";
import { schedulePostHogInitialization } from "@/lib/posthog-client";

const device = navigator as Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};
const lowMemory = typeof device.deviceMemory === "number" && device.deviceMemory <= 2;
const constrainedDevice = typeof device.deviceMemory === "number"
  && device.deviceMemory <= 4
  && navigator.hardwareConcurrency <= 4;
// Safari/iOS معمولاً deviceMemory را ارائه نمی‌کند؛ تعداد هسته پایین در آن
// دستگاه‌ها سیگنال محافظه‌کارانه‌ای برای حذف blur و animation دائمی است.
const constrainedCpuWithoutMemory = typeof device.deviceMemory !== "number"
  && navigator.hardwareConcurrency <= 4;
const constrainedNetwork = device.connection?.effectiveType === "slow-2g"
  || device.connection?.effectiveType === "2g";
if (
  device.connection?.saveData
  || lowMemory
  || constrainedDevice
  || constrainedCpuWithoutMemory
  || constrainedNetwork
) {
  document.documentElement.dataset.performance = "low";
}

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

init({
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

export const onRouterTransitionStart = captureRouterTransitionStart;
