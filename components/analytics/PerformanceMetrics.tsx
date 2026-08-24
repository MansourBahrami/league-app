"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { capturePerformanceEvent } from "@/lib/analytics-client";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

interface NetworkInformation {
  effectiveType?: string;
  saveData?: boolean;
}

interface PendingNavigation {
  from: string;
  to: string;
  startedAt: number;
}

let pendingNavigation: PendingNavigation | null = null;

function getNetworkProperties() {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return {
    network_type: connection?.effectiveType ?? "unknown",
    save_data: connection?.saveData ?? false,
    display_mode: window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser",
  };
}

const reportWebVitals: ReportWebVitalsCallback = (metric) => {
  capturePerformanceEvent("web_vital", {
    metric: metric.name,
    value: Math.round(metric.value * 100) / 100,
    rating: metric.rating,
    navigation_type: metric.navigationType,
    pathname: window.location.pathname,
    ...getNetworkProperties(),
  });
};

export default function PerformanceMetrics() {
  const pathname = usePathname();
  useReportWebVitals(reportWebVitals);

  useEffect(() => {
    function handleInternalNavigation(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const from = window.location.pathname;
      if (destination.pathname === from && destination.search === window.location.search) return;

      pendingNavigation = {
        from,
        to: destination.pathname,
        startedAt: performance.now(),
      };
    }

    document.addEventListener("click", handleInternalNavigation, true);
    return () => document.removeEventListener("click", handleInternalNavigation, true);
  }, []);

  useEffect(() => {
    const navigation = pendingNavigation;
    if (!navigation || navigation.to !== pathname) return;

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        capturePerformanceEvent("route_navigation", {
          from_path: navigation.from,
          to_path: pathname,
          duration_ms: Math.round(performance.now() - navigation.startedAt),
          ...getNetworkProperties(),
        });
        pendingNavigation = null;
      });
    });

    return () => window.cancelAnimationFrame(firstFrame);
  }, [pathname]);

  return null;
}
