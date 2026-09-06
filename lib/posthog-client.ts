"use client";

import type { PostHog } from "posthog-js";
import { captureException, withScope } from "@sentry/nextjs";

let posthogPromise: Promise<PostHog | null> | null = null;

function loadPostHog(): Promise<PostHog | null> {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return Promise.resolve(null);
  if (posthogPromise) return posthogPromise;

  posthogPromise = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      defaults: "2026-05-30",
      autocapture: false,
      capture_pageview: "history_change",
      capture_pageleave: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_product_tours: true,
      disable_web_experiments: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      person_profiles: "identified_only",
    });
    return posthog;
  }).catch((caught) => {
    withScope((scope) => {
      scope.setTag("operation", "analytics.posthog_load");
      captureException(caught instanceof Error ? caught : new Error(String(caught)));
    });
    return null;
  });

  return posthogPromise;
}

function runWhenIdle(callback: () => void) {
  const requestIdle = (window as Window & {
    requestIdleCallback?: (handler: () => void, options?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (requestIdle) {
    requestIdle(callback, { timeout: 2000 });
  } else {
    globalThis.setTimeout(callback, 1);
  }
}

export function schedulePostHogInitialization() {
  runWhenIdle(() => void loadPostHog());
}

export function withPostHog(callback: (posthog: PostHog) => void) {
  runWhenIdle(() => {
    void loadPostHog().then((posthog) => {
      if (posthog) callback(posthog);
    });
  });
}
