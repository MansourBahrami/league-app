import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { getSession } from "@/lib/auth";
import { getOnboardingState } from "@/lib/onboarding";
import { getActiveFocusCount } from "@/lib/focus";
import { getFocusPulseActivities } from "@/lib/focus-pulse";
import { getActiveStudySessionSnapshot } from "@/lib/study-session";
import { getAppUserSnapshot, preloadAppUserSnapshot } from "@/lib/app-user";
import { getDashboardMission, type FocusMission } from "@/lib/dashboard-mission";
import StudyTimer from "@/components/dashboard/StudyTimer";
import StudyTimerFallback from "@/components/dashboard/StudyTimerFallback";
import FocusPulse from "@/components/dashboard/FocusPulse";

function FocusPulseFallback() {
  return (
    <div role="status" aria-label="در حال دریافت فعالیت‌های زنده" aria-busy="true" className="glass-card flex h-24 items-center gap-3 rounded-[20px] border border-outline-variant/20 px-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-container text-secondary">
        <span className="material-symbols-outlined text-[22px]">groups</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-on-surface">همین حالا در کمپ</p>
        <p className="mt-1 text-[11.5px] text-on-surface-variant">فعالیت‌های تازه در حال دریافت است…</p>
      </div>
    </div>
  );
}

async function DashboardStudy() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = session.userId;
  preloadAppUserSnapshot(userId);

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
  await connection();
  const [activities, activeFocusCount] = await Promise.all([
    getFocusPulseActivities(),
    getActiveFocusCount(),
  ]);

  return <FocusPulse initialActivities={activities} initialActiveCount={activeFocusCount} />;
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-3 px-4 pb-2">
      <Suspense fallback={<StudyTimerFallback />}>
        <DashboardStudy />
      </Suspense>
      <Suspense fallback={<FocusPulseFallback />}>
        <DashboardPulse />
      </Suspense>
    </div>
  );
}
