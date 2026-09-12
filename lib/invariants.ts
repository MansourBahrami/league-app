import { prisma } from "@/lib/db";
import { captureCaughtError, logOperationalEvent } from "@/lib/observability";

export async function countActionableStaleStudySessions(now = new Date()) {
  const candidateCutoff = new Date(now.getTime() - 30 * 60_000);
  const staleCutoff = new Date(now.getTime() - 24 * 3_600_000);
  // Keep this definition aligned with stale-study-sessions.ts. A long-lived
  // paused session is only actionable after its 24-hour pause grace expires;
  // counting it from startTime alone creates a false alarm every cron cycle.
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "StudySession"
    WHERE "endTime" IS NULL
      AND "startTime" <= ${candidateCutoff}
      AND (
        ("pausedAt" IS NOT NULL AND "pausedAt" <= ${staleCutoff})
        OR (
          "pausedAt" IS NULL
          AND "startTime"
            + (("plannedMin" * 60 + "pausedSec") * INTERVAL '1 second') <= ${now}
        )
      )
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function runBusinessInvariantAudit(now = new Date()) {
  const oneHourAgo = new Date(now.getTime() - 3_600_000);
  const [negativeBalances, actionableStaleSessions, duplicateOpenRows, rewardMismatches, inboxCountRows, completedStudyRows, notificationAttempts, otpAttempts] = await Promise.all([
    prisma.user.count({ where: { OR: [{ coins: { lt: 0 } }, { xp: { lt: 0 } }] } }),
    countActionableStaleStudySessions(now),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT "userId" FROM "StudySession" WHERE "endTime" IS NULL
        GROUP BY "userId" HAVING COUNT(*) > 1
      ) duplicate_users
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "StudySession"
      WHERE "endTime" IS NOT NULL
        AND ("xpEarned" <> FLOOR("durationMin" / 15.0) OR "coinsEarned" <> FLOOR("durationMin" / 15.0))
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "User" AS u
      WHERE u."unreadInboxCount" <> (
        SELECT COUNT(*)::integer
        FROM "InboxItem" AS i
        WHERE i."userId" = u."id" AND i."read" = false
      )
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "User" AS u
      WHERE u."hasCompletedStudySession" <> EXISTS (
        SELECT 1 FROM "StudySession" AS s
        WHERE s."userId" = u."id"
          AND s."endTime" IS NOT NULL
          AND s."durationMin" >= 15
      )
    `,
    prisma.notificationLog.groupBy({
      by: ["status"],
      where: { sentAt: { gte: oneHourAgo } },
      _count: { _all: true },
    }),
    prisma.authAttempt.groupBy({
      by: ["action", "status"],
      where: { createdAt: { gte: oneHourAgo } },
      _count: { _all: true },
    }),
  ]);

  const result = {
    negativeBalances,
    staleSessions: actionableStaleSessions,
    duplicateOpenSessions: Number(duplicateOpenRows[0]?.count ?? 0),
    rewardMismatches: Number(rewardMismatches[0]?.count ?? 0),
    inboxCountMismatches: Number(inboxCountRows[0]?.count ?? 0),
    completedStudyMismatches: Number(completedStudyRows[0]?.count ?? 0),
    notificationAttemptsLastHour: Object.fromEntries(notificationAttempts.map((row) => [row.status, row._count._all])),
    otpAttemptsLastHour: otpAttempts.map((row) => ({ action: row.action, status: row.status, count: row._count._all })),
  };

  const violationCount = result.negativeBalances
    + result.staleSessions
    + result.duplicateOpenSessions
    + result.rewardMismatches
    + result.inboxCountMismatches
    + result.completedStudyMismatches;
  if (violationCount > 0) {
    captureCaughtError("business_invariants.violation", new Error("Business invariant violation"), {
      negativeBalances: result.negativeBalances,
      staleSessions: result.staleSessions,
      duplicateOpenSessions: result.duplicateOpenSessions,
      rewardMismatches: result.rewardMismatches,
      inboxCountMismatches: result.inboxCountMismatches,
      completedStudyMismatches: result.completedStudyMismatches,
    });
  } else {
    logOperationalEvent("business_invariants.ok");
  }
  return result;
}
