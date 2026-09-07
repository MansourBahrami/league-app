import { performance } from "node:perf_hooks";
import { prisma } from "../lib/db";
import { signToken, COOKIE_NAME } from "../lib/auth";
import { broadcastActivity } from "../lib/feed-broadcast";
import { redis } from "../lib/redis";

const USERS = Number(process.env.LOAD_USERS ?? 500);
const BASE_URL = (process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const SSE_TIMEOUT_MS = Number(process.env.LOAD_SSE_TIMEOUT_MS ?? 15_000);
const REQUEST_TIMEOUT_MS = Number(process.env.LOAD_REQUEST_TIMEOUT_MS ?? 120_000);
const ACTIVE_HOLD_MS = Number(process.env.LOAD_ACTIVE_HOLD_SECONDS ?? 0) * 1_000;
const OBSERVATION_HOLD_MS = Number(process.env.LOAD_OBSERVATION_HOLD_SECONDS ?? 0) * 1_000;
const VISIBLE_ACTIVITY = process.env.LOAD_VISIBLE_ACTIVITY === "1";
const USER_LABEL = process.env.LOAD_USER_LABEL?.trim() || "کاربر بار";

interface PhaseMetrics {
  requests: number;
  errors: number;
  totalMs: number;
  rps: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

interface OpenStream {
  abort: AbortController;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  decoder: TextDecoder;
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ?? 0;
}

async function runPhase<TInput, TOutput>(
  name: string,
  inputs: TInput[],
  task: (input: TInput, index: number) => Promise<TOutput>,
): Promise<{ outputs: TOutput[]; metrics: PhaseMetrics }> {
  const phaseStarted = performance.now();
  const results = await Promise.all(inputs.map(async (input, index) => {
    const started = performance.now();
    try {
      return { ok: true as const, output: await task(input, index), duration: performance.now() - started };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - started,
      };
    }
  }));
  const totalMs = performance.now() - phaseStarted;
  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    throw new Error(`${name}_failed_${failures.length}:${JSON.stringify(failures.slice(0, 5))}`);
  }
  const durations = results.map((result) => result.duration);
  return {
    outputs: results.map((result) => {
      if (!result.ok) throw new Error("unreachable_phase_failure");
      return result.output;
    }),
    metrics: {
      requests: inputs.length,
      errors: 0,
      totalMs: Math.round(totalMs),
      rps: Number((inputs.length / (totalMs / 1000)).toFixed(1)),
      p50Ms: Math.round(percentile(durations, 0.5)),
      p95Ms: Math.round(percentile(durations, 0.95)),
      p99Ms: Math.round(percentile(durations, 0.99)),
    },
  };
}

async function requestJson<T>(
  token: string,
  pathname: string,
  init: RequestInit = {},
): Promise<{ response: Response; data: T }> {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...init,
    headers: {
      Cookie: `${COOKIE_NAME}=${token}`,
      Origin: BASE_URL,
      "Content-Type": "application/json",
      "X-Gcamp-Load-Test": "1",
      ...init.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({})) as T;
  return { response, data };
}

async function readUntil(
  stream: OpenStream,
  predicate: (text: string) => boolean,
  timeoutMs: number,
) {
  const timeout = setTimeout(() => stream.abort.abort(), timeoutMs);
  timeout.unref?.();
  let combined = "";
  try {
    while (true) {
      const { done, value } = await stream.reader.read();
      if (done) throw new Error("stream_closed");
      combined += stream.decoder.decode(value, { stream: true });
      if (predicate(combined)) return;
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function openSse(token: string): Promise<OpenStream> {
  const abort = new AbortController();
  const response = await fetch(`${BASE_URL}/api/feed/stream`, {
    headers: { Cookie: `${COOKIE_NAME}=${token}` },
    signal: abort.signal,
  });
  if (!response.ok || !response.body) throw new Error(`sse_${response.status}`);
  const stream = { abort, reader: response.body.getReader(), decoder: new TextDecoder() };
  await readUntil(stream, (text) => text.includes(": connected"), SSE_TIMEOUT_MS);
  return stream;
}

async function main() {
  if (process.env.DEV_LOAD_TEST_CONFIRM !== "1") {
    throw new Error("برای اجرای تست مخرب توسعه، DEV_LOAD_TEST_CONFIRM=1 لازم است.");
  }
  if (!Number.isInteger(USERS) || USERS < 1 || USERS > 2_000) {
    throw new Error("LOAD_USERS باید بین ۱ و ۲۰۰۰ باشد.");
  }
  if (![ACTIVE_HOLD_MS, OBSERVATION_HOLD_MS].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("زمان‌های انتظار تست باید عدد نامنفی باشند.");
  }
  const target = new URL(BASE_URL);
  const isLocalTarget = ["127.0.0.1", "localhost", "::1"].includes(target.hostname);
  if (!isLocalTarget && process.env.PRODUCTION_LOAD_TEST_CONFIRM !== "1") {
    throw new Error("برای اجرای تست روی مقصد غیرمحلی، PRODUCTION_LOAD_TEST_CONFIRM=1 لازم است.");
  }

  const health = await fetch(`${BASE_URL}/api/health`);
  if (!health.ok) throw new Error(`health_${health.status}`);
  const healthData = await health.json() as { loadTestReady?: boolean };
  if (!healthData.loadTestReady) {
    throw new Error("سرور باید با GCAMP_LOAD_TEST_MODE=1 اجرا شود تا رویدادهای تست به analytics خارجی ارسال نشوند.");
  }

  const batch = String(Math.floor(Math.random() * 1_000)).padStart(3, "0");
  const phones = Array.from(
    { length: USERS },
    (_, index) => `0998${batch}${String(index).padStart(4, "0")}`,
  );
  const createdIds: string[] = [];
  const streams: OpenStream[] = [];
  let marker: string | null = null;
  const testStarted = performance.now();
  let summary: Record<string, unknown> | null = null;
  let cleanupFailure: string | null = null;
  const cleanup = { users: 0, outboxEvents: 0, residualRows: 0, residualCacheKeys: 0, replayEvents: 0 };

  try {
    await prisma.user.createMany({
      data: phones.map((phone, index) => ({
        phone,
        name: `${USER_LABEL} ${String(index + 1).padStart(2, "0")}`,
        grade: "دوازدهم",
        field: "ریاضی",
        onboardingDay: 1,
        isLeadComplete: true,
        hasSeenIntro: true,
        videoAccess: "free",
        profilePublic: VISIBLE_ACTIVITY,
        activityPublic: VISIBLE_ACTIVITY,
      })),
    });
    const users = await prisma.user.findMany({
      where: { phone: { in: phones } },
      select: { id: true, sessionVersion: true },
    });
    createdIds.push(...users.map((user) => user.id));
    if (users.length !== USERS) throw new Error(`created_${users.length}_of_${USERS}`);

    const tokens = await Promise.all(users.map((user) => signToken({
      userId: user.id,
      sessionVersion: user.sessionVersion,
    })));
    const sessionCache = redis.pipeline();
    for (const user of users) {
      sessionCache.set(`gcamp:session-version:${user.id}`, String(user.sessionVersion), "EX", 300);
    }
    await sessionCache.exec();

    const actors = tokens.map((token, index) => ({ token, index }));
    const activeBefore = await runPhase("active_before", actors, async ({ token }) => {
      const { response, data } = await requestJson<{ activeSession: unknown }>(token, "/api/study/active");
      if (!response.ok || data.activeSession !== null) throw new Error(`active_before_${response.status}`);
      return true;
    });

    const starts = await runPhase("start", actors, async ({ token, index }) => {
      const requestId = `load-${batch}-${String(index).padStart(4, "0")}`;
      const { response, data } = await requestJson<{
        sessionId?: string;
        reused?: boolean;
      }>(token, "/api/study/start", {
        method: "POST",
        body: JSON.stringify({ durationMin: 30, requestId }),
      });
      if (!response.ok || !data.sessionId || data.reused) throw new Error(`start_${response.status}`);
      return { token, index, requestId, sessionId: data.sessionId };
    });

    const duplicateStarts = await runPhase("duplicate_start", starts.outputs, async (started) => {
      const { response, data } = await requestJson<{
        sessionId?: string;
        reused?: boolean;
      }>(started.token, "/api/study/start", {
        method: "POST",
        body: JSON.stringify({ durationMin: 30, requestId: started.requestId }),
      });
      if (!response.ok || !data.reused || data.sessionId !== started.sessionId) {
        throw new Error(`duplicate_start_${response.status}`);
      }
      return true;
    });

    if (ACTIVE_HOLD_MS > 0) {
      console.log(JSON.stringify({
        stage: "active_sessions_visible",
        users: USERS,
        holdSeconds: Math.round(ACTIVE_HOLD_MS / 1_000),
      }));
      await new Promise((resolve) => setTimeout(resolve, ACTIVE_HOLD_MS));
    }

    const pauses = await runPhase("pause", starts.outputs, async (started) => {
      const { response, data } = await requestJson<{ state?: string }>(started.token, "/api/study/pause", {
        method: "POST",
        body: JSON.stringify({ sessionId: started.sessionId }),
      });
      if (!response.ok || data.state !== "updated") throw new Error(`pause_${response.status}`);
      return true;
    });

    const resumes = await runPhase("resume", starts.outputs, async (started) => {
      const { response, data } = await requestJson<{ state?: string }>(started.token, "/api/study/resume", {
        method: "POST",
        body: JSON.stringify({ sessionId: started.sessionId }),
      });
      if (!response.ok || data.state !== "updated") throw new Error(`resume_${response.status}`);
      return true;
    });

    const ends = await runPhase("end", starts.outputs, async (started) => {
      const { response, data } = await requestJson<{
        durationMin?: number;
        xpEarned?: number;
        coinsEarned?: number;
      }>(started.token, "/api/study/end", {
        method: "POST",
        body: JSON.stringify({ sessionId: started.sessionId }),
      });
      if (
        !response.ok
        || typeof data.durationMin !== "number"
        || data.durationMin < 0
        || data.durationMin >= 15
        || data.xpEarned !== 0
        || data.coinsEarned !== 0
      ) {
        throw new Error(`end_${response.status}`);
      }
      return true;
    });

    const duplicateEnds = await runPhase("duplicate_end", starts.outputs, async (started) => {
      const { response, data } = await requestJson<{ alreadyEnded?: boolean }>(started.token, "/api/study/end", {
        method: "POST",
        body: JSON.stringify({ sessionId: started.sessionId }),
      });
      if (response.status !== 409 || !data.alreadyEnded) throw new Error(`duplicate_end_${response.status}`);
      return true;
    });

    const activeAfter = await runPhase("active_after", actors, async ({ token }) => {
      const { response, data } = await requestJson<{ activeSession: unknown }>(token, "/api/study/active");
      if (!response.ok || data.activeSession !== null) throw new Error(`active_after_${response.status}`);
      return true;
    });

    const dashboard = await runPhase("dashboard", actors, async ({ token }) => {
      const response = await fetch(`${BASE_URL}/dashboard`, {
        headers: { Cookie: `${COOKIE_NAME}=${token}`, "Accept-Language": "fa" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      await response.arrayBuffer();
      if (!response.ok || new URL(response.url).pathname !== "/dashboard") {
        throw new Error(`dashboard_${response.status}_${new URL(response.url).pathname}`);
      }
      return true;
    });

    const sseStarted = performance.now();
    const opened = await Promise.all(tokens.map((token) => openSse(token)));
    streams.push(...opened);
    const sseConnectElapsed = performance.now() - sseStarted;

    // فرصت کوتاه برای تکمیل subscribe مشترک Redis در تمام connectionها.
    await new Promise((resolve) => setTimeout(resolve, 500));
    const broadcastMarker = `load-${Date.now()}`;
    marker = broadcastMarker;
    broadcastActivity({ type: "load_test", marker: broadcastMarker });
    await Promise.all(streams.map((stream) =>
      readUntil(stream, (text) => text.includes(broadcastMarker), SSE_TIMEOUT_MS),
    ));

    summary = {
      users: USERS,
      phaseRequests: USERS * 9,
      totalHttpRequestsIncludingSse: USERS * 10,
      totalTestMs: Math.round(performance.now() - testStarted),
      phases: {
        activeBefore: activeBefore.metrics,
        start: starts.metrics,
        duplicateStart: duplicateStarts.metrics,
        pause: pauses.metrics,
        resume: resumes.metrics,
        end: ends.metrics,
        duplicateEnd: duplicateEnds.metrics,
        activeAfter: activeAfter.metrics,
        dashboard: dashboard.metrics,
      },
      sse: {
        connected: streams.length,
        connectTotalMs: Math.round(sseConnectElapsed),
        broadcastReceived: streams.length,
      },
      visibility: {
        publicActivity: VISIBLE_ACTIVITY,
        activeHoldMs: ACTIVE_HOLD_MS,
        observationHoldMs: OBSERVATION_HOLD_MS,
      },
    };
    if (OBSERVATION_HOLD_MS > 0) {
      console.log(JSON.stringify({
        stage: "results_visible_before_cleanup",
        users: USERS,
        holdSeconds: Math.round(OBSERVATION_HOLD_MS / 1_000),
      }));
      await new Promise((resolve) => setTimeout(resolve, OBSERVATION_HOLD_MS));
    }
  } finally {
    for (const stream of streams) {
      stream.abort.abort();
      await stream.reader.cancel().catch(() => undefined);
    }
    if (createdIds.length > 0) {
      // after()های start/end باید همهٔ رویدادهای durable را بسازند؛ در load-test mode
      // وضعیت suppressed است و هیچ رویدادی به analytics خارجی ارسال نمی‌شود.
      const expectedOutboxEvents = createdIds.length * 2;
      const outboxDeadline = Date.now() + 15_000;
      while (
        await prisma.productEventOutbox.count({ where: { distinctId: { in: createdIds } } })
          < expectedOutboxEvents
        && Date.now() < outboxDeadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const capturedOutboxEvents = await prisma.productEventOutbox.count({
        where: { distinctId: { in: createdIds } },
      });
      if (capturedOutboxEvents !== expectedOutboxEvents) {
        cleanupFailure = `load_test_outbox_incomplete:${capturedOutboxEvents}_of_${expectedOutboxEvents}`;
      }
      cleanup.users = (await prisma.user.deleteMany({ where: { id: { in: createdIds } } })).count;
      cleanup.outboxEvents = (await prisma.productEventOutbox.deleteMany({
        where: { distinctId: { in: createdIds } },
      })).count;
      await redis.del(...createdIds.map((id) => `gcamp:session-version:${id}`));
      const [usersLeft, sessionsLeft, activitiesLeft, outboxLeft, cachedVersions] = await Promise.all([
        prisma.user.count({ where: { id: { in: createdIds } } }),
        prisma.studySession.count({ where: { userId: { in: createdIds } } }),
        prisma.activityLog.count({ where: { userId: { in: createdIds } } }),
        prisma.productEventOutbox.count({ where: { distinctId: { in: createdIds } } }),
        redis.mget(...createdIds.map((id) => `gcamp:session-version:${id}`)),
      ]);
      cleanup.residualRows = usersLeft + sessionsLeft + activitiesLeft + outboxLeft;
      cleanup.residualCacheKeys = cachedVersions.filter((value) => value !== null).length;
    }
    if (marker) {
      const replayItems = await redis.lrange("gcamp:feed:recent", 0, 99);
      const matching = replayItems.filter((item) => item.includes(marker as string));
      for (const item of matching) await redis.lrem("gcamp:feed:recent", 0, item);
      cleanup.replayEvents = (await redis.lrange("gcamp:feed:recent", 0, 99))
        .filter((item) => item.includes(marker as string)).length;
    }
    await prisma.$disconnect();
    await redis.quit();
    if (cleanupFailure || cleanup.residualRows > 0 || cleanup.residualCacheKeys > 0 || cleanup.replayEvents > 0) {
      throw new Error(cleanupFailure ?? `load_test_cleanup_failed:${JSON.stringify(cleanup)}`);
    }
  }

  console.log(JSON.stringify({ ...summary, cleanup }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
