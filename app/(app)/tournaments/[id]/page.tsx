import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTournamentLeaderboard, eligibleForTournament } from "@/lib/tournament";
import JoinButton from "@/components/tournament/JoinButton";

export const dynamic = "force-dynamic";

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("fa-IR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function TournamentRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const [t, me] = await Promise.all([
    prisma.tournament.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { level: true, coins: true } }),
  ]);
  if (!t || !me) notFound();

  const now = new Date();
  const ended = new Date(t.endAt) < now;
  const started = new Date(t.startAt) <= now;

  const board = await getTournamentLeaderboard(id, session.userId);
  const joined = board.some((r) => r.isCurrentUser);
  const eligible = eligibleForTournament(t.levels, me.level);

  let disabledReason: string | undefined;
  if (joined) disabledReason = undefined;
  else if (ended) disabledReason = "این تورنومنت تمام شده";
  else if (!eligible) disabledReason = "این تورنومنت ویژه‌ی سطح دیگری است";
  else if (me.coins < t.entryCost) disabledReason = "سکه کافی نداری";

  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <Link href="/tournaments" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mt-2">
        <span className="material-symbols-outlined" style={{ transform: "scaleX(-1)" }}>arrow_back</span>
        <span className="text-[14px] font-semibold">بازگشت به تورنومنت‌ها</span>
      </Link>

      {/* Header */}
      <section className="glass-card rounded-xl p-5 text-center">
        <span className="material-symbols-outlined text-tertiary text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
        <h1 className="text-[22px] font-extrabold text-on-surface mt-1">{t.name}</h1>
        {t.description && <p className="text-[14px] text-on-surface-variant mt-1">{t.description}</p>}
        <div className="flex flex-wrap gap-2 justify-center mt-3">
          <span className="text-[12px] font-bold text-primary bg-primary-fixed px-3 py-1 rounded-full">
            {ended ? "پایان‌یافته" : started ? "در حال برگزاری" : "به‌زودی"}
          </span>
          {t.prizeXp > 0 && <span className="text-[12px] font-bold text-primary bg-surface-container-high px-3 py-1 rounded-full">🏆 {t.prizeXp.toLocaleString("fa-IR")} XP</span>}
          {t.prizeCoins > 0 && <span className="text-[12px] font-bold text-tertiary bg-tertiary-fixed/40 px-3 py-1 rounded-full">🪙 {t.prizeCoins.toLocaleString("fa-IR")} سکه</span>}
        </div>
        <p className="text-[12px] text-on-surface-variant/70 mt-3">
          {fmtDateTime(t.startAt)} — {fmtDateTime(t.endAt)}
        </p>
      </section>

      {/* Join */}
      {!ended && (
        <JoinButton tournamentId={t.id} entryCost={t.entryCost} disabled={joined || !!disabledReason} disabledReason={disabledReason} />
      )}

      {/* Leaderboard */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[16px] font-bold text-on-surface text-right mb-1">جدول رقابت (XP در بازه)</h2>
        {board.length === 0 ? (
          <p className="text-center text-on-surface-variant py-6 text-[14px]">هنوز کسی شرکت نکرده. اولین نفر باش!</p>
        ) : (
          board.map((r) => (
            <Link
              key={r.userId}
              href={`/profile/${r.userId}`}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                r.isCurrentUser ? "bg-primary-fixed border-2 border-primary/40" : "bg-surface-container-lowest border-outline-variant/30"
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0 ${
                r.rank === 1 ? "bg-tertiary-fixed-dim text-on-tertiary-fixed" : "bg-surface-container-high text-primary"
              }`}>
                {r.rank.toLocaleString("fa-IR")}
              </span>
              {r.avatarUrl ? (
                <img src={r.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt={r.name} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-[16px] font-bold text-primary">{r.name[0]}</div>
              )}
              <span className={`flex-1 text-[15px] font-bold text-right ${r.isCurrentUser ? "text-primary" : "text-on-surface"}`}>
                {r.isCurrentUser ? "تو" : r.name}
              </span>
              <span className="text-[14px] font-bold text-tertiary">{r.score.toLocaleString("fa-IR")} XP</span>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
