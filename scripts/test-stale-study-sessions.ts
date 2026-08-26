import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import { redis } from "../lib/redis";
import { settleExpiredStudySessions } from "../lib/stale-study-sessions";

async function main() {
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      phone: `09${String(Date.now()).slice(-9)}`,
      name: "تست تسویه خودکار",
      onboardingDay: 1,
      isLeadComplete: true,
      profilePublic: false,
      activityPublic: false,
    },
  });

  try {
    const studySession = await prisma.studySession.create({
      data: {
        userId: user.id,
        startTime: new Date(now.getTime() - 31 * 60 * 1000),
        plannedMin: 30,
        durationMin: 0,
      },
    });

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        settleExpiredStudySessions(now, { userIds: [user.id] })),
    );
    const [settledSession, updatedUser, activity] = await Promise.all([
      prisma.studySession.findUniqueOrThrow({ where: { id: studySession.id } }),
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      prisma.activityLog.findUnique({
        where: { dedupeKey: `study-session-complete:${studySession.id}` },
      }),
    ]);

    assert.equal(results.reduce((sum, result) => sum + result.settled, 0), 1);
    assert.ok(settledSession.endTime);
    assert.equal(settledSession.durationMin, 30);
    assert.equal(settledSession.xpEarned, 2);
    assert.equal(settledSession.coinsEarned, 2);
    assert.equal(updatedUser.xp, 2);
    assert.equal(updatedUser.coins, 2);
    assert.ok(activity);
    const activityCount = await prisma.activityLog.count({
      where: { dedupeKey: `study-session-complete:${studySession.id}` },
    });
    assert.equal(activityCount, 1);

    const pausedSession = await prisma.studySession.create({
      data: {
        userId: user.id,
        startTime: new Date(now.getTime() - 26 * 60 * 60 * 1000),
        pausedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
        plannedMin: 30,
        durationMin: 0,
      },
    });
    const pausedResults = await Promise.all(
      Array.from({ length: 20 }, () =>
        settleExpiredStudySessions(now, { userIds: [user.id] })),
    );
    const [settledPausedSession, userAfterPaused, pausedActivity] = await Promise.all([
      prisma.studySession.findUniqueOrThrow({ where: { id: pausedSession.id } }),
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      prisma.activityLog.findUnique({
        where: { dedupeKey: `study-session-complete:${pausedSession.id}` },
      }),
    ]);

    assert.equal(pausedResults.reduce((sum, result) => sum + result.settled, 0), 1);
    assert.equal(pausedResults.reduce((sum, result) => sum + result.historical, 0), 1);
    assert.equal(settledPausedSession.endTime?.getTime(), pausedSession.pausedAt?.getTime());
    assert.equal(settledPausedSession.pausedAt, null);
    assert.equal(settledPausedSession.durationMin, 30);
    assert.equal(settledPausedSession.xpEarned, 2);
    assert.equal(settledPausedSession.coinsEarned, 2);
    assert.equal(userAfterPaused.xp, 4);
    assert.equal(userAfterPaused.coins, 4);
    assert.ok(pausedActivity);
    console.log("✅ stale study session settlement concurrency test passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  }
}

void main();
