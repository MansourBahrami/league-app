import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getLeaderboardMessage, effectiveStreak } from "@/lib/gamification";
import { getOnboardingState } from "@/lib/onboarding";
import StudyTimer from "@/components/dashboard/StudyTimer";
import MissionProgress from "@/components/dashboard/MissionProgress";
import CloseCompetitors from "@/components/dashboard/CloseCompetitors";
import OnboardingPath from "@/components/onboarding/OnboardingPath";

export const dynamic = "force-dynamic";

const LEVEL_LABELS: Record<string, string> = {
  "تازه‌نفس": "تازه‌نفس", "ثابت‌قدم": "ثابت‌قدم", "پیشرو": "پیشرو", "سرآمد": "سرآمد", "الگو": "الگو",
};

async function getDashboardData(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [user, todayAggregate] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true, level: true, onboardingDay: true, isLeadComplete: true,
        nextStudyTarget: true, streak: true, lastStudyDate: true,
      },
    }),
    prisma.studySession.aggregate({
      where: { userId, startTime: { gte: today } },
      _sum: { durationMin: true },
    }),
  ]);

  // رتبه بین هم‌سطح‌ها بر اساس XP هفت روز اخیر (هماهنگ با لیدربورد)
  const myLevel = user?.level ?? "تازه‌نفس";
  const sameLevel = await prisma.user.findMany({ where: { level: myLevel }, select: { id: true } });
  const ids = sameLevel.map((u) => u.id);
  const weekly = await prisma.studySession.groupBy({
    by: ["userId"],
    where: { userId: { in: ids }, startTime: { gte: sevenDaysAgo } },
    _sum: { xpEarned: true },
  });
  const myWeekly = weekly.find((w) => w.userId === userId)?._sum.xpEarned ?? 0;
  const ahead = weekly.filter((w) => (w._sum.xpEarned ?? 0) > myWeekly).length;

  const todayMinutes = todayAggregate._sum.durationMin ?? 0;
  const leaderboardMsg = getLeaderboardMessage(ahead + 1, sameLevel.length, LEVEL_LABELS[myLevel] ?? myLevel);

  return { todayMinutes, leaderboardMsg, user };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { todayMinutes, leaderboardMsg, user } = await getDashboardData(session.userId);
  const state = await getOnboardingState(session.userId);

  const inOnboarding = state?.inOnboarding ?? false;
  const isDay1 = (user?.onboardingDay ?? 0) === 0;
  const streak = effectiveStreak(user?.streak ?? 0, user?.lastStudyDate ?? null);

  const dailyGoalMinutes = state?.goalMinutes ?? 120;
  const progressMinutes = inOnboarding ? (state?.stepMinutes ?? 0) : todayMinutes;
  const progressPercent = Math.min(100, Math.round((progressMinutes / dailyGoalMinutes) * 100));

  return (
    <div className="flex flex-col gap-4 px-5">
      {/* Onboarding Path */}
      {inOnboarding && state && (
        <OnboardingPath currentDay={user?.onboardingDay ?? 0} totalDays={state.totalDays} />
      )}

      {/* Streak banner */}
      {streak > 0 && (
        <section className="glass-card rounded-xl p-4 flex items-center gap-3 flex-row-reverse border-r-4 border-r-tertiary-fixed-dim">
          <span className="material-symbols-outlined text-tertiary text-[28px] streak-flame" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          <div className="text-right flex-1">
            <p className="text-[13px] font-semibold text-tertiary">زنجیره مطالعه</p>
            <p className="text-[15px] font-bold text-on-surface">
              {streak.toLocaleString("fa-IR")} روز پیاپی! {streak >= 3 ? "نذار بسوزه 🔥" : "ادامه بده"}
            </p>
          </div>
        </section>
      )}

      {/* Next Study Reminder */}
      {user?.nextStudyTarget && new Date(user.nextStudyTarget) > new Date() && (
        <section className="glass-card rounded-xl p-4 flex items-center gap-3 flex-row-reverse border-r-4 border-r-primary">
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>alarm</span>
          <div className="text-right">
            <p className="text-[13px] font-semibold text-primary">یادآوری هدف فردا</p>
            <p className="text-[15px] font-bold text-on-surface">
              {new Date(user.nextStudyTarget).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })} — آماده‌ای؟
            </p>
          </div>
        </section>
      )}

      {/* Daily Mission Progress (دوبخشی: دقیقه + ویدیو) */}
      <MissionProgress
        progress={progressPercent}
        studiedMinutes={progressMinutes}
        goalMinutes={dailyGoalMinutes}
        isDay1={isDay1}
        video={inOnboarding && state?.video ? {
          id: state.video.id,
          title: state.video.title,
          unlocked: state.videoUnlocked,
          watched: state.videoWatched,
        } : null}
      />

      {/* Study Timer */}
      <StudyTimer userId={session.userId} isLeadComplete={user?.isLeadComplete ?? false} />

      {/* Mini Leaderboard Message */}
      <section className="glass-card rounded-xl p-6 border-r-4 border-r-tertiary-fixed-dim">
        <div className="flex items-start gap-4 flex-row-reverse">
          <div className="bg-tertiary-fixed/30 p-3 rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-tertiary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              trending_up
            </span>
          </div>
          <div className="text-right">
            <h3 className="text-[20px] font-bold text-on-surface mb-1">رده‌بندی لحظه‌ای</h3>
            <p className="text-[16px] text-on-surface-variant leading-relaxed">{leaderboardMsg}</p>
          </div>
        </div>
      </section>

      {/* Close Competitors */}
      <CloseCompetitors userId={session.userId} />
    </div>
  );
}
