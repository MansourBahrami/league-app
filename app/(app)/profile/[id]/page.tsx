import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PROFILE_UNLOCK_COST, effectiveStreak } from "@/lib/gamification";
import { tehranDayStartDaysAgo, formatJalaliLong, tehranParts } from "@/lib/date";
import { formatDistanceToNow } from "date-fns";
import { faIR } from "date-fns/locale";
import MedalsSection from "@/components/profile/MedalsSection";
import StudyReportCard from "@/components/dashboard/StudyReportCard";
import LockedStudySection from "@/components/profile/LockedStudySection";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  // پروفایل خودِ کاربر → به صفحه پروفایل اصلی برود
  if (id === session.userId) redirect("/profile");

  const [target, viewer, userMedals, totalUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, avatarUrl: true, xp: true, level: true, stars: true,
        grade: true, field: true, coins: true, streak: true, lastStudyDate: true,
      },
    }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { coins: true } }),
    prisma.userMedal.findMany({ where: { userId: id }, include: { medal: true }, orderBy: { earnedAt: "desc" } }),
    prisma.user.count(),
  ]);

  if (!target) notFound();

  const targetRank = await prisma.user.count({ where: { xp: { gt: target.xp } } });

  // بررسی قفل بخش مطالعه
  const unlock = await prisma.profileUnlock.findUnique({
    where: { viewerId_targetUserId: { viewerId: session.userId, targetUserId: id } },
  });
  const isUnlocked = !!unlock && unlock.expiresAt > new Date();

  // داده‌های مطالعه فقط در صورت آنلاک واکشی می‌شوند (جلوگیری از نشت اطلاعات)
  const streak = isUnlocked ? effectiveStreak(target.streak, target.lastStudyDate) : 0;
  // سشن‌های مطالعه‌ی ۷ روز اخیر (به وقت تهران) — تک‌تکِ جلسه‌ها، نه جمعِ روزانه
  const studyLog = isUnlocked
    ? await prisma.studySession.findMany({
        where: { userId: id, endTime: { not: null }, startTime: { gte: tehranDayStartDaysAgo(6) } },
        orderBy: { startTime: "desc" },
        select: { id: true, startTime: true, durationMin: true },
      })
    : [];

  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      {/* Back */}
      <Link href="/leaderboard" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mt-2">
        <span className="material-symbols-outlined" style={{ transform: "scaleX(-1)" }}>arrow_back</span>
        <span className="text-[14px] font-semibold">بازگشت</span>
      </Link>

      {/* Header — همیشه قابل مشاهده: نام، آواتار، سطح، ستاره‌ها */}
      <section className="glass-card rounded-xl p-6 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-24 bg-gradient-to-b from-tertiary-fixed to-transparent opacity-50 z-0" />
        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg mb-4 overflow-hidden">
            {target.avatarUrl ? (
              <img src={target.avatarUrl} className="w-full h-full object-cover" alt={target.name ?? ""} />
            ) : (
              <div className="w-full h-full bg-primary-fixed flex items-center justify-center text-[36px] font-extrabold text-primary">
                {target.name ? target.name[0] : "؟"}
              </div>
            )}
          </div>
          <h2 className="text-[20px] font-bold text-on-surface mb-1">{target.name ?? "کاربر"}</h2>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary-fixed text-primary px-3 py-1 rounded-full text-[13px] font-bold">{target.level}</span>
            {Array.from({ length: target.stars }).map((_, i) => (
              <span key={i} className="material-symbols-outlined text-tertiary-fixed-dim text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            ))}
          </div>
          {(target.grade || target.field) && (
            <p className="text-[13px] text-on-surface-variant">{[target.grade, target.field].filter(Boolean).join(" • ")}</p>
          )}
        </div>
      </section>

      {/* XP و سکه و رتبه — همیشه قابل مشاهده */}
      <section className="grid grid-cols-2 gap-2">
        <div className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          </div>
          <h3 className="text-[14px] font-semibold text-on-surface-variant">امتیاز (XP)</h3>
          <p className="text-[18px] font-bold text-on-surface">{target.xp.toLocaleString("fa-IR")}</p>
        </div>
        <div className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-tertiary-container/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-tertiary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>paid</span>
          </div>
          <h3 className="text-[14px] font-semibold text-on-surface-variant">سکه</h3>
          <p className="text-[18px] font-bold text-on-surface">{target.coins.toLocaleString("fa-IR")}</p>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 col-span-2">
          <span className="material-symbols-outlined text-tertiary text-4xl">emoji_events</span>
          <div className="text-right">
            <h3 className="text-[14px] font-semibold text-on-surface-variant">رتبه در جدول برتر</h3>
            <p className="text-[18px] font-bold text-on-surface">جایگاه {(targetRank + 1).toLocaleString("fa-IR")} از {totalUsers.toLocaleString("fa-IR")}</p>
          </div>
        </div>
      </section>

      {/* بخش مطالعه — قفل‌شونده با پرداخت */}
      {isUnlocked ? (
        <>
          {unlock && (
            <p className="text-[12px] text-tertiary text-center font-semibold">
              بخش مطالعه باز است — اعتبار تا {formatDistanceToNow(new Date(unlock.expiresAt), { locale: faIR })} دیگر
            </p>
          )}

          {/* زنجیره مطالعه */}
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-tertiary-container/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-tertiary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </div>
            <div className="text-right">
              <h3 className="text-[14px] font-semibold text-on-surface-variant">زنجیره مطالعه</h3>
              <p className="text-[18px] font-bold text-on-surface">{streak.toLocaleString("fa-IR")} <span className="text-[13px] font-normal">روز</span></p>
            </div>
          </div>

          {/* مجموع و نمودار ۷ روز اخیر */}
          <StudyReportCard userId={id} maxDays={7} />

          {/* سشن‌های مطالعه‌ی ۷ روز اخیر — تک‌تکِ جلسه‌ها با تاریخ و ساعت شروع */}
          <section className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
              <h3 className="text-[16px] font-bold text-on-surface">سشن‌های مطالعه ۷ روز اخیر</h3>
            </div>
            {studyLog.length === 0 ? (
              <p className="text-[14px] text-on-surface-variant text-center py-4">در ۷ روز اخیر جلسه‌ای ثبت نشده.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {studyLog.map((s) => {
                  const h = Math.floor(s.durationMin / 60);
                  const m = s.durationMin % 60;
                  const { hour, minute } = tehranParts(new Date(s.startTime));
                  const clock = `${hour}:${minute.toString().padStart(2, "0")}`.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
                  return (
                    <div key={s.id} className="flex justify-between items-center bg-white/60 rounded-lg p-3">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-on-surface">
                          {formatJalaliLong(new Date(s.startTime), true)}
                        </span>
                        <span className="text-[11px] text-outline">شروع ساعت {clock}</span>
                      </div>
                      <span className="text-[14px] font-bold text-primary">
                        {h > 0 ? `${h.toLocaleString("fa-IR")} ساعت ` : ""}{m > 0 ? `${m.toLocaleString("fa-IR")} دقیقه` : h > 0 ? "" : "۰ دقیقه"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <LockedStudySection targetUserId={id} cost={PROFILE_UNLOCK_COST} userCoins={viewer?.coins ?? 0} />
      )}

      {/* Medals — همیشه قابل مشاهده */}
      <MedalsSection medals={userMedals.map((um) => ({ id: um.id, name: um.medal.name, targetHours: um.medal.targetHours, earnedAt: um.earnedAt }))} />
    </div>
  );
}
