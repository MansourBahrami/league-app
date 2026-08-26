import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReactionsForActivities } from "@/lib/reaction";
import { getBlockedUserIds } from "@/lib/privacy";
import { captureCaughtError } from "@/lib/observability";

const PAGE_SIZE = 30;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cursor = request.nextUrl.searchParams.get("cursor");
  if (!cursor) return NextResponse.json({ error: "cursor required" }, { status: 400 });

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
    cursor: { id: cursor },
    skip: 1,
    take: PAGE_SIZE + 1,
    include: { user: { select: { name: true, avatarUrl: true } } },
  }).catch((error) => {
    captureCaughtError("feed.history_query", error, { userId: session.userId });
    return null;
  });

  if (!activities) return NextResponse.json({ error: "خطا در دریافت ادامه فعالیت‌ها" }, { status: 500 });

  const hasMore = activities.length > PAGE_SIZE;
  const visibleActivities = hasMore ? activities.slice(0, PAGE_SIZE) : activities;
  const { counts, mine } = await getReactionsForActivities(
    visibleActivities.map((activity) => activity.id),
    session.userId,
  );

  return NextResponse.json({
    activities: visibleActivities,
    counts,
    mine,
    nextCursor: visibleActivities.at(-1)?.id ?? null,
    hasMore,
  });
}
