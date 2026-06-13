import { prisma } from "@/lib/db";
import LiveFeed from "@/components/feed/LiveFeed";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const activities = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, avatarUrl: true } } },
  });

  return (
    <div className="flex flex-col items-center w-full px-5">
      {/* Header Card */}
      <div className="glass-card w-full rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden mb-6">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(to right, #4648d4 1px, transparent 1px), linear-gradient(to bottom, #4648d4 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#4648d4] flex items-center justify-center shadow-lg shadow-[#4648d4]/30 mb-3">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          </div>
          <h2 className="text-[24px] font-bold text-[#0b1c30] mb-1">بورد زنده</h2>
          <p className="text-[16px] text-[#464554]">ببینید دوستانتون دارن چیکار می‌کنن!</p>
          <div className="flex items-center gap-1.5 mt-2 bg-[#e1e0ff] px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#006c49] animate-pulse" />
            <span className="text-[12px] font-semibold text-[#4648d4]">زنده</span>
          </div>
        </div>
      </div>

      <LiveFeed initialActivities={activities} />
    </div>
  );
}
