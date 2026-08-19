import { prisma } from "@/lib/db";

export const SETTING_KEYS = {
  VIDEO_UNLOCK_MODE: "video_unlock_mode",
} as const;

export type VideoUnlockMode = "all" | "daily";

export async function getAppSetting(key: string, defaultValue = ""): Promise<string> {
  const setting = await prisma.appSetting.findUnique({
    where: { key },
  });
  return setting?.value ?? defaultValue;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getVideoUnlockMode(): Promise<VideoUnlockMode> {
  const value = await getAppSetting(SETTING_KEYS.VIDEO_UNLOCK_MODE, "all");
  return value === "daily" ? "daily" : "all";
}

export async function setVideoUnlockMode(mode: VideoUnlockMode): Promise<void> {
  await setAppSetting(SETTING_KEYS.VIDEO_UNLOCK_MODE, mode);
}
