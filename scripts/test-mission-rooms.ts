import "dotenv/config";
import crypto from "node:crypto";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getNextTehranMissionWeek } from "../lib/date";
import { hasRunningStudyTimer } from "../lib/focus";
import { ensureMissionRoomMembership, getMissionRoomSnapshot, pickMissionRoomToOpen } from "../lib/mission-room";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const runId = crypto.randomBytes(6).toString("hex");
const phones = [`room-test-${runId}-1`, `room-test-${runId}-2`];

async function cleanup() {
  const users = await prisma.user.findMany({ where: { phone: { in: phones } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return;

  const roomIds = (await prisma.missionRoomMember.findMany({
    where: { userId: { in: userIds } },
    select: { roomId: true },
  })).map((member) => member.roomId);

  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (roomIds.length > 0) {
    await prisma.missionRoom.deleteMany({ where: { id: { in: roomIds }, members: { none: {} } } });
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  await cleanup();

  const fridayWindow = getNextTehranMissionWeek(new Date("2026-08-21T08:00:00.000Z"));
  assert(fridayWindow.enrollmentOpen, "ثبت‌نام هفتگی باید جمعه باز باشد");
  assert(fridayWindow.startsAt.toISOString() === "2026-08-21T20:30:00.000Z", "شروع هفتگی باید شنبه ۰۰:۰۰ تهران باشد");

  const mission = await prisma.mission.findFirst({
    where: { kind: "daily", isActive: true },
    orderBy: { targetHours: "asc" },
  });
  assert(mission, "ماموریت روزانه پیدا نشد؛ ابتدا seed را اجرا کنید");

  const [first, second] = await Promise.all([
    prisma.user.create({ data: { phone: phones[0], name: "آزمون اول", onboardingDay: 6 } }),
    prisma.user.create({ data: { phone: phones[1], name: "آزمون دوم", onboardingDay: 6 } }),
  ]);
  // بازهٔ یکتای هر اجرای تست مانع عضویت داده‌های واقعی یا اجرای موازی در همین اتاق می‌شود.
  const startsAt = new Date(Date.UTC(2040, 0, 1) + crypto.randomInt(0, 365 * 86400000));
  const endsAt = new Date(startsAt.getTime() + 86400000);

  const [firstMission, secondMission] = await Promise.all([
    prisma.userMission.create({
      data: { userId: first.id, missionId: mission.id, activatesAt: startsAt, expiresAt: endsAt, status: "active" },
    }),
    prisma.userMission.create({
      data: { userId: second.id, missionId: mission.id, activatesAt: startsAt, expiresAt: endsAt, status: "active" },
    }),
  ]);

  const firstRoomId = await ensureMissionRoomMembership(firstMission.id);
  const secondRoomId = await ensureMissionRoomMembership(secondMission.id);
  assert(firstRoomId && firstRoomId === secondRoomId, "کاربران هم‌هدف باید در یک اتاق قرار بگیرند");

  await Promise.all([
    prisma.studySession.create({
      data: { userId: first.id, startTime: new Date(startsAt.getTime() + 3600000), endTime: new Date(startsAt.getTime() + 7200000), durationMin: 60 },
    }),
    prisma.studySession.create({
      data: { userId: second.id, startTime: new Date(startsAt.getTime() + 3600000), endTime: new Date(startsAt.getTime() + 5400000), durationMin: 30 },
    }),
  ]);

  const snapshot = await getMissionRoomSnapshot(firstRoomId, first.id, new Date(startsAt.getTime() + 10800000));
  assert(snapshot, "snapshot اتاق ساخته نشد");
  assert(snapshot.memberCount === 2, `اتاق باید دو عضو داشته باشد؛ مقدار واقعی: ${snapshot.memberCount}`);
  assert(snapshot.members[0]?.userId === first.id && snapshot.members[0]?.rank === 1, "رتبه باید بر اساس زمان تأییدشده باشد");
  assert(snapshot.myStudiedMin === 60, "پیشرفت شخصی باید فقط زمان همان کاربر را نشان دهد");

  const pendingWeekly = { ...snapshot, id: "pending-weekly", kind: "weekly" as const, status: "pending" as const };
  assert(pickMissionRoomToOpen([pendingWeekly, snapshot])?.id === snapshot.id, "تب باید اتاق فعال را قبل از اتاق pending باز کند");

  const timerNow = new Date();
  await prisma.studySession.create({
    data: {
      userId: first.id,
      startTime: timerNow,
      plannedMin: 60,
      pausedAt: timerNow,
    },
  });
  assert(await hasRunningStudyTimer(first.id, timerNow), "تایمر pause‌شده همچنان باید روشن محسوب شود");

  const forbidden = await getMissionRoomSnapshot(firstRoomId, "not-a-room-member", new Date());
  assert(forbidden === null, "کاربر غیرعضو نباید snapshot اتاق را ببیند");

  console.log("Mission room integration test passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
