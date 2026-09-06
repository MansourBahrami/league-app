import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { getOnboardingState } from "@/lib/onboarding";
import { getActiveFocusCount } from "@/lib/focus";
import { getFocusPulseActivities } from "@/lib/focus-pulse";
import { getActiveStudySessionSnapshot } from "@/lib/study-session";
import { getAppUserSnapshot, preloadAppUserSnapshot } from "@/lib/app-user";
import { getDashboardMission, type FocusMission } from "@/lib/dashboard-mission";
import StudyTimer from "@/components/dashboard/StudyTimer";
import FocusPulse from "@/components/dashboard/FocusPulse";

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
  const [user, initialActiveSession] = await Promise.all([
    getAppUserSnapshot(userId),
    getActiveStudySessionSnapshot(userId),
  ]);
  if (!user) redirect("/login");

  const inOnboarding = user.onboardingDay < 1;
  const onboarding = inOnboarding
    ? await getOnboardingState(userId, user)
    : null;

  let mission: FocusMission;
  if (inOnboarding && onboarding) {
    mission = {
      kind: "onboarding",
      dailyGoalMin: onboarding.goalMinutes,
      dailyStudiedMin: onboarding.stepMinutes,
    };
  } else {
    mission = await getDashboardMission(userId);
  }

  return (
    <div data-tour="mission">
      <StudyTimer
        mission={mission}
        userId={userId}
        hasPhone={!!user.phone}
        initialActiveSession={initialActiveSession}
      />
    </div>
  );
}

async function DashboardPulse() {
  const [activities, activeFocusCount] = await Promise.all([
    getFocusPulseActivities(),
    getActiveFocusCount(),
  ]);

  return <FocusPulse initialActivities={activities} initialActiveCount={activeFocusCount} />;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  preloadAppUserSnapshot(session.userId);

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
