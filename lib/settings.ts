import { prisma } from "@/lib/db";
import { captureCaughtError } from "@/lib/observability";
import { redis } from "@/lib/redis";

export const SETTING_KEYS = {
  VIDEO_UNLOCK_MODE: "video_unlock_mode",
} as const;

export type VideoUnlockMode = "all" | "daily";

const SETTING_TTL_SECONDS = 60;
const MISSING_VALUE = "__gcamp_missing_setting__";
const settingMemory = new Map<string, { value: string | null; expiresAt: number }>();

function settingCacheKey(key: string): string {
  return `gcamp:settings:v1:${key}`;
}

export async function getAppSetting(key: string, defaultValue = ""): Promise<string> {
  try {
    if (!prisma.appSetting) return defaultValue;
    const now = Date.now();
    const local = settingMemory.get(key);
    if (local && local.expiresAt > now) return local.value ?? defaultValue;

    const cacheKey = settingCacheKey(key);
    const shared = await redis.get(cacheKey).catch(() => null);
    if (shared !== null) {
      const value = shared === MISSING_VALUE ? null : shared;
      settingMemory.set(key, { value, expiresAt: now + SETTING_TTL_SECONDS * 1000 });
      return value ?? defaultValue;
    }

    const setting = await prisma.appSetting.findUnique({
      where: { key },
    });
    const value = setting?.value ?? null;
    settingMemory.set(key, { value, expiresAt: now + SETTING_TTL_SECONDS * 1000 });
    await redis.set(cacheKey, value ?? MISSING_VALUE, "EX", SETTING_TTL_SECONDS).catch(() => undefined);
    return value ?? defaultValue;
  } catch (caught) {
    captureCaughtError("settings.get", caught, { key });
    return defaultValue;
  }
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  try {
    if (!prisma.appSetting) return;
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    settingMemory.set(key, { value, expiresAt: Date.now() + SETTING_TTL_SECONDS * 1000 });
    await redis.set(settingCacheKey(key), value, "EX", SETTING_TTL_SECONDS).catch(() => undefined);
  } catch (caught) {
    captureCaughtError("settings.set", caught, { key });
    throw caught;
  }
}

export async function getVideoUnlockMode(): Promise<VideoUnlockMode> {
  const value = await getAppSetting(SETTING_KEYS.VIDEO_UNLOCK_MODE, "all");
  return value === "daily" ? "daily" : "all";
}

export async function setVideoUnlockMode(mode: VideoUnlockMode): Promise<void> {
  await setAppSetting(SETTING_KEYS.VIDEO_UNLOCK_MODE, mode);
}
