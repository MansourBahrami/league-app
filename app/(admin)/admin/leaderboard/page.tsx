import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const LEVELS = ["تازه‌نفس", "ثابت‌قدم", "پیشرو", "سرآمد", "الگو"];

async function getLevelBoard(level: string, since: Date) {
  const users = await prisma.user.findMany({ where: { level }, select: { id: true, name: true, phone: true } });
  if (users.length === 0) return { count: 0, top: [] as { name: string; phone: string; xp: number }[] };
  const ids = users.map((u) => u.id);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const weekly = await prisma.studySession.groupBy({
    by: ["userId"],
    where: { userId: { in: ids }, startTime: { gte: since } },
    _sum: { xpEarned: true },
    orderBy: { _sum: { xpEarned: "desc" } },
    take: 5,
  });

  const top = weekly.map((w) => {
    const u = userMap.get(w.userId);
    return { name: u?.name ?? "کاربر", phone: u?.phone ?? "", xp: w._sum.xpEarned ?? 0 };
  });
  return { count: users.length, top };
}

export default async function AdminLeaderboardPage() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const boards = await Promise.all(LEVELS.map(async (lvl) => ({ level: lvl, ...(await getLevelBoard(lvl, since)) })));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-extrabold text-on-surface">لیدربورد سطوح</h1>
        <p className="text-[13px] text-outline">رتبه‌بندی هفتگی (XP هفت روز اخیر) به تفکیک سطح</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {boards.map((b) => (
          <div key={b.level} className="bg-white rounded-2xl p-5 border border-outline-variant/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-bold text-primary">{b.level}</h2>
              <span className="text-[12px] text-outline">{b.count.toLocaleString("fa-IR")} کاربر</span>
            </div>
            {b.top.length === 0 ? (
              <p className="text-[13px] text-outline py-3 text-center">فعالیتی این هفته نیست.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {b.top.map((u, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${i === 0 ? "bg-tertiary-fixed-dim text-on-tertiary-fixed" : "bg-primary-fixed text-primary"}`}>
                      {(i + 1).toLocaleString("fa-IR")}
                    </span>
                    <span className="flex-1 text-[13px] font-semibold text-on-surface truncate">{u.name}</span>
                    <span className="text-[12px] text-outline" dir="ltr">{u.phone}</span>
                    <span className="text-[13px] font-bold text-tertiary">{u.xp.toLocaleString("fa-IR")} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
