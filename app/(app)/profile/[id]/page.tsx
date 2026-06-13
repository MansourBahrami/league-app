import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PROFILE_UNLOCK_COST } from "@/lib/gamification";
import { formatDistanceToNow } from "date-fns";
import { faIR } from "date-fns/locale";
import StatsGrid from "@/components/profile/StatsGrid";
import MedalsSection from "@/components/profile/MedalsSection";
import UnlockLogButton from "@/components/profile/UnlockLogButton";

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

  const [target, viewer, totalAgg, userMedals, totalUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, avatarUrl: true, xp: true, level: true, stars: true, grade: true, field: true },
    }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { coins: true } }),
    prisma.studySession.aggregate({ where: { userId: id }, _sum: { durationMin: true } }),
    prisma.userMedal.findMany({ where: { userId: id }, include: { medal: true }, orderBy: { earnedAt: "desc" } }),
    prisma.user.count(),
  ]);

  if (!target) notFound();

  const targetRank = await prisma.user.count({ where: { xp: { gt: target.xp } } });
  const totalHours = Math.floor((totalAgg._sum.durationMin ?? 0) / 60);

  // بررسی قفل لاگ مطالعه
  const unlock = await prisma.profileUnlock.findUnique({
    where: { viewerId_targetUserId: { viewerId: session.userId, targetUserId: id } },
  });
  const isUnlocked = !!unlock && unlock.expiresAt > new Date();

  // لاگ مطالعه (فقط اگر باز شده)
  const studyLog = isUnlocked
    ? await prisma.studySession.findMany({
        where: { userId: id, endTime: { not: null } },
        orderBy: { startTime: "desc" },
        take: 20,
        select: { id: true, startTime: true, durationMin: true },
      })
    : [];

  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      {/* Back */}
      <Link href="/leaderboard" className="flex items-center gap-2 text-[#464554] hover:text-[#4648d4] transition-colors mt-2">
        <span className="material-symbols-outlined" style={{ transform: "scaleX(-1)" }}>arrow_back</span>
        <span className="text-[14px] font-semibold">بازگشت</span>
      </Link>

      {/* Header */}
      <section className="glass-card rounded-xl p-6 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-24 bg-gradient-to-b from-[#e1e0ff] to-transparent opacity-50 z-0" />
        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg mb-4 overflow-hidden">
            {target.avatarUrl ? (
              <img src={target.avatarUrl} className="w-full h-full object-cover" alt={target.name ?? ""} />
            ) : (
              <div className="w-full h-full bg-[#e1e0ff] flex items-center justify-center text-[36px] font-extrabold text-[#4648d4]">
                {target.name ? target.name[0] : "؟"}
              </div>
            )}
          </div>
          <h2 className="text-[24px] font-bold text-[#0b1c30] mb-1">{target.name ?? "کاربر"}</h2>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#e1e0ff] text-[#4648d4] px-3 py-1 rounded-full text-[13px] font-bold">{target.level}</span>
            {Array.from({ length: target.stars }).map((_, i) => (
              <span key={i} className="material-symbols-outlined text-[#ffb95f] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            ))}
          </div>
          {(target.grade || target.field) && (
            <p className="text-[13px] text-[#464554]">{[target.grade, target.field].filter(Boolean).join(" • ")}</p>
          )}
        </div>
      </section>

      {/* Stats */}
      <StatsGrid totalHours={totalHours} streak={0} rank={targetRank + 1} totalUsers={totalUsers} />

      {/* Study log (locked/unlocked) */}
      {isUnlocked ? (
        <section className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4 flex-row-reverse">
            <span className="material-symbols-outlined text-[#006c49]" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
            <h3 className="text-[18px] font-bold text-[#0b1c30]">لاگ مطالعه اخیر</h3>
          </div>
          {studyLog.length === 0 ? (
            <p className="text-[14px] text-[#464554] text-center py-4">هنوز جلسه مطالعه‌ای ثبت نشده.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {studyLog.map((s) => {
                const h = Math.floor(s.durationMin / 60);
                const m = s.durationMin % 60;
                return (
                  <div key={s.id} className="flex justify-between items-center bg-white/60 rounded-lg p-3">
                    <span className="text-[13px] text-[#767586]">
                      {formatDistanceToNow(new Date(s.startTime), { addSuffix: true, locale: faIR })}
                    </span>
                    <span className="text-[14px] font-bold text-[#4648d4]">
                      {h > 0 ? `${h} ساعت ` : ""}{m > 0 ? `${m} دقیقه` : h > 0 ? "" : "۰ دقیقه"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <UnlockLogButton targetUserId={id} cost={PROFILE_UNLOCK_COST} userCoins={viewer?.coins ?? 0} />
      )}

      {/* Medals */}
      <MedalsSection medals={userMedals.map((um) => ({ id: um.id, name: um.medal.name, targetHours: um.medal.targetHours, earnedAt: um.earnedAt }))} />
    </div>
  );
}
