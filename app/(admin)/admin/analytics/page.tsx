import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Variant = "free" | "paid";

interface VariantStats {
  users: number;
  activeUsers: number; // ≥۱ جلسه مطالعه
  active7d: number; // فعال در ۷ روز اخیر
  totalStudyMinutes: number;
  totalSessions: number;
  usersWithVideo: number; // ≥۱ ویدیوی تکمیل‌شده
  totalVideosCompleted: number;
  totalVideoBuys: number;
  sumOnboardingDay: number;
}

function emptyStats(): VariantStats {
  return {
    users: 0, activeUsers: 0, active7d: 0, totalStudyMinutes: 0, totalSessions: 0,
    usersWithVideo: 0, totalVideosCompleted: 0, totalVideoBuys: 0, sumOnboardingDay: 0,
  };
}

function pct(n: number, d: number): string {
  if (d === 0) return "—";
  return `${Math.round((n / d) * 100).toLocaleString("fa-IR")}٪`;
}

function avg(n: number, d: number, digits = 1): string {
  if (d === 0) return "—";
  return (n / d).toLocaleString("fa-IR", { maximumFractionDigits: digits });
}

export default async function AnalyticsPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [users, sessionsByUser, sessions7dByUser, completedByUser, buysByUser] = await Promise.all([
    prisma.user.findMany({ select: { id: true, videoAccess: true, onboardingDay: true } }),
    prisma.studySession.groupBy({ by: ["userId"], _sum: { durationMin: true }, _count: { _all: true } }),
    prisma.studySession.groupBy({ by: ["userId"], where: { startTime: { gte: sevenDaysAgo } }, _count: { _all: true } }),
    prisma.videoProgress.groupBy({ by: ["userId"], where: { completed: true }, _count: { _all: true } }),
    prisma.activityLog.groupBy({ by: ["userId"], where: { type: "video_buy" }, _count: { _all: true } }),
  ]);

  const sessMap = new Map(sessionsByUser.map((s) => [s.userId, { min: s._sum.durationMin ?? 0, cnt: s._count._all }]));
  const sess7Map = new Map(sessions7dByUser.map((s) => [s.userId, s._count._all]));
  const compMap = new Map(completedByUser.map((c) => [c.userId, c._count._all]));
  const buyMap = new Map(buysByUser.map((b) => [b.userId, b._count._all]));

  const stats: Record<Variant, VariantStats> = { free: emptyStats(), paid: emptyStats() };

  for (const u of users) {
    const v: Variant = u.videoAccess === "paid" ? "paid" : "free";
    const s = stats[v];
    s.users += 1;
    s.sumOnboardingDay += u.onboardingDay;
    const sess = sessMap.get(u.id);
    if (sess) {
      s.activeUsers += 1;
      s.totalStudyMinutes += sess.min;
      s.totalSessions += sess.cnt;
    }
    if ((sess7Map.get(u.id) ?? 0) > 0) s.active7d += 1;
    const comp = compMap.get(u.id) ?? 0;
    if (comp > 0) s.usersWithVideo += 1;
    s.totalVideosCompleted += comp;
    s.totalVideoBuys += buyMap.get(u.id) ?? 0;
  }

  const rows: { label: string; free: string; paid: string; hint?: string }[] = [
    { label: "تعداد کاربران", free: stats.free.users.toLocaleString("fa-IR"), paid: stats.paid.users.toLocaleString("fa-IR") },
    { label: "نرخ بازدید ویدیو", free: pct(stats.free.usersWithVideo, stats.free.users), paid: pct(stats.paid.usersWithVideo, stats.paid.users), hint: "٪ کاربرانی که حداقل یک ویدیو را تا انتها دیده‌اند — معیار اصلی A/B" },
    { label: "میانگین ویدیوی دیده‌شده", free: avg(stats.free.totalVideosCompleted, stats.free.users), paid: avg(stats.paid.totalVideosCompleted, stats.paid.users), hint: "به ازای هر کاربر" },
    { label: "میانگین دقیقه مطالعه", free: avg(stats.free.totalStudyMinutes, stats.free.users, 0), paid: avg(stats.paid.totalStudyMinutes, stats.paid.users, 0), hint: "به ازای هر کاربر (انگیجمنت)" },
    { label: "میانگین جلسه مطالعه", free: avg(stats.free.totalSessions, stats.free.users), paid: avg(stats.paid.totalSessions, stats.paid.users), hint: "به ازای هر کاربر" },
    { label: "نرخ فعال‌بودن", free: pct(stats.free.activeUsers, stats.free.users), paid: pct(stats.paid.activeUsers, stats.paid.users), hint: "٪ کاربرانی که حداقل یک جلسه ثبت کرده‌اند" },
    { label: "فعال در ۷ روز اخیر", free: pct(stats.free.active7d, stats.free.users), paid: pct(stats.paid.active7d, stats.paid.users), hint: "ریتنشن کوتاه‌مدت" },
    { label: "میانگین روز آنبوردینگ", free: avg(stats.free.sumOnboardingDay, stats.free.users), paid: avg(stats.paid.sumOnboardingDay, stats.paid.users), hint: "پیشرفت در مسیر" },
    { label: "تعداد خرید ویدیو", free: "—", paid: stats.paid.totalVideoBuys.toLocaleString("fa-IR"), hint: "فقط گروه paid" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-extrabold text-on-surface">A/B تست: مدل دسترسی به ویدیو</h1>
        <p className="text-[14px] text-on-surface-variant mt-1">
          مقایسه‌ی دو گروه: <b>free</b> (ویدیو رایگان و باز با پیشرفت روز) در برابر <b>paid</b> (خرید ویدیو با سکه).
          گروهی که نرخ بازدید ویدیو و فعال‌بودن بالاتری داشته باشد برنده است.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-outline-variant/40 overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_1fr] bg-on-surface text-white text-[13px] font-bold">
          <div className="p-3">معیار</div>
          <div className="p-3 text-center border-r border-white/10">گروه free</div>
          <div className="p-3 text-center border-r border-white/10">گروه paid</div>
        </div>
        {rows.map((r, i) => (
          <div key={r.label} className={`grid grid-cols-[1.6fr_1fr_1fr] items-center ${i % 2 ? "bg-surface" : "bg-white"}`}>
            <div className="p-3 text-right">
              <div className="text-[14px] font-semibold text-on-surface">{r.label}</div>
              {r.hint && <div className="text-[11px] text-outline mt-0.5">{r.hint}</div>}
            </div>
            <div className="p-3 text-center text-[16px] font-bold text-primary border-r border-outline-variant/30">{r.free}</div>
            <div className="p-3 text-center text-[16px] font-bold text-tertiary border-r border-outline-variant/30">{r.paid}</div>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-outline leading-relaxed">
        ⚠️ برای نتیجه‌گیری معنادار آماری به چند ده تا چند صد کاربر در هر گروه نیاز است. تخصیص گروه به‌صورت تصادفی ۵۰/۵۰ در اولین ورود هر کاربر انجام می‌شود.
      </p>
    </div>
  );
}
