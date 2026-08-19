import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOnboardingState } from "@/lib/onboarding";
import { processUserMissions } from "@/lib/mission";
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
      ...(userIds && userIds.length > 0 ? { userId: { in: userIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 40,
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
    .slice(0, 20);
}

async function getActiveDailyMission(userId: string) {
  const daily = await prisma.userMission.findFirst({
    where: { userId, status: "active", mission: { kind: "daily" } },
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

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const onboarding = await getOnboardingState(session.userId);
  const inOnboarding = onboarding?.inOnboarding ?? false;

  if (!inOnboarding) await processUserMissions(session.userId);

  const [user, activeDaily, weekly, activities, activeFocusCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { phone: true } }),
    inOnboarding ? Promise.resolve(null) : getActiveDailyMission(session.userId),
    inOnboarding ? Promise.resolve(null) : getWeeklyMissionState(session.userId),
    getPulseActivities(),
    getActiveFocusCount(),
  ]);

  let mission: FocusMission = null;
  if (inOnboarding && onboarding) {
    mission = {
      kind: "onboarding",
      dailyGoalMin: onboarding.goalMinutes,
      dailyStudiedMin: onboarding.stepMinutes,
    };
  } else if (activeDaily) {
    // ماموریت روزانه کوتاه‌مدت‌تر است؛ اگر روزانه و هفتگی هم‌زمان فعال باشند،
    // هدف فوری امروز در صفحه مطالعه اولویت دارد و جزئیات هفتگی در اتاق مأموریت می‌ماند.
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
    <div className="flex flex-col gap-3 px-4 pb-2">
      <div data-tour="mission">
        <StudyTimer mission={mission} userId={session.userId} hasPhone={!!user?.phone} />
      </div>
      <FocusPulse
        initialActivities={activities}
        initialActiveCount={activeFocusCount}
      />
    </div>
  );
}
