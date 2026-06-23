import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LiveFeed from "@/components/feed/LiveFeed";
import { getReactionsForActivities } from "@/lib/reaction";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const activities = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, avatarUrl: true } } },
  });

  const { counts, mine } = await getReactionsForActivities(
    activities.map((a) => a.id),
    session.userId
  );

  return (
    <div className="flex flex-col items-center w-full px-4">
      {/* Header (فشرده، یک‌ردیفه) */}
      <div data-tour="feed" className="glass-card w-full rounded-2xl px-4 py-2.5 flex items-center gap-2.5 flex-row-reverse mb-4">
        <div className="w-8 h-8 rounded-xl bg-[#4648d4] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
        </div>
        <h2 className="text-[15px] font-bold text-[#0b1c30] flex-1 text-right">بورد زنده</h2>
        <div className="flex items-center gap-1 bg-[#e1e0ff] px-2 py-0.5 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#006c49] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#4648d4]">زنده</span>
        </div>
      </div>

      <LiveFeed
        initialActivities={activities}
        meId={session.userId}
        initialCounts={counts}
        initialMine={mine}
      />
    </div>
  );
}
