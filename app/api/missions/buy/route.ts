import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { broadcastActivity } from "@/app/api/feed/stream/route";
import { tehranDayStart } from "@/lib/date";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { missionId } = await req.json();
  if (!missionId) return NextResponse.json({ error: "missionId required" }, { status: 400 });

  const [user, mission] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { coins: true, onboardingDay: true } }),
    prisma.mission.findUnique({ where: { id: missionId } }),
  ]);

  if (!user || !mission) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.onboardingDay < 6) return NextResponse.json({ error: "ماموریت‌ها از روز ششم فعال می‌شوند" }, { status: 403 });
  if (user.coins < mission.entryCost) return NextResponse.json({ error: "سکه کافی نیست" }, { status: 400 });

  const isDaily = mission.kind === "daily";

  // محدودیت هم‌زمانی: روزانه فقط با روزانه‌ی فعال تداخل دارد، هفتگی با هفتگی
  const existing = await prisma.userMission.findFirst({
    where: {
      userId: session.userId,
      status: { in: ["active", "pending"] },
      mission: { kind: isDaily ? "daily" : "weekly" },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: isDaily ? "امروز ماموریت روزانه‌ی فعال داری" : "ماموریت هفتگی فعال داری" },
      { status: 400 }
    );
  }

  // روزانه: همین امروز فعال و پایان امروز (به وقت تهران) منقضی می‌شود.
  // هفتگی: از ابتدای روزِ بعد فعال و ۷ روز بعد منقضی می‌شود.
  const todayStart = tehranDayStart();
  const nextDay = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const activatesAt = isDaily ? todayStart : nextDay;
  const expiresAt = isDaily ? nextDay : new Date(activatesAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  const activityUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, avatarUrl: true },
  });

  await prisma.$transaction([
    prisma.user.update({ where: { id: session.userId }, data: { coins: { decrement: mission.entryCost } } }),
    prisma.userMission.create({
      data: { userId: session.userId, missionId, activatesAt, expiresAt, status: isDaily ? "active" : "pending" },
    }),
  ]);

  const log = await prisma.activityLog.create({
    data: { userId: session.userId, type: "mission_buy", metadata: { missionId, cost: mission.entryCost, targetHours: mission.targetHours, kind: mission.kind } },
  });
  broadcastActivity({ ...log, user: activityUser });

  return NextResponse.json({ message: "ماموریت خریداری شد" });
}
