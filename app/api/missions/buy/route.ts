import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { broadcastActivity } from "@/lib/feed-broadcast";
import { getNextTehranMissionWeek, tehranDayStart } from "@/lib/date";
import { processUserMissions } from "@/lib/mission";
import { withUserLock } from "@/lib/user-lock";
import { after } from "next/server";
import { captureServerEvent } from "@/lib/analytics-server";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { missionId } = await req.json();
  if (!missionId) return NextResponse.json({ error: "missionId required" }, { status: 400 });

  await processUserMissions(session.userId);

  const mission = await prisma.mission.findUnique({ where: { id: missionId } });

  if (!mission || !mission.isActive) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mission.kind !== "daily" && mission.kind !== "weekly") {
    return NextResponse.json({ error: "نوع ماموریت پشتیبانی نمی‌شود" }, { status: 400 });
  }
  const isDaily = mission.kind === "daily";
  const now = new Date();

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

  const joined = await withUserLock(session.userId, async (tx) => {
    const currentUser = await tx.user.findUnique({
      where: { id: session.userId },
      select: { onboardingDay: true },
    });
    if (!currentUser) return { status: "not_found" } as const;
    if (currentUser.onboardingDay < 1) return { status: "onboarding" } as const;

    const existing = await tx.userMission.findFirst({
      where: {
        userId: session.userId,
        status: { in: ["active", "pending"] },
        expiresAt: { gt: now },
        mission: { kind: isDaily ? "daily" : "weekly" },
      },
    });
    if (existing) return { status: "existing" } as const;

    const debit = await tx.user.updateMany({
      where: { id: session.userId, coins: { gte: mission.entryCost } },
      data: { coins: { decrement: mission.entryCost } },
    });
    if (debit.count !== 1) return { status: "insufficient" } as const;

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
    return { status: "joined", roomId: room.id } as const;
  });

  if (joined.status === "not_found") {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }
  if (joined.status === "onboarding") {
    return NextResponse.json({ error: "ماموریت‌ها پس از روز اول فعال می‌شوند" }, { status: 403 });
  }
  if (joined.status === "existing") {
    return NextResponse.json(
      { error: isDaily ? "امروز ماموریت روزانه‌ی فعال داری" : "ماموریت هفتگی فعال داری" },
      { status: 400 },
    );
  }
  if (joined.status === "insufficient") {
    return NextResponse.json({ error: "سکه کافی نیست" }, { status: 400 });
  }

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
  after(() => captureServerEvent({
    distinctId: session.userId,
    event: "mission_joined",
    properties: {
      mission_kind: mission.kind,
      target_hours: mission.targetHours,
      entry_cost: mission.entryCost,
    },
    insertId: `mission-joined:${session.userId}:${missionId}:${joined.roomId}`,
  }));

  return NextResponse.json({ message: "وارد کمپ مأموریت شدی", roomId: joined.roomId });
}
