import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PROFILE_UNLOCK_COST, PROFILE_UNLOCK_HOURS, effectiveStreak } from "@/lib/gamification";
import { tehranDayStartDaysAgo, formatJalaliLong, tehranParts } from "@/lib/date";
import { formatDistanceToNow } from "date-fns";
import { faIR } from "date-fns/locale";
import MedalsSection from "@/components/profile/MedalsSection";
import StudyReportCard from "@/components/dashboard/StudyReportCard";
import LockedStudySection from "@/components/profile/LockedStudySection";
import PublicProfileStats from "@/components/profile/PublicProfileStats";
import StarBadge from "@/components/ui/StarBadge";
import { isBlockedBetween } from "@/lib/privacy";
import PublicProfileSafetyActions from "@/components/profile/PublicProfileSafetyActions";


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
        profilePublic: true,
      },
    }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { coins: true } }),
    prisma.userMedal.findMany({ where: { userId: id }, include: { medal: true }, orderBy: { earnedAt: "desc" } }),
    prisma.user.count(),
  ]);

  if (!target || !target.profilePublic || await isBlockedBetween(session.userId, id)) notFound();

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
      <Link href="/leaderboard" className="mt-2 flex w-fit items-center gap-1.5 text-on-surface-variant transition-colors hover:text-primary">
        <span className="material-symbols-outlined text-[19px]" style={{ transform: "scaleX(-1)" }} aria-hidden="true">arrow_back</span>
        <span className="text-[14px] font-semibold">بازگشت</span>
      </Link>

      {/* Header — همیشه قابل مشاهده: نام، آواتار، سطح، ستاره‌ها */}
      <section className="glass-card relative flex flex-col items-center overflow-hidden rounded-xl p-5">
        <div className="absolute top-0 right-0 w-full h-24 bg-gradient-to-b from-tertiary-fixed to-transparent opacity-50 z-0" />
        <div className="relative z-10 flex flex-col items-center w-full">
          <div
            className="mb-3 h-16 w-16 shrink-0 overflow-hidden rounded-full border-[3px] border-surface-container-lowest shadow-md"
            style={{ width: 64, height: 64, minWidth: 64, minHeight: 64, maxWidth: 64, maxHeight: 64 }}
          >
            {target.avatarUrl ? (
              <Image
                src={target.avatarUrl}
                width={64}
                height={64}
                unoptimized
                className="block h-full w-full object-cover"
                style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%" }}
                alt={target.name ?? ""}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-fixed text-[28px] font-extrabold text-primary">
                {target.name ? target.name[0] : "؟"}
              </div>
            )}
          </div>
          <h1 className="mb-1 text-[20px] font-bold text-on-surface">{target.name ?? "کاربر"}</h1>
          {(target.grade || target.field) && (
            <p className="mb-1 text-[13px] text-on-surface-variant">{[target.grade, target.field].filter(Boolean).join(" • ")}</p>
          )}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary-fixed px-3 py-1 text-[13px] font-bold text-primary">
              {target.level} ـ {target.stars.toLocaleString("fa-IR")} ستاره
            </span>
            <StarBadge stars={target.stars} total={3} size={16} />
          </div>
        </div>
      </section>

      {/* XP و سکه و رتبه — همیشه قابل مشاهده */}
      <PublicProfileStats xp={target.xp} coins={target.coins} rank={targetRank + 1} totalUsers={totalUsers} />

      {/* بخش مطالعه — قفل‌شونده با پرداخت */}
      {isUnlocked ? (
        <>
          <section className="glass-card flex items-center justify-between gap-3 rounded-xl p-3" aria-label="وضعیت دسترسی گزارش مطالعه">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">local_fire_department</span>
              </span>
              <div>
                <p className="text-[10px] text-on-surface-variant">زنجیره مطالعه</p>
                <p className="text-[14px] font-bold text-on-surface">{streak.toLocaleString("fa-IR")} روز</p>
              </div>
            </div>
            {unlock && (
              <div className="flex items-center gap-1.5 text-left text-[10px] font-semibold text-tertiary">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">lock_open</span>
                <span>تا {formatDistanceToNow(new Date(unlock.expiresAt), { locale: faIR })} دیگر</span>
              </div>
            )}
          </section>

          {/* مجموع و نمودار ۷ روز اخیر */}
          <StudyReportCard userId={id} maxDays={7} />

          {/* سشن‌های مطالعه‌ی ۷ روز اخیر — تک‌تکِ جلسه‌ها با تاریخ و ساعت شروع */}
          <section className="glass-card rounded-xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[19px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">history</span>
              <h2 className="text-[14px] font-bold text-on-surface">سشن‌های مطالعه ۷ روز اخیر</h2>
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
                    <div key={s.id} className="flex items-center justify-between rounded-lg bg-surface-container-lowest/60 p-3">
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
        <LockedStudySection
          targetUserId={id}
          cost={PROFILE_UNLOCK_COST}
          userCoins={viewer?.coins ?? 0}
          durationHours={PROFILE_UNLOCK_HOURS}
        />
      )}

      {/* Medals — همیشه قابل مشاهده */}
      <MedalsSection
        title="مدال‌ها"
        medals={userMedals.map((um) => ({ id: um.id, name: um.medal.name, targetHours: um.medal.targetHours, earnedAt: um.earnedAt }))}
      />
      <PublicProfileSafetyActions targetUserId={id} />
    </div>
  );
}
