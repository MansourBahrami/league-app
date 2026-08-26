import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LiveFeed from "@/components/feed/LiveFeed";
import { getReactionsForActivities } from "@/lib/reaction";
import { getBlockedUserIds } from "@/lib/privacy";

export const dynamic = "force-dynamic";

const FEED_PAGE_SIZE = 30;

export default async function FeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const blockedUserIds = await getBlockedUserIds(session.userId);
  const activities = await prisma.activityLog.findMany({
    where: {
      AND: [
        { userId: { notIn: blockedUserIds } },
        { OR: [{ userId: session.userId }, { user: { activityPublic: true } }] },
        {
          OR: [
            { type: { not: "session_complete" } },
            { type: "session_complete", metadata: { path: ["durationMin"], gt: 0 } },
          ],
        },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: FEED_PAGE_SIZE + 1,
    include: { user: { select: { name: true, avatarUrl: true } } },
  });

  const hasMore = activities.length > FEED_PAGE_SIZE;
  const visibleActivities = hasMore ? activities.slice(0, FEED_PAGE_SIZE) : activities;

  const { counts, mine } = await getReactionsForActivities(
    visibleActivities.map((activity) => activity.id),
    session.userId
  );

  return (
    <div className="flex flex-col items-center w-full px-4">
      {/* Header (فشرده، یک‌ردیفه) */}
      <div data-tour="feed" className="glass-card w-full rounded-2xl px-4 py-2.5 flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
        </div>
        <h2 className="text-[15px] font-bold text-on-surface flex-1 text-right">بورد زنده</h2>
        <div className="flex items-center gap-1 bg-primary-fixed px-2 py-0.5 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className="text-[11px] font-semibold text-primary">زنده</span>
        </div>
      </div>

      <LiveFeed
        initialActivities={visibleActivities}
        meId={session.userId}
        initialCounts={counts}
        initialMine={mine}
        initialHasMore={hasMore}
        initialCursor={visibleActivities.at(-1)?.id ?? null}
        blockedUserIds={blockedUserIds}
      />
    </div>
  );
}
