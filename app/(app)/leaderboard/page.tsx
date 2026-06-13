import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import Podium from "@/components/leaderboard/Podium";
import LeaderboardList from "@/components/leaderboard/LeaderboardList";
import InviteFriends from "@/components/social/InviteFriends";
import { ensureReferralCode, getFriendIds } from "@/lib/referral";

export const dynamic = "force-dynamic";

const MIN_LEAGUE_SIZE = 5; // زیر این تعداد هم‌سطح فعال → لیگ آزاد (حل cold start)

interface Entry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  level: string;
  weeklyXp: number;
  isCurrentUser: boolean;
}

function buildLeaderboard(
  weekly: { userId: string; _sum: { xpEarned: number | null } }[],
  userMap: Map<string, { name: string | null; avatarUrl: string | null; level: string }>,
  meId: string,
  meLevel: string
): Entry[] {
  const list: Entry[] = weekly.map((d, i) => {
    const u = userMap.get(d.userId);
    return {
      rank: i + 1,
      userId: d.userId,
      name: u?.name ?? "کاربر",
      avatarUrl: u?.avatarUrl ?? null,
      level: u?.level ?? meLevel,
      weeklyXp: d._sum.xpEarned ?? 0,
      isCurrentUser: d.userId === meId,
    };
  });
  if (!list.some((e) => e.isCurrentUser)) {
    const me = userMap.get(meId);
    list.push({
      rank: list.length + 1,
      userId: meId,
      name: me?.name ?? "تو",
      avatarUrl: me?.avatarUrl ?? null,
      level: me?.level ?? meLevel,
      weeklyXp: 0,
      isCurrentUser: true,
    });
  }
  return list;
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { tab } = await searchParams;
  const isFriends = tab === "friends";

  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { level: true } });
  if (!me) redirect("/login");

  const myLevel = me.level;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const referralCode = await ensureReferralCode(session.userId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // تعیین مجموعه‌ی رقبا بر اساس تب
  let poolIds: string[];
  let title: string;
  let subtitle: string;
  let freeLeague = false;

  if (isFriends) {
    const friendIds = await getFriendIds(session.userId);
    poolIds = [session.userId, ...friendIds];
    title = "لیدربورد دوستان";
    subtitle = `${friendIds.length.toLocaleString("fa-IR")} دوست · بر اساس XP هفت روز اخیر`;
  } else {
    const sameLevel = await prisma.user.findMany({ where: { level: myLevel }, select: { id: true } });
    // cold start: اگر هم‌سطح‌ها کم بودند، با همه رقابت کن (لیگ آزاد)
    if (sameLevel.length < MIN_LEAGUE_SIZE) {
      const all = await prisma.user.findMany({ select: { id: true } });
      poolIds = all.map((u) => u.id);
      freeLeague = true;
      title = "لیگ آزاد";
      subtitle = "هنوز هم‌سطح‌های کافی نیست — فعلاً با همه رقابت می‌کنی";
    } else {
      poolIds = sameLevel.map((u) => u.id);
      title = "لیدربورد هفتگی";
      subtitle = `${sameLevel.length.toLocaleString("fa-IR")} نفر هم‌سطح تو · بر اساس XP هفت روز اخیر`;
    }
  }

  const users = await prisma.user.findMany({
    where: { id: { in: poolIds } },
    select: { id: true, name: true, avatarUrl: true, level: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const weekly = await prisma.studySession.groupBy({
    by: ["userId"],
    where: { userId: { in: poolIds }, startTime: { gte: sevenDaysAgo } },
    _sum: { xpEarned: true },
    orderBy: { _sum: { xpEarned: "desc" } },
    take: 50,
  });

  const leaderboard = buildLeaderboard(weekly, userMap, session.userId, myLevel);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const currentUserEntry = leaderboard.find((e) => e.isCurrentUser);

  const tabCls = (active: boolean) =>
    `flex-1 py-2 rounded-xl text-[14px] font-bold transition-all ${
      active ? "bg-primary text-on-primary shadow-md" : "text-on-surface-variant hover:bg-surface-container"
    }`;

  return (
    <div className="flex flex-col gap-5 px-5">
      {/* Tabs */}
      <div className="flex gap-2 bg-surface-container-low rounded-2xl p-1 mt-2">
        <Link href="/leaderboard" className={tabCls(!isFriends)}>لیگ هم‌سطح</Link>
        <Link href="/leaderboard?tab=friends" className={tabCls(isFriends)}>دوستان</Link>
      </div>

      {/* Tournament entry */}
      <Link href="/tournaments" className="glass-card rounded-xl p-3 flex items-center gap-3 flex-row-reverse border-r-4 border-r-tertiary-fixed-dim hover:bg-tertiary-fixed/10 transition-colors">
        <span className="material-symbols-outlined text-tertiary text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
        <div className="text-right flex-1">
          <p className="text-[14px] font-bold text-on-surface">تورنومنت‌های ویژه</p>
          <p className="text-[12px] text-on-surface-variant">رقابت‌های بازه‌دار با جایزه</p>
        </div>
        <span className="material-symbols-outlined text-outline" style={{ transform: "scaleX(-1)" }}>chevron_left</span>
      </Link>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-[24px] font-extrabold text-primary tracking-tight">{title}</h1>
        {!isFriends && (
          <div className="inline-flex items-center gap-1.5 mt-2 bg-primary-fixed px-3 py-1 rounded-full">
            <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{freeLeague ? "public" : "military_tech"}</span>
            <span className="text-[13px] font-bold text-primary">{freeLeague ? "لیگ آزاد" : `سطح: ${myLevel}`}</span>
          </div>
        )}
        <p className="text-[12px] text-on-surface-variant/70 mt-2">{subtitle}</p>
        <div className="w-16 h-1 bg-primary/20 mx-auto mt-3 rounded-full relative overflow-hidden">
          <div className="absolute inset-0 bg-primary w-1/3 animate-scan shadow-[0_0_8px_rgba(70,72,212,0.8)]" />
        </div>
      </div>

      {/* Friends tab: invite when empty */}
      {isFriends && leaderboard.length <= 1 ? (
        <>
          <div className="text-center py-4 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] text-outline-variant mb-2 block">diversity_3</span>
            <p>هنوز دوستی اضافه نکردی. دعوتشون کن تا رقابت شروع شه!</p>
          </div>
          <InviteFriends referralCode={referralCode} appUrl={appUrl} />
        </>
      ) : (
        <>
          {top3.length > 0 && <Podium top3={top3} />}
          {currentUserEntry && (
            <div className="bg-primary-fixed rounded-xl px-4 py-2 text-center">
              <span className="text-[14px] text-primary font-bold">
                رتبه شما: #{currentUserEntry.rank.toLocaleString("fa-IR")} با {currentUserEntry.weeklyXp.toLocaleString("fa-IR")} XP این هفته
              </span>
            </div>
          )}
          <LeaderboardList entries={rest} currentUserId={session.userId} />
          {isFriends && <InviteFriends referralCode={referralCode} appUrl={appUrl} />}
        </>
      )}
    </div>
  );
}
