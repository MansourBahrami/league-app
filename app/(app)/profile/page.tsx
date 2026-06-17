import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import StatsGrid from "@/components/profile/StatsGrid";
import MedalsSection from "@/components/profile/MedalsSection";
import ProfileActions from "@/components/profile/ProfileActions";
import { getNextLevelRequirement, effectiveStreak, formatStudyMinutes, xpToStudyMinutes } from "@/lib/gamification";
import { getUserMedalCounts } from "@/lib/mission";
import NotificationToggle from "@/components/push/NotificationToggle";
import StarBadge from "@/components/ui/StarBadge";
import AvatarPicker from "@/components/profile/AvatarPicker";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, totalStudyAgg, userMedals, totalUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, avatarUrl: true, xp: true, coins: true, level: true, stars: true, phone: true, grade: true, field: true, role: true, streak: true, lastStudyDate: true },
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

  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      {/* Profile Header */}
      <section className="glass-card rounded-xl p-6 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-24 bg-gradient-to-b from-primary-fixed to-transparent opacity-50 z-0" />
        <div className="relative z-10 flex flex-col items-center w-full">
          <AvatarPicker currentUrl={user.avatarUrl} name={user.name} />
          <h2 className="text-[24px] font-bold text-on-surface mb-1">{user.name ?? "نام وارد نشده"}</h2>
          <p className="text-[14px] text-on-surface-variant mb-1">
            {[user.grade, user.field].filter(Boolean).join(" • ") || user.phone}
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary-fixed text-primary px-3 py-1 rounded-full text-[13px] font-bold">
              {user.level} ـ {user.stars.toLocaleString("fa-IR")} ستاره
            </span>
            <StarBadge stars={user.stars} total={3} size={16} />
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 mb-4 text-tertiary">
              <span className="material-symbols-outlined text-[16px] streak-flame" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              <span className="text-[13px] font-bold">زنجیره {streak.toLocaleString("fa-IR")} روزه</span>
            </div>
          )}

          {/* Level progress bar */}
          <div className="w-full flex flex-col gap-2 mt-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[13px] font-semibold text-primary">{user.xp.toLocaleString("fa-IR")} XP</span>
              {nextReq ? (
                <span className="text-[13px] text-on-surface-variant">
                  تا {nextReq.level} ({nextReq.stars.toLocaleString("fa-IR")} ستاره): {xpToNext > 0 ? `${formatStudyMinutes(xpToStudyMinutes(xpToNext))} مطالعه` : "آماده ارتقا"}
                </span>
              ) : (
                <span className="text-[13px] text-secondary font-bold">بالاترین سطح! 🏆</span>
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

      {/* بازار ماموریت‌ها */}
      <a href="/missions" className="glass-card rounded-xl p-4 flex items-center gap-3 flex-row-reverse border-r-4 border-r-tertiary-fixed-dim hover:bg-tertiary-fixed/10 transition-colors">
        <span className="material-symbols-outlined text-tertiary text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
        <div className="text-right flex-1">
          <p className="text-[15px] font-bold text-on-surface">بازار ماموریت‌ها</p>
          <p className="text-[12px] text-on-surface-variant">ماموریت هفتگی انتخاب کن و جایزه بگیر</p>
        </div>
        <span className="material-symbols-outlined text-outline" style={{ transform: "scaleX(-1)" }}>chevron_left</span>
      </a>

      {/* Notifications */}
      <NotificationToggle />

      {/* Edit / Logout */}
      <ProfileActions user={{ name: user.name, grade: user.grade, field: user.field }} />

      {/* Admin panel link (admins only) */}
      {user.role === "admin" && (
        <a href="/admin" className="glass-card rounded-xl p-4 flex items-center gap-3 flex-row-reverse border-r-4 border-r-secondary hover:bg-secondary-container/30 transition-colors">
          <span className="material-symbols-outlined text-secondary text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          <div className="text-right flex-1">
            <p className="text-[15px] font-bold text-on-surface">پنل مدیریت</p>
            <p className="text-[12px] text-on-surface-variant">مدیریت ویدیوها و محتوا</p>
          </div>
          <span className="material-symbols-outlined text-outline" style={{ transform: "scaleX(-1)" }}>chevron_left</span>
        </a>
      )}

      {/* Stats */}
      <StatsGrid totalHours={totalHours} streak={streak} rank={userRank + 1} totalUsers={totalUsers} />

      {/* Medals */}
      <MedalsSection medals={userMedals.map((um) => ({ id: um.id, name: um.medal.name, targetHours: um.medal.targetHours, earnedAt: um.earnedAt }))} />
    </div>
  );
}
