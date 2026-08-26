import type { ActivityLog } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { calcLevel, type MedalCount, DAILY_MISSION_TABLE, MISSION_TABLE } from "@/lib/gamification";
import { broadcastActivity } from "@/lib/feed-broadcast";
import { fireEvent } from "@/lib/notification-engine";
import { withUserLock } from "@/lib/user-lock";
import { captureServerEvent } from "@/lib/analytics-server";

/** شمارش مدال‌های کاربر بر اساس ساعت هدف */
export async function getUserMedalCounts(userId: string): Promise<MedalCount[]> {
  const userMedals = await prisma.userMedal.findMany({
    where: { userId },
    include: { medal: true },
  });
  const map = new Map<number, number>();
  for (const um of userMedals) {
    map.set(um.medal.targetHours, (map.get(um.medal.targetHours) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([targetHours, count]) => ({ targetHours, count }));
}

/**
 * محاسبه مجدد سطح کاربر و ذخیره در صورت تغییر.
 * هنگام ارتقای سطح، رویداد level_up در فید ثبت می‌شود.
 */
export async function recalcUserLevel(
  userId: string,
  options: { emitSideEffects?: boolean; activityAt?: Date } = {},
): Promise<{ level: string; stars: number; leveledUp: boolean }> {
  const emitSideEffects = options.emitSideEffects ?? true;
  const result = await withUserLock(userId, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, stars: true, name: true, avatarUrl: true },
    });
    if (!user) return null;

    const userMedals = await tx.userMedal.findMany({
      where: { userId },
      include: { medal: true },
    });
    const medalMap = new Map<number, number>();
    for (const userMedal of userMedals) {
      medalMap.set(
        userMedal.medal.targetHours,
        (medalMap.get(userMedal.medal.targetHours) ?? 0) + 1,
      );
    }
    const medals = Array.from(medalMap.entries()).map(([targetHours, count]) => ({
      targetHours,
      count,
    }));
    const { level, stars } = calcLevel(user.xp, medals);
    const changed = level !== user.level || stars !== user.stars;
    const isUpgrade =
      changed && rankOf(level, stars) > rankOf(user.level, user.stars);

    if (changed) {
      await tx.user.update({ where: { id: userId }, data: { level, stars } });
    }
    const log = isUpgrade
      ? await tx.activityLog.create({
          data: {
            userId,
            type: "level_up",
            metadata: { level, stars },
            dedupeKey: `level-up:${userId}:${level}:${stars}`,
            ...(options.activityAt ? { createdAt: options.activityAt } : {}),
          },
        })
      : null;
    return { level, stars, isUpgrade, log, user };
  });

  if (!result) return { level: "تازه‌نفس", stars: 1, leveledUp: false };
  if (emitSideEffects && result.isUpgrade && result.log) {
    broadcastActivity({
      ...result.log,
      user: { name: result.user.name, avatarUrl: result.user.avatarUrl },
    });
    await fireEvent("level_up", userId, { level: result.level, stars: result.stars });
  }
  return { level: result.level, stars: result.stars, leveledUp: result.isUpgrade };
}

/** رتبه عددی یک سطح/ستاره برای مقایسه ارتقا/تنزل */
function rankOf(level: string, stars: number): number {
  const order = ["تازه‌نفس", "ثابت‌قدم", "پیشرو", "سرآمد", "الگو"];
  const idx = order.indexOf(level);
  return (idx < 0 ? 0 : idx) * 10 + stars;
}

/**
 * پردازش کامل ماموریت‌های یک کاربر:
 *  - فعال‌سازی ماموریت‌های pending که زمان فعال‌سازی‌شان رسیده
 *  - بررسی تکمیل ماموریت‌های active و اعطای جایزه (XP + سکه + مدال)
 *  - منقضی کردن ماموریت‌های active که مهلتشان گذشته (سکه سوخته است)
 * این تابع idempotent است و می‌تواند هربار صفحه/جلسه فراخوانی شود (lazy) یا در cron.
 */
export async function processUserMissions(
  userId: string,
  options: { emitSideEffects?: boolean; activityAt?: Date } = {},
): Promise<void> {
  const now = new Date();
  const emitSideEffects = options.emitSideEffects ?? true;

  const result = await withUserLock(userId, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { name: true, avatarUrl: true },
    });
    if (!user) return null;

    await tx.userMission.updateMany({
      where: { userId, status: "pending", activatesAt: { lte: now } },
      data: { status: "active" },
    });

    const activeMissions = await tx.userMission.findMany({
      where: { userId, status: "active" },
      include: { mission: true },
    });
    const medalEvents: Array<{
      log: ActivityLog;
      targetHours: number;
      medalName: string;
    }> = [];
    let needsLevelRecalc = false;
    const completedEvents: Array<{ id: string; kind: string; targetHours: number }> = [];
    const failedEvents: Array<{ id: string; kind: string; targetHours: number }> = [];

    for (const userMission of activeMissions) {
      const windowEnd = new Date(
        Math.min(now.getTime(), userMission.expiresAt.getTime()),
      );
      const aggregate = await tx.studySession.aggregate({
        where: {
          userId,
          startTime: { gte: userMission.activatesAt, lt: windowEnd },
        },
        _sum: { durationMin: true },
      });
      const studiedMin = aggregate._sum.durationMin ?? 0;
      const targetMin = userMission.mission.targetHours * 60;

      if (studiedMin >= targetMin) {
        const claimed = await tx.userMission.updateMany({
          where: { id: userMission.id, status: "active" },
          data: { status: "completed", completedAt: options.activityAt ?? now },
        });
        if (claimed.count !== 1) continue;
        completedEvents.push({
          id: userMission.id,
          kind: userMission.mission.kind,
          targetHours: userMission.mission.targetHours,
        });

        if (userMission.mission.kind === "daily") {
          await tx.user.update({
            where: { id: userId },
            data: { coins: { increment: userMission.mission.coinReward } },
          });
          continue;
        }

        await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: userMission.mission.xpReward } },
        });
        const medal = await tx.medal.findUnique({
          where: { targetHours: userMission.mission.targetHours },
        });
        if (medal) {
          await tx.userMedal.create({
            data: {
              userId,
              medalId: medal.id,
              sourceUserMissionId: userMission.id,
            },
          });
          const log = await tx.activityLog.create({
            data: {
              userId,
              type: "medal_earn",
              metadata: { targetHours: userMission.mission.targetHours },
              dedupeKey: `mission-medal:${userMission.id}`,
              ...(options.activityAt ? { createdAt: options.activityAt } : {}),
            },
          });
          medalEvents.push({
            log,
            targetHours: userMission.mission.targetHours,
            medalName: medal.name,
          });
        }
        needsLevelRecalc = true;
      } else if (userMission.expiresAt < now) {
        const failed = await tx.userMission.updateMany({
          where: { id: userMission.id, status: "active" },
          data: { status: "failed" },
        });
        if (failed.count === 1) {
          failedEvents.push({
            id: userMission.id,
            kind: userMission.mission.kind,
            targetHours: userMission.mission.targetHours,
          });
        }
      }
    }

    return { user, medalEvents, needsLevelRecalc, completedEvents, failedEvents };
  });

  if (!result) return;
  if (emitSideEffects) {
    for (const event of result.medalEvents) {
      broadcastActivity({ ...event.log, user: result.user });
      await fireEvent("medal_earn", userId, {
        targetHours: event.targetHours,
        medalName: event.medalName,
      });
    }
    await Promise.all([
      ...result.completedEvents.map((event) => captureServerEvent({
        distinctId: userId,
        event: "mission_completed",
        properties: { mission_kind: event.kind, target_hours: event.targetHours },
        insertId: `mission-completed:${event.id}`,
      })),
      ...result.failedEvents.map((event) => captureServerEvent({
        distinctId: userId,
        event: "mission_failed",
        properties: { mission_kind: event.kind, target_hours: event.targetHours },
        insertId: `mission-failed:${event.id}`,
      })),
    ]);
  }
  if (result.needsLevelRecalc) await recalcUserLevel(userId, options);
}

const MEDAL_HOURS = [20, 25, 30, 35, 40, 45, 50, 53, 56, 60, 63, 66, 70];

/**
 * اطمینان از وجود ماموریت‌ها و مدال‌های پیش‌فرض در دیتابیس (idempotent).
 * در صورتی که دیتابیس تازه ساخته شده باشد یا seed نشده باشد، داده‌های پیش‌فرض را ایجاد می‌کند.
 */
export async function ensureDefaultMissions(): Promise<void> {
  const [dailyCount, weeklyCount] = await Promise.all([
    prisma.mission.count({ where: { kind: "daily", isActive: true } }),
    prisma.mission.count({ where: { kind: "weekly", isActive: true } }),
  ]);

  if (dailyCount >= DAILY_MISSION_TABLE.length && weeklyCount >= MISSION_TABLE.length) {
    return;
  }

  for (const hours of MEDAL_HOURS) {
    await prisma.medal.upsert({
      where: { targetHours: hours },
      update: {},
      create: { name: `مدال ${hours} ساعته`, targetHours: hours },
    });
  }

  const medals = await prisma.medal.findMany();
  const medalMap = new Map(medals.map((m) => [m.targetHours, m.id]));

  for (const m of MISSION_TABLE) {
    const existing = await prisma.mission.findFirst({
      where: { kind: "weekly", targetHours: m.targetHours },
    });
    if (!existing) {
      await prisma.mission.create({
        data: {
          kind: "weekly",
          targetHours: m.targetHours,
          minAvgHours: m.minAvgHours,
          entryCost: m.entryCost,
          xpReward: m.xpReward,
          medalId: medalMap.get(m.targetHours) ?? null,
          description: `${m.targetHours} ساعت مطالعه در ۷ روز`,
        },
      });
    }
  }

  for (const m of DAILY_MISSION_TABLE) {
    const existing = await prisma.mission.findFirst({
      where: { kind: "daily", targetHours: m.targetHours },
    });
    if (!existing) {
      await prisma.mission.create({
        data: {
          kind: "daily",
          targetHours: m.targetHours,
          minAvgHours: 0,
          entryCost: m.entryCost,
          xpReward: 0,
          coinReward: m.coinReward,
          description: `${m.targetHours} ساعت مطالعه در یک روز`,
        },
      });
    }
  }
}
