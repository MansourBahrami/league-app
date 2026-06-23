import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { suggestMissions, formatStudyMinutes } from "@/lib/gamification";
import { processUserMissions } from "@/lib/mission";
import MissionCard from "@/components/missions/MissionCard";
import DailyMissionCard from "@/components/missions/DailyMissionCard";
import MissionTabs from "@/components/missions/MissionTabs";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // فعال‌سازی/تکمیل/انقضای ماموریت‌ها (lazy — تا زمان راه‌اندازی cron در فاز ۱۸)
  await processUserMissions(session.userId);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { coins: true, onboardingDay: true },
  });
  if (!user) redirect("/login");

  // میانگین ساعت مطالعه ۷ روز گذشته
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessions = await prisma.studySession.aggregate({
    where: { userId: session.userId, startTime: { gte: sevenDaysAgo } },
    _sum: { durationMin: true },
  });
  const avgHoursPerDay = ((sessions._sum.durationMin ?? 0) / 60) / 7;

  const suggested = suggestMissions(avgHoursPerDay);
  const missions = await prisma.mission.findMany({
    where: { kind: "weekly", targetHours: { in: suggested.map((s) => s.targetHours) }, isActive: true },
  });

  // ماموریت‌های روزانه (جایزه سکه)
  const dailyMissions = await prisma.mission.findMany({
    where: { kind: "daily", isActive: true },
    orderBy: { targetHours: "asc" },
  });

  const currentMission = await prisma.userMission.findFirst({
    where: { userId: session.userId, status: { in: ["active", "pending"] }, mission: { kind: "weekly" } },
    include: { mission: true },
  });

  // ماموریت روزانه‌ی فعالِ امروز + پیشرفت آن
  const activeDaily = await prisma.userMission.findFirst({
    where: { userId: session.userId, status: "active", mission: { kind: "daily" } },
    include: { mission: true },
  });
  let dailyStudiedMin = 0;
  if (activeDaily) {
    const agg = await prisma.studySession.aggregate({
      where: { userId: session.userId, startTime: { gte: activeDaily.activatesAt } },
      _sum: { durationMin: true },
    });
    dailyStudiedMin = agg._sum.durationMin ?? 0;
  }

  // پیشرفت ماموریت فعال: مجموع ساعت مطالعه از زمان فعال‌سازی
  let missionProgressHours = 0;
  if (currentMission?.status === "active") {
    const agg = await prisma.studySession.aggregate({
      where: { userId: session.userId, startTime: { gte: currentMission.activatesAt } },
      _sum: { durationMin: true },
    });
    missionProgressHours = Math.round(((agg._sum.durationMin ?? 0) / 60) * 10) / 10;
  }

  const isWeek1 = user.onboardingDay < 6;

  // ----- دسته‌ی روزانه -----
  const dailySection = (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-on-surface-variant -mt-1 mb-1 text-right">
        هدف یک‌روزه؛ هر روز یکی انتخاب کن و جایزه‌ی سکه بگیر.
      </p>

      {activeDaily && (
        <div className="glass-card rounded-xl p-4 border-r-4 border-r-secondary">
          {(() => {
            const goal = activeDaily.mission.targetHours * 60;
            const pct = Math.min(100, Math.round((dailyStudiedMin / goal) * 100));
            const done = dailyStudiedMin >= goal;
            return (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[15px] font-bold text-secondary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{done ? "check_circle" : "timer"}</span>
                    ماموریت امروز: {activeDaily.mission.targetHours.toLocaleString("fa-IR")} ساعت
                  </h3>
                  <span className="text-[12px] font-bold text-tertiary">جایزه: {activeDaily.mission.coinReward.toLocaleString("fa-IR")} سکه</span>
                </div>
                <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-gradient-to-l from-secondary to-secondary-fixed-dim rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[12px] text-on-surface-variant text-right">
                  {formatStudyMinutes(dailyStudiedMin)} از {formatStudyMinutes(goal)}
                  {done ? " · انجام شد! ✓" : ` · ${formatStudyMinutes(goal - dailyStudiedMin)} مونده`}
                </p>
              </>
            );
          })()}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dailyMissions.length === 0 ? (
          <p className="text-[#464554] text-center col-span-2 py-8">فعلاً ماموریت روزانه‌ای موجود نیست.</p>
        ) : (
          dailyMissions.map((m) => (
            <DailyMissionCard
              key={m.id}
              mission={m}
              userCoins={user.coins}
              isLocked={isWeek1}
              hasActiveDaily={!!activeDaily}
            />
          ))
        )}
      </div>
    </div>
  );

  // ----- دسته‌ی هفتگی -----
  const weeklySection = (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-on-surface-variant -mt-1 mb-1 text-right">
        هدف هفتگی؛ ساعت مطالعه‌ات به ۶ روز تقسیم می‌شه و در پایان مدال و XP می‌گیری.
      </p>

      {isWeek1 && (
        <div className="bg-[#e1e0ff] border border-[#4648d4]/30 rounded-xl p-4 text-center">
          <p className="text-[14px] text-[#4648d4] font-semibold">
            ماموریت‌های هفتگی از روز ششم باز می‌شوند. مسیر آنبوردینگ را کامل کن!
          </p>
        </div>
      )}

      {currentMission?.status === "pending" && (
        <div className="glass-card rounded-xl p-4 border-r-4 border-r-[#ffb95f]">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#825100] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            <h3 className="text-[16px] font-bold text-[#825100]">ماموریت در انتظار فعال‌سازی</h3>
          </div>
          <p className="text-[14px] text-[#0b1c30]">{currentMission.mission.targetHours} ساعت در ۷ روز</p>
          <p className="text-[12px] text-[#464554]">
            از فردا ({new Date(currentMission.activatesAt).toLocaleDateString("fa-IR")}) فعال می‌شود.
          </p>
        </div>
      )}

      {currentMission?.status === "active" && (
        <div className="glass-card rounded-xl p-4 border-r-4 border-r-[#006c49]">
          <h3 className="text-[16px] font-bold text-[#006c49] mb-2">ماموریت فعال</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[14px] text-[#0b1c30]">{currentMission.mission.targetHours} ساعت در ۷ روز</span>
            <span className="text-[13px] font-bold text-[#006c49]">
              {missionProgressHours.toLocaleString("fa-IR")} / {currentMission.mission.targetHours.toLocaleString("fa-IR")} ساعت
            </span>
          </div>
          <div className="h-2.5 w-full bg-[#e5eeff] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-l from-[#006c49] to-[#6cf8bb] rounded-full transition-all"
              style={{ width: `${Math.min(100, (missionProgressHours / currentMission.mission.targetHours) * 100)}%` }}
            />
          </div>
          <p className="text-[12px] text-[#464554]">
            مهلت تا: {new Date(currentMission.expiresAt).toLocaleDateString("fa-IR")} — جایزه: {currentMission.mission.xpReward.toLocaleString("fa-IR")} XP + مدال
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions.length === 0 ? (
          <p className="text-[#464554] text-center col-span-2 py-8">هنوز ماموریتی موجود نیست. بیشتر مطالعه کن!</p>
        ) : (
          missions.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              userCoins={user.coins}
              isLocked={isWeek1}
              hasActiveMission={!!currentMission}
              userId={session.userId}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col px-5">
      <section className="mb-6 mt-2 text-center">
        <h1 className="text-[26px] font-extrabold text-[#4648d4] mb-2">بازارچه ماموریت‌ها</h1>
        <p className="text-[18px] text-[#464554]">ماموریت بخر، درس بخون، جایزه بگیر!</p>
      </section>

      <MissionTabs
        daily={dailySection}
        weekly={weeklySection}
        dailyCount={dailyMissions.length}
        weeklyCount={missions.length}
        defaultTab="daily"
      />
    </div>
  );
}
