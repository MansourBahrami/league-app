import { prisma } from "@/lib/db";
import { mapWithConcurrency } from "@/lib/concurrency";
import { endStudySession } from "@/lib/study-session";
import { getOnboardingState, tryCompleteOnboardingDay } from "@/lib/onboarding";
import { tehranDayDiff } from "@/lib/date";
import { applyStreak } from "@/lib/streak";
import { processUserMissions, recalcUserLevel } from "@/lib/mission";
import { broadcastActivity } from "@/lib/feed-broadcast";
import { fireEvent } from "@/lib/notification-engine";
import { captureServerEvent } from "@/lib/analytics-server";
import { calcRewards } from "@/lib/gamification";

const HISTORICAL_GRACE_MS = 24 * 60 * 60 * 1000;

interface StaleStudySessionCandidate {
  id: string;
  userId: string;
  startTime: Date;
  plannedMin: number;
  pausedSec: number;
  pausedAt: Date | null;
  tickCount: number;
}

function settlementTimeFor(candidate: StaleStudySessionCandidate, now: Date) {
  if (candidate.pausedAt) {
    return candidate.pausedAt.getTime() <= now.getTime() - HISTORICAL_GRACE_MS
      ? candidate.pausedAt
      : null;
  }
  const expectedEnd = new Date(
    candidate.startTime.getTime()
    + (candidate.plannedMin * 60 + candidate.pausedSec) * 1000,
  );
  return expectedEnd <= now ? expectedEnd : null;
}

/** پیش‌نمایش read-only همان رکوردهایی که job واقعاً تسویه خواهد کرد. */
export async function previewExpiredStudySessions(
  now = new Date(),
  options: { userIds?: string[] } = {},
) {
  const candidates = await prisma.studySession.findMany({
    where: {
      endTime: null,
      startTime: { lte: new Date(now.getTime() - 30 * 60 * 1000) },
      ...(options.userIds ? { userId: { in: options.userIds } } : {}),
    },
    orderBy: { startTime: "asc" },
    take: 200,
    select: {
      id: true,
      userId: true,
      startTime: true,
      plannedMin: true,
      pausedSec: true,
      pausedAt: true,
      tickCount: true,
    },
  });

  const expired = candidates.flatMap((candidate) => {
    const settlementTime = settlementTimeFor(candidate, now);
    if (!settlementTime) return [];
    const effectiveMinutes = Math.max(0, Math.floor(
      (settlementTime.getTime() - candidate.startTime.getTime() - candidate.pausedSec * 1000) / 60_000,
    ));
    const durationMin = candidate.plannedMin > 0
      ? Math.min(effectiveMinutes, candidate.plannedMin)
      : effectiveMinutes;
    const rewards = calcRewards(durationMin);
    return [{
      ...candidate,
      settlementTime,
      durationMin,
      totalXp: rewards.xp,
      totalCoins: rewards.coins,
      outstandingXp: Math.max(0, rewards.xp - candidate.tickCount),
      outstandingCoins: Math.max(0, rewards.coins - candidate.tickCount),
    }];
  });

  return { candidates: candidates.length, expired };
}

/**
 * تایمرهای running که از مدت برنامه‌ریزی‌شده عبور کرده‌اند و تایمرهای paused
 * رهاشده باید حتی بدون بازگشت کلاینت تسویه شوند. قفل کاربر و endStudySession
 * پرداخت را idempotent می‌کنند.
 */
export async function settleExpiredStudySessions(
  now = new Date(),
  options: { userIds?: string[] } = {},
) {
  const preview = await previewExpiredStudySessions(now, options);
  const expired = preview.expired;

  let settled = 0;
  let historical = 0;
  await mapWithConcurrency(expired, 5, async (candidate) => {
    // برای سشن paused زمان پایان همان لحظه‌ی pause است؛ بنابراین زمان توقف
    // طول مطالعه را زیاد نمی‌کند. برای running سقف برنامه زمان پایان authoritative است.
    const settlementTime = candidate.settlementTime;
    const isHistorical = now.getTime() - settlementTime.getTime() > HISTORICAL_GRACE_MS;

    const [user, onboarding] = await Promise.all([
      prisma.user.findUnique({
        where: { id: candidate.userId },
        select: {
          name: true,
          avatarUrl: true,
          lastStudyDate: true,
          streak: true,
        },
      }),
      isHistorical ? null : getOnboardingState(candidate.userId),
    ]);
    if (!user) return;

    const inOnboarding = !isHistorical && (onboarding?.inOnboarding ?? false);
    const startsNewTehranDay = !user.lastStudyDate
      || tehranDayDiff(settlementTime, user.lastStudyDate) >= 1;
    const result = await endStudySession({
      userId: candidate.userId,
      sessionId: candidate.id,
      inOnboarding,
      startsNewTehranDay,
      now: settlementTime,
    });
    if (result.status !== "ended") return;

    settled += 1;
    if (isHistorical) historical += 1;

    if (result.durationMin > 0) {
      const activity = await prisma.activityLog.create({
        data: {
          userId: candidate.userId,
          type: "session_complete",
          metadata: {
            durationMin: result.durationMin,
            xp: result.totalXp,
            coins: result.totalCoins,
            autoSettled: true,
          },
          dedupeKey: `study-session-complete:${candidate.id}`,
          createdAt: settlementTime,
        },
      });
      if (!isHistorical) {
        broadcastActivity({ ...activity, user: { name: user.name, avatarUrl: user.avatarUrl } });
        await applyStreak(candidate.userId, settlementTime);
      }
    }

    if (inOnboarding) await tryCompleteOnboardingDay(candidate.userId);
    const historicalOptions = isHistorical
      ? { emitSideEffects: false, activityAt: settlementTime }
      : undefined;
    await processUserMissions(candidate.userId, historicalOptions);
    await recalcUserLevel(candidate.userId, historicalOptions);

    if (!isHistorical) {
      if (result.durationMin > 0) {
        await fireEvent("session_complete", candidate.userId, {
          durationMin: result.durationMin,
          xp: result.totalXp,
          coins: result.totalCoins,
        });
      }
      await captureServerEvent({
        distinctId: candidate.userId,
        event: result.durationMin > 0 ? "study_completed" : "study_discarded",
        properties: {
          planned_minutes: result.studySession.plannedMin,
          verified_minutes: result.durationMin,
          xp_earned: result.totalXp,
          coins_earned: result.totalCoins,
          auto_settled: true,
        },
        insertId: `study-completed:${candidate.id}`,
      });
    }
  });

  return { candidates: preview.candidates, expired: expired.length, settled, historical };
}
