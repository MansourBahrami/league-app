import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { broadcastActivity } from "@/app/api/feed/stream/route";
import { getNextTehranMissionWeek, tehranDayStart } from "@/lib/date";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { missionId } = await req.json();
  if (!missionId) return NextResponse.json({ error: "missionId required" }, { status: 400 });

  const [user, mission] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { coins: true, onboardingDay: true } }),
    prisma.mission.findUnique({ where: { id: missionId } }),
  ]);

  if (!user || !mission || !mission.isActive) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mission.kind !== "daily" && mission.kind !== "weekly") {
    return NextResponse.json({ error: "نوع ماموریت پشتیبانی نمی‌شود" }, { status: 400 });
  }
  if (user.onboardingDay < 1) return NextResponse.json({ error: "ماموریت‌ها پس از روز اول فعال می‌شوند" }, { status: 403 });
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
  // هفتگی: فقط جمعه انتخاب می‌شود، شنبه شروع و جمعه بعد تمام می‌شود.
  const todayStart = tehranDayStart();
  const nextDay = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weeklyWindow = getNextTehranMissionWeek();
  if (!isDaily && !weeklyWindow.enrollmentOpen) {
    return NextResponse.json(
      { error: "ثبت‌نام ماموریت هفتگی جمعه‌ها باز می‌شود" },
      { status: 400 }
    );
  }
  const activatesAt = isDaily ? todayStart : weeklyWindow.startsAt;
  const expiresAt = isDaily ? nextDay : weeklyWindow.endsAt;

  const activityUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, avatarUrl: true },
  });

  const joined = await prisma.$transaction(async (tx) => {
    const debit = await tx.user.updateMany({
      where: { id: session.userId, coins: { gte: mission.entryCost } },
      data: { coins: { decrement: mission.entryCost } },
    });
    if (debit.count !== 1) throw new Error("INSUFFICIENT_COINS");

    const userMission = await tx.userMission.create({
      data: {
        userId: session.userId,
        missionId,
        activatesAt,
        expiresAt,
        status: isDaily ? "active" : "pending",
      },
    });
    const room = await tx.missionRoom.upsert({
      where: { missionId_startsAt: { missionId, startsAt: activatesAt } },
      create: {
        missionId,
        kind: mission.kind,
        targetHours: mission.targetHours,
        startsAt: activatesAt,
        endsAt: expiresAt,
      },
      update: { endsAt: expiresAt },
    });
    await tx.missionRoomMember.create({
      data: { roomId: room.id, userId: session.userId, userMissionId: userMission.id },
    });
    return { roomId: room.id };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "INSUFFICIENT_COINS") return null;
    throw error;
  });

  if (!joined) return NextResponse.json({ error: "سکه کافی نیست" }, { status: 400 });

  const log = await prisma.activityLog.create({
    data: {
      userId: session.userId,
      type: "mission_buy",
      metadata: {
        missionId,
        roomId: joined.roomId,
        cost: mission.entryCost,
        targetHours: mission.targetHours,
        kind: mission.kind,
      },
    },
  });
  broadcastActivity({ ...log, user: activityUser });

  return NextResponse.json({ message: "وارد کمپ مأموریت شدی", roomId: joined.roomId });
}
