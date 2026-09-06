import "server-only";

import { prisma } from "@/lib/db";
import { tehranDayDiff, tehranDayStart } from "@/lib/date";
import { logSlowServerOperation } from "@/lib/server-timing";

export type FocusMission =
  | {
      kind: "onboarding" | "daily";
      dailyGoalMin: number;
      dailyStudiedMin: number;
      coinReward?: number;
    }
  | {
      kind: "weekly";
      pending: boolean;
      isRestDay: boolean;
      targetHours: number;
      dailyGoalMin: number;
      dailyStudiedMin: number;
      weeklyGoalMin: number;
      weeklyStudiedMin: number;
      xpReward: number;
    }
  | null;

/**
 * هدفی که کنار تایمر باید نمایش داده شود.
 *
 * روزانه بر هفتگی اولویت دارد؛ بنابراین هر دو نوع مأموریت در یک round-trip
 * خوانده می‌شوند و aggregate فقط برای مأموریتی اجرا می‌شود که واقعاً نمایش
 * داده خواهد شد.
 */
export async function getDashboardMission(
  userId: string,
  now = new Date(),
): Promise<FocusMission> {
  const startedAt = performance.now();
  try {
    const candidates = await prisma.userMission.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
        OR: [
          {
            status: "active",
            activatesAt: { lte: now },
            mission: { kind: "daily" },
          },
          {
            status: { in: ["active", "pending"] },
            mission: { kind: "weekly" },
          },
        ],
      },
      include: { mission: true },
      orderBy: { activatesAt: "desc" },
    });

    const daily = candidates.find((candidate) => candidate.mission.kind === "daily");
    if (daily) {
      const aggregate = await prisma.studySession.aggregate({
        where: {
          userId,
          startTime: { gte: daily.activatesAt, lt: daily.expiresAt },
        },
        _sum: { durationMin: true },
      });

      return {
        kind: "daily",
        dailyGoalMin: daily.mission.targetHours * 60,
        dailyStudiedMin: aggregate._sum.durationMin ?? 0,
        coinReward: daily.mission.coinReward,
      };
    }

    const weekly = candidates.find((candidate) => candidate.mission.kind === "weekly");
    if (!weekly) return null;

    const weeklyGoalMin = weekly.mission.targetHours * 60;
    if (weekly.status === "pending") {
      return {
        kind: "weekly",
        pending: true,
        isRestDay: false,
        targetHours: weekly.mission.targetHours,
        dailyGoalMin: Math.round(weeklyGoalMin / 6),
        dailyStudiedMin: 0,
        weeklyGoalMin,
        weeklyStudiedMin: 0,
        xpReward: weekly.mission.xpReward,
      };
    }

    const todayStart = tehranDayStart(now);
    const [weekAggregate, todayAggregate] = await Promise.all([
      prisma.studySession.aggregate({
        where: {
          userId,
          startTime: { gte: weekly.activatesAt, lt: weekly.expiresAt },
        },
        _sum: { durationMin: true },
      }),
      prisma.studySession.aggregate({
        where: {
          userId,
          startTime: { gte: todayStart, lt: weekly.expiresAt },
        },
        _sum: { durationMin: true },
      }),
    ]);

    const weeklyStudiedMin = weekAggregate._sum.durationMin ?? 0;
    const dailyStudiedMin = todayAggregate._sum.durationMin ?? 0;
    const studiedBeforeToday = Math.max(0, weeklyStudiedMin - dailyStudiedMin);
    const dayIndex = Math.min(
      7,
      Math.max(1, tehranDayDiff(now, weekly.activatesAt) + 1),
    );
    const dailyGoalMin = dayIndex >= 7
      ? Math.max(0, weeklyGoalMin - studiedBeforeToday)
      : Math.round(weeklyGoalMin / 6);

    return {
      kind: "weekly",
      pending: false,
      isRestDay: dayIndex >= 7 && dailyGoalMin === 0,
      targetHours: weekly.mission.targetHours,
      dailyGoalMin,
      dailyStudiedMin,
      weeklyGoalMin,
      weeklyStudiedMin,
      xpReward: weekly.mission.xpReward,
    };
  } finally {
    logSlowServerOperation("dashboard_mission", startedAt, 300);
  }
}
