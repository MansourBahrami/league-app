import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import { redis } from "../lib/redis";
import { COOKIE_NAME, signToken } from "../lib/auth";

const REPLICA_A = (process.env.REPLICA_A_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const REPLICA_B = (process.env.REPLICA_B_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");

async function assertLoadTestReplica(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/health`);
  const data = await response.json() as { status?: string; loadTestReady?: boolean };
  assert.equal(response.ok, true, `${baseUrl} health failed`);
  assert.equal(data.loadTestReady, true, `${baseUrl} must run with GCAMP_LOAD_TEST_MODE=1`);
}

async function waitForText(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  predicate: (text: string) => boolean,
  timeoutMs = 10_000,
) {
  const deadline = Date.now() + timeoutMs;
  const decoder = new TextDecoder();
  let text = "";
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const result = await Promise.race([
      reader.read(),
      new Promise<never>((_resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("sse_timeout")), remaining);
        timer.unref?.();
      }),
    ]);
    if (result.done) throw new Error("sse_closed");
    text += decoder.decode(result.value, { stream: true });
    if (predicate(text)) return text;
  }
  throw new Error("sse_timeout");
}

async function main() {
  if (process.env.DEV_LOAD_TEST_CONFIRM !== "1") {
    throw new Error("DEV_LOAD_TEST_CONFIRM=1 لازم است.");
  }
  await Promise.all([assertLoadTestReplica(REPLICA_A), assertLoadTestReplica(REPLICA_B)]);

  const suffix = String(Date.now()).slice(-7);
  const users = await prisma.$transaction([
    prisma.user.create({
      data: {
        phone: `0996${suffix}`,
        name: "بیننده تست replica",
        onboardingDay: 1,
        isLeadComplete: true,
        videoAccess: "free",
        profilePublic: false,
        activityPublic: false,
      },
    }),
    prisma.user.create({
      data: {
        phone: `0997${suffix}`,
        name: "مطالعه‌گر تست replica",
        onboardingDay: 1,
        isLeadComplete: true,
        videoAccess: "free",
        profilePublic: true,
        activityPublic: true,
      },
    }),
  ]);
  const [viewer, actor] = users;
  const userIds = users.map((user) => user.id);
  const abort = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  try {
    const [viewerToken, actorToken] = await Promise.all(users.map((user) => signToken({
      userId: user.id,
      sessionVersion: user.sessionVersion,
    })));
    await redis.mset(
      `gcamp:session-version:${viewer.id}`, String(viewer.sessionVersion),
      `gcamp:session-version:${actor.id}`, String(actor.sessionVersion),
    );

    const streamResponse = await fetch(`${REPLICA_A}/api/feed/stream`, {
      headers: { Cookie: `${COOKIE_NAME}=${viewerToken}` },
      signal: abort.signal,
    });
    assert.equal(streamResponse.ok, true);
    assert.ok(streamResponse.body);
    reader = streamResponse.body.getReader();
    await waitForText(reader, (text) => text.includes(": connected"));
    await new Promise((resolve) => setTimeout(resolve, 250));

    const requestId = `replica-${suffix}`;
    const startResponse = await fetch(`${REPLICA_B}/api/study/start`, {
      method: "POST",
      headers: {
        Cookie: `${COOKIE_NAME}=${actorToken}`,
        Origin: REPLICA_B,
        "Content-Type": "application/json",
        "X-Gcamp-Load-Test": "1",
      },
      body: JSON.stringify({ durationMin: 30, requestId }),
    });
    const startData = await startResponse.json() as { sessionId?: string };
    assert.equal(startResponse.ok, true);
    assert.ok(startData.sessionId);

    const received = await waitForText(
      reader,
      (text) => text.includes(actor.id) && text.includes("timer_start"),
    );
    assert.ok(received.includes(actor.id));

    const endResponse = await fetch(`${REPLICA_B}/api/study/end`, {
      method: "POST",
      headers: {
        Cookie: `${COOKIE_NAME}=${actorToken}`,
        Origin: REPLICA_B,
        "Content-Type": "application/json",
        "X-Gcamp-Load-Test": "1",
      },
      body: JSON.stringify({ sessionId: startData.sessionId }),
    });
    assert.equal(endResponse.ok, true);

    const deadline = Date.now() + 5_000;
    while (
      await prisma.productEventOutbox.count({ where: { distinctId: actor.id } }) < 2
      && Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(await prisma.productEventOutbox.count({ where: { distinctId: actor.id } }), 2);
    console.log("✅ cross-replica Redis SSE delivery test passed");
  } finally {
    abort.abort();
    await reader?.cancel().catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.productEventOutbox.deleteMany({ where: { distinctId: { in: userIds } } });
    await redis.del(...userIds.map((id) => `gcamp:session-version:${id}`));
    const replayItems = await redis.lrange("gcamp:feed:recent", 0, 99);
    for (const item of replayItems.filter((value) => value.includes(actor.id))) {
      await redis.lrem("gcamp:feed:recent", 0, item);
    }
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  }
}

void main();
