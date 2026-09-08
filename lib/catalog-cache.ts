import "server-only";

import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { captureCaughtError } from "@/lib/observability";

export interface MissionCatalogItem {
  id: string;
  kind: string;
  targetHours: number;
  minAvgHours: number;
  entryCost: number;
  xpReward: number;
  coinReward: number;
  medalId: string | null;
  description: string | null;
  isActive: boolean;
}

export interface VideoCatalogItem {
  id: string;
  title: string;
  day: number;
  durationMin: number;
  thumbnailUrl: string | null;
  grades: string[];
}

interface Catalogs {
  missions?: { value: MissionCatalogItem[]; expiresAt: number };
  videos?: { value: VideoCatalogItem[]; expiresAt: number };
}

const globalForCatalogs = globalThis as typeof globalThis & {
  gcampCatalogs?: Catalogs;
};
const memory = globalForCatalogs.gcampCatalogs ?? {};
globalForCatalogs.gcampCatalogs = memory;

const MISSION_KEY = "gcamp:catalog:missions:v1";
const VIDEO_KEY = "gcamp:catalog:videos:v2";
const MISSION_TTL_SECONDS = 300;
const VIDEO_TTL_SECONDS = 60;

async function readShared<T>(key: string): Promise<T | null> {
  const shared = await redis.get(key).catch((caught) => {
    captureCaughtError("catalog.cache_read", caught, { key });
    return null;
  });
  if (!shared) return null;
  try {
    return JSON.parse(shared) as T;
  } catch (caught) {
    captureCaughtError("catalog.cache_parse", caught, { key });
    return null;
  }
}

async function writeShared(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch((caught) => {
    captureCaughtError("catalog.cache_write", caught, { key });
  });
}

export async function getActiveMissionCatalog(): Promise<{
  daily: MissionCatalogItem[];
  weekly: MissionCatalogItem[];
}> {
  const now = Date.now();
  const local = memory.missions;
  let value = local && local.expiresAt > now ? local.value : null;

  if (!value) value = await readShared<MissionCatalogItem[]>(MISSION_KEY);
  if (!Array.isArray(value)) {
    value = await prisma.mission.findMany({
      where: { isActive: true },
      orderBy: [{ kind: "asc" }, { targetHours: "asc" }],
      select: {
        id: true,
        kind: true,
        targetHours: true,
        minAvgHours: true,
        entryCost: true,
        xpReward: true,
        coinReward: true,
        medalId: true,
        description: true,
        isActive: true,
      },
    });
    await writeShared(MISSION_KEY, value, MISSION_TTL_SECONDS);
  }
  memory.missions = { value, expiresAt: now + MISSION_TTL_SECONDS * 1000 };

  return {
    daily: value.filter((mission) => mission.kind === "daily"),
    weekly: value.filter((mission) => mission.kind === "weekly"),
  };
}

export async function getActiveVideoCatalogSnapshot(): Promise<VideoCatalogItem[]> {
  const now = Date.now();
  const local = memory.videos;
  let value = local && local.expiresAt > now ? local.value : null;

  if (!value) value = await readShared<VideoCatalogItem[]>(VIDEO_KEY);
  if (!Array.isArray(value)) {
    value = await prisma.video.findMany({
      where: { isActive: true, day: { gte: 1 } },
      orderBy: [{ sortOrder: "asc" }, { day: "asc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        day: true,
        durationMin: true,
        thumbnailUrl: true,
        grades: true,
      },
    });
    await writeShared(VIDEO_KEY, value, VIDEO_TTL_SECONDS);
  }
  memory.videos = { value, expiresAt: now + VIDEO_TTL_SECONDS * 1000 };

  return value;
}

export async function getActiveVideoCatalog(grade: string | null): Promise<VideoCatalogItem[]> {
  const value = await getActiveVideoCatalogSnapshot();
  return value.filter((video) => video.grades.length === 0 || (!!grade && video.grades.includes(grade)));
}

export async function invalidateVideoCatalog(): Promise<void> {
  delete memory.videos;
  await redis.del(VIDEO_KEY).catch((caught) => {
    captureCaughtError("catalog.cache_invalidate", caught, { key: VIDEO_KEY });
  });
}
