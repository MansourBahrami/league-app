import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eligibleForTournament } from "@/lib/tournament";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("fa-IR", { month: "long", day: "numeric" });
}

export default async function TournamentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { level: true } });
  if (!me) redirect("/login");

  const now = new Date();
  const tournaments = await prisma.tournament.findMany({
    where: { isActive: true, endAt: { gte: now } },
    orderBy: { startAt: "asc" },
    include: {
      _count: { select: { participants: true } },
      participants: { where: { userId: session.userId }, select: { id: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4 px-5">
      <div className="text-center mt-2">
        <h1 className="text-[20px] font-extrabold text-primary">تورنومنت‌ها</h1>
        <p className="text-[13px] text-on-surface-variant mt-1">رقابت‌های ویژه با جایزه — جدا از لیگ هفتگی</p>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-10 text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-2 block">trophy</span>
          <p>الان تورنومنت فعالی نیست. منتظر رقابت بعدی باش!</p>
        </div>
      ) : (
        tournaments.map((t) => {
          const joined = t.participants.length > 0;
          const started = new Date(t.startAt) <= now;
          const eligible = eligibleForTournament(t.levels, me.level);
          return (
            <Link key={t.id} href={`/tournaments/${t.id}`}>
              <div className="glass-card rounded-xl p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="text-right flex-1">
                    <h2 className="text-[16px] font-bold text-on-surface">{t.name}</h2>
                    {t.description && <p className="text-[13px] text-on-surface-variant mt-0.5">{t.description}</p>}
                  </div>
                  <span className={`material-symbols-outlined text-[28px] ${started ? "text-tertiary" : "text-outline"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {started ? "local_fire_department" : "schedule"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <span className="text-[11px] font-bold text-primary bg-primary-fixed px-2 py-1 rounded-full">
                    {fmtDate(t.startAt)} تا {fmtDate(t.endAt)}
                  </span>
                  {t.prizeXp > 0 && <span className="text-[11px] font-bold text-primary bg-surface-container-high px-2 py-1 rounded-full">🏆 {t.prizeXp.toLocaleString("fa-IR")} XP</span>}
                  {t.prizeCoins > 0 && <span className="text-[11px] font-bold text-tertiary bg-tertiary-fixed/40 px-2 py-1 rounded-full">🪙 {t.prizeCoins.toLocaleString("fa-IR")} سکه</span>}
                  <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-1 rounded-full">{t._count.participants.toLocaleString("fa-IR")} شرکت‌کننده</span>
                </div>

                <div className="flex items-center justify-between">
                  {joined ? (
                    <span className="text-[13px] font-bold text-tertiary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      عضو شدی
                    </span>
                  ) : !eligible ? (
                    <span className="text-[13px] text-outline">ویژه‌ی سطح دیگری</span>
                  ) : (
                    <span className="text-[13px] font-bold text-primary">ورود: {t.entryCost.toLocaleString("fa-IR")} سکه ←</span>
                  )}
                  <span className="material-symbols-outlined text-outline" style={{ transform: "scaleX(-1)" }}>chevron_left</span>
                </div>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
