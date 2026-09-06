import "server-only";

import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { captureCaughtError } from "@/lib/observability";
import { logSlowServerOperation } from "@/lib/server-timing";

export interface FocusPulseActivity {
  id: string;
  userId: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string | null; avatarUrl: string | null };
}

const PULSE_TYPES = ["session_complete", "medal_earn", "level_up", "streak"];
const CACHE_KEY = "gcamp:focus:pulse:v1";
const CACHE_TTL_MS = 10_000;

let memoryCache: { value: FocusPulseActivity[]; expiresAt: number } | null = null;

function hasUsefulMetadata(activity: FocusPulseActivity): boolean {
  const metadata = activity.metadata ?? {};
  if (activity.type === "session_complete") return Number(metadata.durationMin ?? 0) > 0;
  if (activity.type === "medal_earn") return Number(metadata.targetHours ?? 0) > 0;
  if (activity.type === "streak") return Number(metadata.streak ?? 0) > 0;
  if (activity.type === "level_up") return String(metadata.level ?? "").trim().length > 0;
  return false;
}

/** فعالیت عمومی کوتاه‌عمر و مشترک برای pulse داشبورد. */
export async function getFocusPulseActivities(
  now = Date.now(),
): Promise<FocusPulseActivity[]> {
  const startedAt = performance.now();
  try {
    if (memoryCache && memoryCache.expiresAt > now) return memoryCache.value;

    const shared = await redis.get(CACHE_KEY).catch((caught) => {
      captureCaughtError("focus_pulse.cache_read", caught);
      return null;
    });
    if (shared) {
      try {
        const parsed = JSON.parse(shared) as FocusPulseActivity[];
        if (Array.isArray(parsed)) {
          memoryCache = { value: parsed, expiresAt: now + CACHE_TTL_MS };
          return parsed;
        }
      } catch (caught) {
        captureCaughtError("focus_pulse.cache_parse", caught);
      }
    }

    const activities = await prisma.activityLog.findMany({
      where: {
        type: { in: PULSE_TYPES },
        user: { activityPublic: true },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true, avatarUrl: true } } },
    });

    const value = activities
      .map((activity) => ({
        id: activity.id,
        userId: activity.userId,
        type: activity.type,
        metadata: (activity.metadata ?? null) as Record<string, unknown> | null,
        createdAt: activity.createdAt.toISOString(),
        user: activity.user,
      }))
      .filter(hasUsefulMetadata)
      .slice(0, 15);

    memoryCache = { value, expiresAt: now + CACHE_TTL_MS };
    await redis.set(CACHE_KEY, JSON.stringify(value), "PX", CACHE_TTL_MS).catch((caught) => {
      captureCaughtError("focus_pulse.cache_write", caught);
    });
    return value;
  } finally {
    logSlowServerOperation("focus_pulse", startedAt, 200);
  }
}
