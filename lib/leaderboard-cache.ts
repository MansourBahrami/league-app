import "server-only";

import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { captureCaughtError } from "@/lib/observability";
import { logSlowServerOperation } from "@/lib/server-timing";

interface WeeklyRow {
  userId: string;
  _sum: { xpEarned: number | null; durationMin: number | null };
}

interface LeaderboardUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  level: string;
}

export interface CachedLeaderboardData {
  weekly: WeeklyRow[];
  users: LeaderboardUser[];
}

const RESULT_TTL_SECONDS = 30;
const META_TTL_SECONDS = 60;
const memoryResults = new Map<string, { value: CachedLeaderboardData; expiresAt: number }>();
const memoryMeta = new Map<string, { value: boolean | number; expiresAt: number }>();

function resultKey(level: string, openLeague: boolean, since: Date): string {
  const pool = openLeague ? "open" : `level:${level}`;
  return `gcamp:leaderboard:v2:${pool}:${since.toISOString()}`;
}

/**
 * pool عمومی لیگ کوتاه‌عمر و بین کاربران مشترک است. ردیف خود viewer هیچ‌وقت از
 * cache خوانده نمی‌شود و همیشه تازه روی نتیجه merge می‌شود؛ بنابراین privacy و
 * نمایش فوری XP خود کاربر حفظ می‌شود.
 */
export async function getCachedMainLeaderboard(params: {
  userId: string;
  level: string;
  openLeague: boolean;
  since: Date;
  currentUser: LeaderboardUser;
}): Promise<CachedLeaderboardData> {
  const key = resultKey(params.level, params.openLeague, params.since);
  const now = Date.now();
  const ownAggregatePromise = prisma.studySession.aggregate({
    where: { userId: params.userId, startTime: { gte: params.since } },
    _sum: { xpEarned: true, durationMin: true },
  });

  const local = memoryResults.get(key);
  let publicData = local && local.expiresAt > now ? local.value : null;

  if (!publicData) {
    const shared = await redis.get(key).catch((caught) => {
      captureCaughtError("leaderboard.cache_read", caught);
      return null;
    });
    if (shared) {
      try {
        const value = JSON.parse(shared) as CachedLeaderboardData;
        if (Array.isArray(value.weekly) && Array.isArray(value.users)) {
          memoryResults.set(key, { value, expiresAt: now + RESULT_TTL_SECONDS * 1000 });
          publicData = value;
        }
      } catch (caught) {
        captureCaughtError("leaderboard.cache_parse", caught);
      }
    }
  }

  if (!publicData) {
    const startedAt = performance.now();
    const weekly = await prisma.studySession.groupBy({
      by: ["userId"],
      where: {
        startTime: { gte: params.since },
        user: {
          profilePublic: true,
          ...(params.openLeague ? {} : { level: params.level }),
        },
      },
      _sum: { xpEarned: true, durationMin: true },
      orderBy: { _sum: { xpEarned: "desc" } },
      take: 50,
    });
    const userIds = [...new Set(weekly.map((row) => row.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarUrl: true, level: true },
    });
    publicData = { weekly, users };
    memoryResults.set(key, { value: publicData, expiresAt: now + RESULT_TTL_SECONDS * 1000 });
    await redis.set(key, JSON.stringify(publicData), "EX", RESULT_TTL_SECONDS).catch((caught) => {
      captureCaughtError("leaderboard.cache_write", caught);
    });
    logSlowServerOperation("leaderboard_query", startedAt, 400);
  }

  const ownAggregate = await ownAggregatePromise;
  const ownRow: WeeklyRow = {
    userId: params.userId,
    _sum: {
      xpEarned: ownAggregate._sum.xpEarned ?? 0,
      durationMin: ownAggregate._sum.durationMin ?? 0,
    },
  };
  const weekly = publicData.weekly
    .filter((row) => row.userId !== params.userId)
    .concat(ownRow)
    .sort((a, b) => (b._sum.xpEarned ?? 0) - (a._sum.xpEarned ?? 0))
    .slice(0, 50);
  const users = publicData.users
    .filter((user) => user.id !== params.userId)
    .concat(params.currentUser);
  return { weekly, users };
}

export async function getCachedLevelCount(level: string): Promise<number> {
  const key = `gcamp:leaderboard:v1:level-count:${level}`;
  const now = Date.now();
  const local = memoryMeta.get(key);
  if (local && local.expiresAt > now) return Number(local.value);

  const shared = await redis.get(key).catch(() => null);
  if (shared !== null) {
    const value = Number(shared);
    if (Number.isFinite(value)) {
      memoryMeta.set(key, { value, expiresAt: now + META_TTL_SECONDS * 1000 });
      return value;
    }
  }

  const value = await prisma.user.count({ where: { level } });
  memoryMeta.set(key, { value, expiresAt: now + META_TTL_SECONDS * 1000 });
  await redis.set(key, String(value), "EX", META_TTL_SECONDS).catch(() => undefined);
  return value;
}

export async function getCachedHasActiveTournament(now = new Date()): Promise<boolean> {
  const key = "gcamp:leaderboard:v1:active-tournament";
  const nowMs = now.getTime();
  const local = memoryMeta.get(key);
  if (local && local.expiresAt > nowMs) return Boolean(local.value);

  const shared = await redis.get(key).catch(() => null);
  if (shared !== null) {
    const value = shared === "1";
    memoryMeta.set(key, { value, expiresAt: nowMs + RESULT_TTL_SECONDS * 1000 });
    return value;
  }

  const value = Boolean(await prisma.tournament.findFirst({
    where: { isActive: true, endAt: { gte: now } },
    select: { id: true },
  }));
  memoryMeta.set(key, { value, expiresAt: nowMs + RESULT_TTL_SECONDS * 1000 });
  await redis.set(key, value ? "1" : "0", "EX", RESULT_TTL_SECONDS).catch(() => undefined);
  return value;
}
