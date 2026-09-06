import "server-only";

import { cache } from "react";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { logSlowServerOperation } from "@/lib/server-timing";

/**
 * Snapshot مشترک پوسته و داشبورد.
 *
 * React.cache فقط در طول همان render درخواست را dedupe می‌کند؛ بنابراین دادهٔ
 * شخصی بین کاربران یا بین درخواست‌ها cache نمی‌شود و router.refresh() همیشه
 * snapshot تازه می‌گیرد.
 */
const appUserSelect = {
  id: true,
  phone: true,
  telegramId: true,
  baleId: true,
  name: true,
  grade: true,
  field: true,
  avatarUrl: true,
  xp: true,
  coins: true,
  level: true,
  stars: true,
  onboardingDay: true,
  onboardingStepMinutes: true,
  onboardingHints: true,
  pastAvgStudyHours: true,
  day1GoalMinutes: true,
  lastStudyDate: true,
  streak: true,
  videoAccess: true,
  isLeadComplete: true,
  hasCompletedStudySession: true,
  unreadInboxCount: true,
  role: true,
  profilePublic: true,
  activityPublic: true,
  createdAt: true,
  setupPromptSnoozedAt: true,
  messengerPromptDismissedAt: true,
} satisfies Prisma.UserSelect;

export type AppUserSnapshot = Prisma.UserGetPayload<{
  select: typeof appUserSelect;
}>;

export const getAppUserSnapshot = cache(async function getAppUserSnapshot(
  userId: string,
): Promise<AppUserSnapshot | null> {
  const startedAt = performance.now();
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: appUserSelect,
    });
  } finally {
    logSlowServerOperation("app_user_snapshot", startedAt, 250);
  }
});

export function preloadAppUserSnapshot(userId: string): void {
  void getAppUserSnapshot(userId);
}
