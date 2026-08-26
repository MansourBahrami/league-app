import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import {
  endStudySession,
  getActiveStudySessionSnapshot,
  grantStudyTick,
  pauseStudySession,
  resumeStudySession,
  startStudySession,
} from "../lib/study-session";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

async function createTestUser() {
  return prisma.user.create({
    data: {
      name: "تست هم‌زمانی تایمر",
      xp: 0,
      coins: 0,
      isLeadComplete: true,
      onboardingDay: 1,
    },
  });
}

async function testConcurrentStarts() {
  const user = await createTestUser();
  try {
    const requestId = crypto.randomUUID();
    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        startStudySession({
          userId: user.id,
          plannedMin: 30,
          clientRequestId: requestId,
        }),
      ),
    );

    const openSessions = await prisma.studySession.count({
      where: { userId: user.id, endTime: null },
    });
    assert.equal(openSessions, 1, "برای هر کاربر فقط یک session باید باز بماند");
    assert.equal(new Set(results.map((result) => result.studySession.id)).size, 1);
    assert.equal(results.filter((result) => !result.reused).length, 1);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

async function testConcurrentTicks() {
  const user = await createTestUser();
  try {
    const now = new Date();
    const studySession = await prisma.studySession.create({
      data: {
        userId: user.id,
        startTime: new Date(now.getTime() - THIRTY_MINUTES_MS),
        plannedMin: 30,
      },
    });

    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        grantStudyTick({ userId: user.id, sessionId: studySession.id, now }),
      ),
    );
    const totalGranted = results.reduce(
      (sum, result) => sum + ("granted" in result ? result.granted : 0),
      0,
    );
    const [updatedUser, updatedSession] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      prisma.studySession.findUniqueOrThrow({ where: { id: studySession.id } }),
    ]);

    assert.equal(totalGranted, 2);
    assert.equal(updatedSession.tickCount, 2);
    assert.equal(updatedSession.xpEarned, 2);
    assert.equal(updatedSession.coinsEarned, 2);
    assert.equal(updatedUser.xp, 2);
    assert.equal(updatedUser.coins, 2);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

async function testConcurrentTickAndEnd() {
  const user = await createTestUser();
  try {
    const now = new Date();
    const studySession = await prisma.studySession.create({
      data: {
        userId: user.id,
        startTime: new Date(now.getTime() - THIRTY_MINUTES_MS),
        plannedMin: 30,
      },
    });

    const operations = [
      ...Array.from({ length: 50 }, () =>
        grantStudyTick({ userId: user.id, sessionId: studySession.id, now }),
      ),
      ...Array.from({ length: 50 }, () =>
        endStudySession({
          userId: user.id,
          sessionId: studySession.id,
          inOnboarding: false,
          startsNewTehranDay: false,
          now,
        }),
      ),
    ];
    await Promise.all(operations);

    const [updatedUser, updatedSession] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      prisma.studySession.findUniqueOrThrow({ where: { id: studySession.id } }),
    ]);
    assert.ok(updatedSession.endTime);
    assert.equal(updatedSession.durationMin, 30);
    assert.equal(updatedSession.xpEarned, 2);
    assert.equal(updatedSession.coinsEarned, 2);
    assert.equal(updatedUser.xp, 2);
    assert.equal(updatedUser.coins, 2);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

async function testConcurrentEnds() {
  const user = await createTestUser();
  try {
    const now = new Date();
    const studySession = await prisma.studySession.create({
      data: {
        userId: user.id,
        startTime: new Date(now.getTime() - THIRTY_MINUTES_MS),
        plannedMin: 30,
      },
    });

    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        endStudySession({
          userId: user.id,
          sessionId: studySession.id,
          inOnboarding: false,
          startsNewTehranDay: false,
          now,
        }),
      ),
    );
    assert.equal(results.filter((result) => result.status === "ended").length, 1);
    assert.equal(
      results.filter((result) => result.status === "already_ended").length,
      99,
    );

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    assert.equal(updatedUser.xp, 2);
    assert.equal(updatedUser.coins, 2);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

async function testPauseResumeAndSnapshot() {
  const user = await createTestUser();
  try {
    const now = new Date();
    const studySession = await prisma.studySession.create({
      data: {
        userId: user.id,
        startTime: new Date(now.getTime() - 5 * 60 * 1000),
        plannedMin: 30,
      },
    });

    const pauseResults = await Promise.all(
      Array.from({ length: 100 }, () =>
        pauseStudySession({ userId: user.id, sessionId: studySession.id, now }),
      ),
    );
    assert.equal(pauseResults.filter((result) => result === "updated").length, 1);
    assert.equal(
      pauseResults.filter((result) => result === "already_paused").length,
      99,
    );

    const resumeAt = new Date(now.getTime() + 60_000);
    const resumeResults = await Promise.all(
      Array.from({ length: 100 }, () =>
        resumeStudySession({
          userId: user.id,
          sessionId: studySession.id,
          now: resumeAt,
        }),
      ),
    );
    assert.equal(
      resumeResults.filter((result) => result.status === "updated").length,
      1,
    );
    assert.equal(
      resumeResults.filter((result) => result.status === "already_running").length,
      99,
    );

    const snapshot = await getActiveStudySessionSnapshot(
      user.id,
      new Date(resumeAt.getTime() + 60_000),
    );
    assert.ok(snapshot);
    assert.equal(snapshot.state, "running");
    assert.equal(snapshot.elapsedSeconds, 6 * 60);
    assert.equal(snapshot.secondsLeft, 24 * 60);

    const stored = await prisma.studySession.findUniqueOrThrow({
      where: { id: studySession.id },
    });
    assert.equal(stored.pausedSec, 60);
    assert.equal(stored.pausedAt, null);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

async function main() {
  await testConcurrentStarts();
  await testConcurrentTicks();
  await testConcurrentTickAndEnd();
  await testConcurrentEnds();
  await testPauseResumeAndSnapshot();
  console.log("✅ study concurrency tests passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
