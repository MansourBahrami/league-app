import { logOperationalEvent } from "@/lib/observability";

type TimingEntry = { name: string; durationMs: number };

export function logSlowServerOperation(
  operation: string,
  startedAt: number,
  thresholdMs: number,
): void {
  const durationMs = performance.now() - startedAt;
  if (durationMs < thresholdMs) return;
  logOperationalEvent(`performance.${operation}`, {
    durationMs: Math.round(durationMs),
    thresholdMs,
  });
}

/** اندازه‌گیری سبک برای هدر استاندارد Server-Timing؛ بدون دادهٔ کاربر. */
export function createServerTiming() {
  const startedAt = performance.now();
  let previousMark = startedAt;
  const entries: TimingEntry[] = [];

  return {
    mark(name: string) {
      const now = performance.now();
      entries.push({ name, durationMs: now - previousMark });
      previousMark = now;
    },
    header(): string {
      const total = performance.now() - startedAt;
      return [
        ...entries.map(({ name, durationMs }) => `${name};dur=${durationMs.toFixed(1)}`),
        `total;dur=${total.toFixed(1)}`,
      ].join(", ");
    },
  };
}
