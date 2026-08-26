import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.userId;
  const [profile, sessions, missions, medals, videos, activities, reactions, inbox, tournaments, friendships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      omit: { sessionVersion: true },
    }),
    prisma.studySession.findMany({ where: { userId }, orderBy: { startTime: "desc" } }),
    prisma.userMission.findMany({ where: { userId }, include: { mission: true } }),
    prisma.userMedal.findMany({ where: { userId }, include: { medal: true } }),
    prisma.videoProgress.findMany({ where: { userId }, include: { video: { select: { id: true, title: true, day: true } } } }),
    prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.reaction.findMany({ where: { actorId: userId }, orderBy: { createdAt: "desc" } }),
    prisma.inboxItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.tournamentParticipant.findMany({ where: { userId }, include: { tournament: true } }),
    prisma.friendship.findMany({ where: { OR: [{ userId }, { friendId: userId }] } }),
  ]);

  return NextResponse.json(
    { exportedAt: new Date().toISOString(), profile, sessions, missions, medals, videos, activities, reactions, inbox, tournaments, friendships },
    { headers: { "Content-Disposition": `attachment; filename="gcamp-data-${userId}.json"` } },
  );
}
