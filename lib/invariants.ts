import { prisma } from "@/lib/db";
import { captureCaughtError, logOperationalEvent } from "@/lib/observability";

export async function runBusinessInvariantAudit(now = new Date()) {
  const oneHourAgo = new Date(now.getTime() - 3_600_000);
  const staleCutoff = new Date(now.getTime() - 24 * 3_600_000);
  const [negativeBalances, staleSessions, duplicateOpenRows, rewardMismatches, notificationAttempts, otpAttempts] = await Promise.all([
    prisma.user.count({ where: { OR: [{ coins: { lt: 0 } }, { xp: { lt: 0 } }] } }),
    prisma.studySession.count({ where: { endTime: null, startTime: { lt: staleCutoff } } }),
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
    staleSessions,
    duplicateOpenSessions: Number(duplicateOpenRows[0]?.count ?? 0),
    rewardMismatches: Number(rewardMismatches[0]?.count ?? 0),
    notificationAttemptsLastHour: Object.fromEntries(notificationAttempts.map((row) => [row.status, row._count._all])),
    otpAttemptsLastHour: otpAttempts.map((row) => ({ action: row.action, status: row.status, count: row._count._all })),
  };

  const violationCount = result.negativeBalances + result.staleSessions + result.duplicateOpenSessions + result.rewardMismatches;
  if (violationCount > 0) {
    captureCaughtError("business_invariants.violation", new Error("Business invariant violation"), {
      negativeBalances: result.negativeBalances,
      staleSessions: result.staleSessions,
      duplicateOpenSessions: result.duplicateOpenSessions,
      rewardMismatches: result.rewardMismatches,
    });
  } else {
    logOperationalEvent("business_invariants.ok");
  }
  return result;
}
