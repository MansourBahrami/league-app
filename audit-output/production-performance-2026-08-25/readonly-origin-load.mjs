import http from "node:http";

const host = process.env.AUDIT_HOST ?? "127.0.0.1";
const port = Number(process.env.AUDIT_PORT ?? 3000);
const path = process.env.AUDIT_PATH ?? "/login";
const hostHeader = process.env.AUDIT_HOST_HEADER ?? "app.gcamp.ir";
const phases = (process.env.AUDIT_CONCURRENCY ?? "25,100,250,500")
  .split(",")
  .map(Number)
  .filter((value) => Number.isInteger(value) && value > 0);

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function requestOnce() {
  const startedAt = performance.now();
  return new Promise((resolve) => {
    const request = http.get(
      {
        host,
        port,
        path,
        headers: { Host: hostHeader, "User-Agent": "gcamp-readonly-capacity-audit/1.0" },
        timeout: 10_000,
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve({
            ok: response.statusCode === 200,
            status: response.statusCode ?? 0,
            ms: performance.now() - startedAt,
          });
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", () => resolve({ ok: false, status: 0, ms: performance.now() - startedAt }));
  });
}

for (const concurrency of phases) {
  const startedAt = performance.now();
  const results = await Promise.all(Array.from({ length: concurrency }, requestOnce));
  const elapsedMs = performance.now() - startedAt;
  const times = results.map((result) => result.ms);
  const errors = results.filter((result) => !result.ok).length;
  const result = {
    path,
    concurrency,
    requests: results.length,
    errors,
    errorRate: errors / results.length,
    elapsedMs: Math.round(elapsedMs),
    requestsPerSecond: Number(((results.length * 1000) / elapsedMs).toFixed(1)),
    p50Ms: Math.round(percentile(times, 0.5)),
    p95Ms: Math.round(percentile(times, 0.95)),
    p99Ms: Math.round(percentile(times, 0.99)),
    maxMs: Math.round(Math.max(...times)),
  };
  console.log(JSON.stringify(result));

  if (result.errorRate > 0.01 || result.p95Ms > 3_000) {
    console.error("STOP_GUARD_TRIGGERED");
    process.exitCode = 2;
    break;
  }
}
