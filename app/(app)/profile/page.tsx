import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import StatsGrid from "@/components/profile/StatsGrid";
import MedalsSection from "@/components/profile/MedalsSection";
import ProfileActions from "@/components/profile/ProfileActions";
import { getNextLevelRequirement, effectiveStreak, formatStudyMinutes, xpToStudyMinutes, LEVEL_TABLE } from "@/lib/gamification";
import { getUserMedalCounts } from "@/lib/mission";
import NotificationToggle from "@/components/push/NotificationToggle";
import AvatarPicker from "@/components/profile/AvatarPicker";
import LevelInfoButton from "@/components/profile/LevelInfoButton";
import MessengerConnections from "@/components/profile/MessengerConnections";
import StudyReportCard from "@/components/dashboard/StudyReportCard";
import LogoutButton from "@/components/profile/LogoutButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, totalStudyAgg, userMedals, totalUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, avatarUrl: true, xp: true, coins: true, level: true, stars: true, phone: true, grade: true, field: true, role: true, streak: true, lastStudyDate: true, telegramId: true, baleId: true },
    }),
    prisma.studySession.aggregate({
      where: { userId: session.userId },
      _sum: { durationMin: true },
    }),
    prisma.userMedal.findMany({
      where: { userId: session.userId },
      include: { medal: true },
      orderBy: { earnedAt: "desc" },
    }),
    prisma.user.count(),
  ]);

  if (!user) redirect("/login");

  const userRank = await prisma.user.count({ where: { xp: { gt: user.xp } } });
  const totalHours = Math.floor((totalStudyAgg._sum.durationMin ?? 0) / 60);
  const streak = effectiveStreak(user.streak, user.lastStudyDate);

  // پیشرفت تا سطح بعدی بر اساس جدول مرکزی (XP + شرط مدال)
  const medalCounts = await getUserMedalCounts(session.userId);
  const nextReq = getNextLevelRequirement(user.xp, medalCounts);
  const xpToNext = nextReq?.xpNeeded ?? 0;
  const levelProgress = nextReq && nextReq.xpNeeded > 0
    ? Math.min(100, Math.round((user.xp / (user.xp + nextReq.xpNeeded)) * 100))
    : 100;

  // جدول سطح‌ها برای پاپ‌آپ راهنما (به آبجکت ساده‌ی قابل‌سریال تبدیل می‌شود)
  const levelRows = LEVEL_TABLE.map((r) => ({
    level: r.level,
    stars: r.stars,
    minXp: r.minXp,
    maxXp: r.maxXp,
    requiredMedals: r.requiredMedals.map((g) => g.map((m) => ({ hours: m.hours, count: m.count }))),
  }));

  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      {/* Profile Header */}
      <section className="glass-card rounded-xl p-5 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-24 bg-gradient-to-b from-tertiary-fixed to-transparent opacity-50 z-0" />
        <div className="relative z-10 flex flex-col items-center w-full">
          <AvatarPicker currentUrl={user.avatarUrl} name={user.name} />
          <div className="mb-1 flex items-center gap-1">
            <h1 className="text-[20px] font-bold text-on-surface">{user.name ?? "نام وارد نشده"}</h1>
            <ProfileActions user={{ name: user.name, grade: user.grade, field: user.field }} />
          </div>
          <p className="text-[14px] text-on-surface-variant mb-1">
            {[user.grade, user.field].filter(Boolean).join(" • ") || user.phone}
          </p>
          <div className="mb-1 flex items-center">
            <LevelInfoButton
              levels={levelRows}
              currentLevel={user.level}
              currentStars={user.stars}
              nextLevel={nextReq ? {
                level: nextReq.level,
                stars: nextReq.stars,
                studyNeeded: xpToNext > 0 ? formatStudyMinutes(xpToStudyMinutes(xpToNext)) : null,
                missingMedals: nextReq.missingMedals,
              } : null}
            />
          </div>
          {/* Level progress bar */}
          <div className="w-full flex flex-col gap-2 mt-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-[13px] font-semibold text-primary">{user.xp.toLocaleString("fa-IR")} XP</span>
              {nextReq ? (
                <span className="text-[13px] text-on-surface-variant">
                  تا {nextReq.level} ({nextReq.stars.toLocaleString("fa-IR")} ستاره): {xpToNext > 0 ? `${formatStudyMinutes(xpToStudyMinutes(xpToNext))} مطالعه` : "آماده ارتقا"}
                </span>
              ) : (
                <span className="text-[13px] text-tertiary font-bold">بالاترین سطح! 🏆</span>
              )}
            </div>
            <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-l from-primary to-primary-container rounded-full transition-all" style={{ width: `${levelProgress}%` }} />
            </div>
            {/* شرط مدال سطح بعدی */}
            {nextReq && nextReq.missingMedals.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span className="material-symbols-outlined text-[14px] text-tertiary">workspace_premium</span>
                <span className="text-[12px] text-on-surface-variant">مدال‌های لازم:</span>
                {nextReq.missingMedals.map((m) => (
                  <span key={m.hours} className="text-[11px] font-bold text-tertiary bg-tertiary-fixed/40 px-2 py-0.5 rounded-full">
                    {m.count.toLocaleString("fa-IR")}× مدال {m.hours.toLocaleString("fa-IR")} ساعته
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* خلاصه‌ی سریع پیش از جزئیات نمودار */}
      <StatsGrid totalHours={totalHours} streak={streak} rank={userRank + 1} totalUsers={totalUsers} />

      {/* روند مطالعه، مهم‌ترین داده‌ی عملکردی پروفایل */}
      <StudyReportCard userId={session.userId} />

      {/* دستاوردها پیش از تنظیمات */}
      <MedalsSection medals={userMedals.map((um) => ({ id: um.id, name: um.medal.name, targetHours: um.medal.targetHours, earnedAt: um.earnedAt }))} />

      {/* تنظیمات و اتصال‌های حساب در انتهای صفحه */}
      <section className="flex flex-col gap-3" aria-labelledby="account-settings-title">
        <div className="flex items-center gap-2 px-1">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]" aria-hidden="true">settings</span>
          <h2 id="account-settings-title" className="text-[14px] font-bold text-on-surface">تنظیمات حساب</h2>
        </div>

        <NotificationToggle />

        <MessengerConnections
          connected={{ telegram: !!user.telegramId, bale: !!user.baleId }}
          available={{ telegram: !!process.env.TELEGRAM_BOT_USERNAME, bale: !!process.env.BALE_BOT_USERNAME }}
        />

        {/* Admin panel link (admins only) */}
        {user.role === "admin" && (
          <a href="/admin" className="glass-card rounded-xl p-4 flex items-center gap-3 border-r-4 border-r-tertiary-fixed-dim hover:bg-tertiary-fixed/30 transition-colors">
            <span className="material-symbols-outlined text-tertiary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
            <div className="text-right flex-1">
              <p className="text-[15px] font-bold text-on-surface">پنل مدیریت</p>
              <p className="text-[12px] text-on-surface-variant">مدیریت ویدیوها و محتوا</p>
            </div>
            <span className="material-symbols-outlined text-outline" style={{ transform: "scaleX(-1)" }}>chevron_left</span>
          </a>
        )}

        <LogoutButton />
      </section>
    </div>
  );
}
