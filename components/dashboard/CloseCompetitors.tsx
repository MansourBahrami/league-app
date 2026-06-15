import { prisma } from "@/lib/db";

interface Props {
  userId: string;
}

/**
 * «امروز می‌تونی از این نفرات جلو بزنی» — بر اساس XP هفت روز اخیر و فقط بین هم‌سطح‌ها
 * (هماهنگ با لیدربورد هفتگی). نزدیک‌ترین رقبای جلوتر با اختلاف کمتر از ۴۰ XP.
 */
export default async function CloseCompetitors({ userId }: Props) {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { level: true } });
  if (!me) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // هم‌سطح‌ها
  const sameLevel = await prisma.user.findMany({
    where: { level: me.level },
    select: { id: true, name: true, avatarUrl: true },
  });
  const ids = sameLevel.map((u) => u.id);
  const infoMap = new Map(sameLevel.map((u) => [u.id, u]));

  // XP هفتگی هم‌سطح‌ها
  const weekly = await prisma.studySession.groupBy({
    by: ["userId"],
    where: { userId: { in: ids }, startTime: { gte: sevenDaysAgo } },
    _sum: { xpEarned: true },
  });
  const weeklyMap = new Map(weekly.map((w) => [w.userId, w._sum.xpEarned ?? 0]));
  const myWeekly = weeklyMap.get(userId) ?? 0;

  // رقبای جلوتر با اختلاف کمتر از ۴۰ XP
  const competitors = sameLevel
    .filter((u) => u.id !== userId)
    .map((u) => ({ ...u, weeklyXp: weeklyMap.get(u.id) ?? 0 }))
    .filter((u) => u.weeklyXp > myWeekly && u.weeklyXp - myWeekly < 40)
    .sort((a, b) => a.weeklyXp - b.weeklyXp)
    .slice(0, 5);

  if (competitors.length === 0) return null;

  return (
    <section className="mb-2">
      <h3 className="text-[15px] font-bold mb-3 text-on-surface text-right">
        امروز می‌تونی از این نفرات جلو بزنی...
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar" dir="rtl">
        {competitors.map((c) => {
          const info = infoMap.get(c.id);
          return (
            <div key={c.id} className="shrink-0 w-32 glass-card p-3 rounded-2xl flex flex-col items-center text-center">
              {info?.avatarUrl ? (
                <img src={info.avatarUrl} className="w-11 h-11 rounded-full border-2 border-tertiary-fixed-dim mb-1.5 object-cover" alt={info.name ?? "user"} />
              ) : (
                <div className="w-11 h-11 rounded-full bg-primary-fixed border-2 border-primary/30 mb-1.5 flex items-center justify-center text-[18px] font-bold text-primary">
                  {info?.name ? info.name[0] : "؟"}
                </div>
              )}
              <span className="text-[13px] font-bold text-on-surface truncate w-full">{info?.name ?? "کاربر"}</span>
              <span className="text-[12px] text-tertiary">
                +{(c.weeklyXp - myWeekly).toLocaleString("fa-IR")} XP تا عبور
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
