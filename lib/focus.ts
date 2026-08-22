import { prisma } from "@/lib/db";

export interface ActiveFocusUser {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  level: string;
  startedAt: string;
  plannedMin: number;
  pausedSec: number;
}

export interface ActiveFocusSnapshot {
  users: ActiveFocusUser[];
  updatedAt: string;
}

let cachedSnapshot: { data: ActiveFocusSnapshot; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5000; // 5 ثانیه کش سبک برای جلوگیری از هجوم درخواست‌های همزمان

/**
 * کاربرانی که همین حالا یک تایمرِ معتبر و در حال اجرا دارند.
 *
 * فقط بازبودن رکورد کافی نیست؛ ممکن است کاربر تب را بسته باشد و رکورد تا شروع
 * جلسه بعدی باز بماند. بنابراین بازه واقعی هر جلسه را با plannedMin می‌سنجیم.
 */
export async function getActiveFocusSnapshot(now = new Date(), forceRefresh = false): Promise<ActiveFocusSnapshot> {
  const nowMs = now.getTime();
  if (!forceRefresh && cachedSnapshot && cachedSnapshot.expiresAt > nowMs) {
    return cachedSnapshot.data;
  }

  const maxTimerStart = new Date(nowMs - 24 * 60 * 60 * 1000);
  const openSessions = await prisma.studySession.findMany({
    where: {
      endTime: null,
      pausedAt: null,
      startTime: { gte: maxTimerStart },
    },
    orderBy: { startTime: "asc" },
    select: {
      userId: true,
      startTime: true,
      plannedMin: true,
      pausedSec: true,
      user: { select: { name: true, avatarUrl: true, level: true } },
    },
  });

  const users = new Map<string, ActiveFocusUser>();
  for (const session of openSessions) {
    const plannedMin = session.plannedMin > 0 ? session.plannedMin : 120;
    const finishesAt = session.startTime.getTime() + plannedMin * 60 * 1000 + session.pausedSec * 1000;
    if (finishesAt <= nowMs || users.has(session.userId)) continue;

    users.set(session.userId, {
      userId: session.userId,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
      level: session.user.level,
      startedAt: session.startTime.toISOString(),
      plannedMin,
      pausedSec: session.pausedSec,
    });
  }

  const result: ActiveFocusSnapshot = { users: [...users.values()], updatedAt: now.toISOString() };
  cachedSnapshot = { data: result, expiresAt: nowMs + CACHE_TTL_MS };
  return result;
}

export async function getActiveFocusCount(now = new Date()): Promise<number> {
  const snapshot = await getActiveFocusSnapshot(now);
  return snapshot.users.length;
}

/** آیا کاربر یک تایمر معتبرِ باز دارد؛ شامل تایمر pause‌شده. */
export async function hasRunningStudyTimer(userId: string, now = new Date()): Promise<boolean> {
  const session = await prisma.studySession.findFirst({
    where: {
      userId,
      endTime: null,
      startTime: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { startTime: "desc" },
    select: { startTime: true, plannedMin: true, pausedSec: true, pausedAt: true },
  });
  if (!session) return false;
  if (session.pausedAt) return true;

  const plannedMin = session.plannedMin > 0 ? session.plannedMin : 120;
  const finishesAt = session.startTime.getTime() + plannedMin * 60 * 1000 + session.pausedSec * 1000;
  return finishesAt > now.getTime();
}
