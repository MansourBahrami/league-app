import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getStats() {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day1 = new Date(now - 24 * 60 * 60 * 1000);
  const day7 = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, newToday, active24hRows, active7dRows, day1Done, leadDone, week2, totalSessions] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.studySession.findMany({ where: { startTime: { gte: day1 } }, distinct: ["userId"], select: { userId: true } }),
    prisma.studySession.findMany({ where: { startTime: { gte: day7 } }, distinct: ["userId"], select: { userId: true } }),
    prisma.user.count({ where: { onboardingDay: { gte: 1 } } }),
    prisma.user.count({ where: { isLeadComplete: true } }),
    prisma.user.count({ where: { onboardingDay: { gte: 6 } } }),
    prisma.studySession.count(),
  ]);

  return {
    totalUsers,
    newToday,
    active24h: active24hRows.length,
    active7d: active7dRows.length,
    totalSessions,
    funnel: { registered: totalUsers, day1Done, leadDone, week2 },
  };
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#c7c4d7]/30 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1a` }}>
        <span className="material-symbols-outlined text-[24px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div>
        <p className="text-[13px] text-[#767586]">{label}</p>
        <p className="text-[24px] font-extrabold text-[#0b1c30]">{value}</p>
      </div>
    </div>
  );
}

function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[14px] font-semibold text-[#0b1c30]">{label}</span>
        <span className="text-[13px] text-[#464554]">
          {count.toLocaleString("fa-IR")} نفر ({pct.toLocaleString("fa-IR")}٪)
        </span>
      </div>
      <div className="h-7 w-full bg-[#eff4ff] rounded-lg overflow-hidden">
        <div className="h-full rounded-lg transition-all flex items-center justify-end px-2" style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  const s = await getStats();
  const { registered, day1Done, leadDone, week2 } = s.funnel;

  // نرخ ریزش بین مراحل
  const churn = (from: number, to: number) => (from > 0 ? Math.round(((from - to) / from) * 100) : 0);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[22px] font-extrabold text-[#0b1c30]">داشبورد آمار</h1>

      {/* آمار کلی */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="group" label="کل کاربران" value={s.totalUsers.toLocaleString("fa-IR")} color="#4648d4" />
        <StatCard icon="person_add" label="ثبت‌نام امروز" value={s.newToday.toLocaleString("fa-IR")} color="#006c49" />
        <StatCard icon="bolt" label="فعال ۲۴ ساعت" value={s.active24h.toLocaleString("fa-IR")} color="#a36700" />
        <StatCard icon="calendar_month" label="فعال ۷ روز" value={s.active7d.toLocaleString("fa-IR")} color="#825100" />
      </div>

      {/* قیف تبدیل */}
      <section className="bg-white rounded-2xl p-6 border border-[#c7c4d7]/30">
        <h2 className="text-[18px] font-bold text-[#0b1c30] mb-1">قیف تبدیل و نرخ ریزش</h2>
        <p className="text-[13px] text-[#767586] mb-5">مسیر کاربر از ثبت‌نام تا ورود به هفته دوم</p>
        <div className="flex flex-col gap-4">
          <FunnelBar label="۱. ثبت‌نام / ورود" count={registered} total={registered} color="#4648d4" />
          <FunnelBar label="۲. اتمام روز اول" count={day1Done} total={registered} color="#5658d8" />
          <FunnelBar label="۳. تکمیل لید (پروفایل)" count={leadDone} total={registered} color="#6cf8bb" />
          <FunnelBar label="۴. ورود به هفته دوم" count={week2} total={registered} color="#006c49" />
        </div>

        {/* نرخ ریزش بین مراحل */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-[#c7c4d7]/30">
          <div className="text-center">
            <p className="text-[12px] text-[#767586]">ریزش مرحله ۱→۲</p>
            <p className="text-[20px] font-bold text-[#ba1a1a]">{churn(registered, day1Done).toLocaleString("fa-IR")}٪</p>
          </div>
          <div className="text-center">
            <p className="text-[12px] text-[#767586]">ریزش مرحله ۲→۳</p>
            <p className="text-[20px] font-bold text-[#ba1a1a]">{churn(day1Done, leadDone).toLocaleString("fa-IR")}٪</p>
          </div>
          <div className="text-center">
            <p className="text-[12px] text-[#767586]">ریزش مرحله ۳→۴</p>
            <p className="text-[20px] font-bold text-[#ba1a1a]">{churn(leadDone, week2).toLocaleString("fa-IR")}٪</p>
          </div>
        </div>
      </section>

      <p className="text-[12px] text-[#767586] text-center">مجموع جلسات مطالعه ثبت‌شده: {s.totalSessions.toLocaleString("fa-IR")}</p>
    </div>
  );
}
