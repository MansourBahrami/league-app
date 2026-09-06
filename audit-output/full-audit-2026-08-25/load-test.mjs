import pg from "pg";
import { SignJWT } from "jose";

const baseUrl = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3001";
const testPhone = process.env.AUDIT_TEST_PHONE || "09120000009";
const requestTimeoutMs = 30_000;

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  throw new Error("DATABASE_URL and JWT_SECRET are required");
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const { rows } = await db.query(
  'SELECT id, "sessionVersion" FROM "User" WHERE phone = $1 LIMIT 1',
  [testPhone],
);
await db.end();

if (!rows[0]) throw new Error(`Audit test user ${testPhone} was not found`);

const token = await new SignJWT({
  userId: rows[0].id,
  sessionVersion: rows[0].sessionVersion,
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));

const cookie = `league_session=${token}`;

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)]);
}

async function timedFetch(path) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { cookie },
      redirect: "manual",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    await response.arrayBuffer();
    return { status: response.status, ms: performance.now() - started };
  } catch (error) {
    return {
      status: "error",
      ms: performance.now() - started,
      error: error instanceof Error ? error.name : "unknown",
    };
  }
}

async function runBatch(label, paths, concurrency) {
  let next = 0;
  const results = [];
  const started = performance.now();
  await Promise.all(
    Array.from({ length: Math.min(concurrency, paths.length) }, async () => {
      while (next < paths.length) {
        const index = next++;
        results[index] = await timedFetch(paths[index]);
      }
    }),
  );
  const elapsedMs = performance.now() - started;
  const latencies = results.map((item) => item.ms);
  const statuses = Object.groupBy(results, (item) => String(item.status));
  return {
    label,
    total: results.length,
    concurrency,
    elapsedMs: Math.round(elapsedMs),
    requestsPerSecond: Number((results.length / (elapsedMs / 1000)).toFixed(1)),
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    p99Ms: percentile(latencies, 0.99),
    maxMs: Math.round(Math.max(...latencies)),
    statuses: Object.fromEntries(
      Object.entries(statuses).map(([status, items]) => [status, items.length]),
    ),
  };
}

async function runSseConnections(count) {
  const controllers = Array.from({ length: count }, () => new AbortController());
  let connected = 0;
  let failed = 0;
  const started = performance.now();

  await Promise.all(
    controllers.map(async (controller) => {
      try {
        const response = await fetch(`${baseUrl}/api/feed/stream`, {
          headers: { cookie, accept: "text/event-stream" },
          signal: controller.signal,
        });
        if (response.ok && response.headers.get("content-type")?.includes("text/event-stream")) {
          connected += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }),
  );

  await new Promise((resolve) => setTimeout(resolve, 5_000));
  controllers.forEach((controller) => controller.abort());
  return {
    label: "500 simultaneous SSE connections held for 5s",
    attempted: count,
    connected,
    failed,
    connectElapsedMs: Math.round(performance.now() - started - 5_000),
  };
}

await timedFetch("/dashboard");

const mixedRoutes = [
  "/dashboard",
  "/leaderboard",
  "/profile",
  "/feed",
  "/api/focus/active",
];

const output = [];
output.push(await runBatch("100 mixed authenticated GETs", Array.from({ length: 100 }, (_, i) => mixedRoutes[i % mixedRoutes.length]), 25));
output.push(await runBatch("500 simultaneous dashboard SSR requests", Array(500).fill("/dashboard"), 500));
output.push(await runSseConnections(500));

console.log(JSON.stringify({ baseUrl, poolMax: process.env.DB_POOL_MAX || "default:10", results: output }, null, 2));
