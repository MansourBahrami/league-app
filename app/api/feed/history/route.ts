import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReactionsForActivities } from "@/lib/reaction";

const PAGE_SIZE = 30;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cursor = request.nextUrl.searchParams.get("cursor");
  if (!cursor) return NextResponse.json({ error: "cursor required" }, { status: 400 });

  const activities = await prisma.activityLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    cursor: { id: cursor },
    skip: 1,
    take: PAGE_SIZE + 1,
    include: { user: { select: { name: true, avatarUrl: true } } },
  }).catch(() => null);

  if (!activities) return NextResponse.json({ error: "cursor invalid" }, { status: 400 });

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
