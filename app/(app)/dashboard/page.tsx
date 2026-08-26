import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOnboardingState } from "@/lib/onboarding";
import { getWeeklyMissionState } from "@/lib/weekly-mission";
import { getActiveFocusCount } from "@/lib/focus";
import StudyTimer, { type FocusMission } from "@/components/dashboard/StudyTimer";
import FocusPulse, { type FocusPulseActivity } from "@/components/dashboard/FocusPulse";

export const dynamic = "force-dynamic";

const PULSE_TYPES = ["session_complete", "medal_earn", "level_up", "streak"];

function hasUsefulPulseMetadata(activity: FocusPulseActivity): boolean {
  const metadata = activity.metadata ?? {};
  if (activity.type === "session_complete") return Number(metadata.durationMin ?? 0) > 0;
  if (activity.type === "medal_earn") return Number(metadata.targetHours ?? 0) > 0;
  if (activity.type === "streak") return Number(metadata.streak ?? 0) > 0;
  if (activity.type === "level_up") return String(metadata.level ?? "").trim().length > 0;
  return false;
}

async function getPulseActivities(userIds?: string[]): Promise<FocusPulseActivity[]> {
  const activities = await prisma.activityLog.findMany({
    where: {
      type: { in: PULSE_TYPES },
      user: { activityPublic: true },
      ...(userIds && userIds.length > 0 ? { userId: { in: userIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true, avatarUrl: true } } },
  });

  return activities
    .map((activity) => ({
      id: activity.id,
      userId: activity.userId,
      type: activity.type,
      metadata: (activity.metadata ?? null) as Record<string, unknown> | null,
      createdAt: activity.createdAt.toISOString(),
      user: activity.user,
    }))
    .filter(hasUsefulPulseMetadata)
    .slice(0, 15);
}

async function getActiveDailyMission(userId: string, now = new Date()) {
  const daily = await prisma.userMission.findFirst({
    where: {
      userId,
      status: "active",
      mission: { kind: "daily" },
      activatesAt: { lte: now },
      expiresAt: { gt: now },
    },
    include: { mission: true },
    orderBy: { activatesAt: "desc" },
  });
  if (!daily) return null;

  const aggregate = await prisma.studySession.aggregate({
    where: { userId, startTime: { gte: daily.activatesAt, lt: daily.expiresAt } },
    _sum: { durationMin: true },
  });

  return {
    goalMin: daily.mission.targetHours * 60,
    studiedMin: aggregate._sum.durationMin ?? 0,
    coinReward: daily.mission.coinReward,
  };
}

function StudyTimerFallback() {
  return (
    <div role="status" aria-label="در حال آماده‌سازی تایمر" className="h-[360px] rounded-[24px] border border-outline-variant/25 bg-surface-container-low/80 animate-pulse motion-reduce:animate-none" />
  );
}

function FocusPulseFallback() {
  return (
    <div role="status" aria-label="در حال دریافت فعالیت‌های زنده" className="h-24 rounded-[20px] border border-outline-variant/20 bg-surface-container-low/60 animate-pulse motion-reduce:animate-none" />
  );
}

async function DashboardStudy({ userId }: { userId: string }) {
  const [onboarding, user, activeDaily, weekly] = await Promise.all([
    getOnboardingState(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }),
    getActiveDailyMission(userId),
    getWeeklyMissionState(userId),
  ]);

  const inOnboarding = onboarding?.inOnboarding ?? false;

  let mission: FocusMission = null;
  if (inOnboarding && onboarding) {
    mission = {
      kind: "onboarding",
      dailyGoalMin: onboarding.goalMinutes,
      dailyStudiedMin: onboarding.stepMinutes,
    };
  } else if (activeDaily) {
    // ماموریت روزانه کوتاه‌مدت‌تر است؛ اگر روزانه و هفتگی هم‌زمان فعال باشند،
    // هدف فوری امروز در صفحه مطالعه اولویت دارد و جزئیات هفتگی در کمپ مأموریت می‌ماند.
    mission = {
      kind: "daily",
      dailyGoalMin: activeDaily.goalMin,
      dailyStudiedMin: activeDaily.studiedMin,
      coinReward: activeDaily.coinReward,
    };
  } else if (weekly) {
    mission = {
      kind: "weekly",
      pending: weekly.pending,
      isRestDay: weekly.isRestDay,
      targetHours: weekly.targetHours,
      dailyGoalMin: weekly.dailyGoalMin,
      dailyStudiedMin: weekly.dailyStudiedMin,
      weeklyGoalMin: weekly.weeklyGoalMin,
      weeklyStudiedMin: weekly.weeklyStudiedMin,
      xpReward: weekly.xpReward,
    };
  }

  return (
    <div data-tour="mission">
      <StudyTimer mission={mission} userId={userId} hasPhone={!!user?.phone} />
    </div>
  );
}

async function DashboardPulse() {
  const [activities, activeFocusCount] = await Promise.all([
    getPulseActivities(),
    getActiveFocusCount(),
  ]);

  return <FocusPulse initialActivities={activities} initialActiveCount={activeFocusCount} />;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col gap-3 px-4 pb-2">
      <Suspense fallback={<StudyTimerFallback />}>
        <DashboardStudy userId={session.userId} />
      </Suspense>
      <Suspense fallback={<FocusPulseFallback />}>
        <DashboardPulse />
      </Suspense>
    </div>
  );
}
