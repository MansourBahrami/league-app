import { prisma } from "../lib/db";
import { redis } from "../lib/redis";
import { broadcastActivity } from "../lib/feed-broadcast";
import { calcLevel, type MedalCount } from "../lib/gamification";
import { getNextTehranMissionWeek, tehranDayStart } from "../lib/date";

const USER_COUNT = 50;
const CAMP_MEMBER_START_INDEX = 20;
const DAILY_CAMP_TARGETS = [3, 5, 7] as const;
const WEEKLY_CAMP_TARGETS = [20, 25, 30] as const;
const ID_PREFIX = "prod-scenario-";
const NAME_PREFIX = "آزمایش production";
const ACTION = process.argv[2] ?? "seed";

function assertConfirmed() {
  if (process.env.PRODUCTION_SCENARIO_CONFIRM !== "1") {
    throw new Error("PRODUCTION_SCENARIO_CONFIRM=1 لازم است.");
  }
}

function idFor(index: number) {
  return `${ID_PREFIX}${String(index + 1).padStart(3, "0")}`;
}

function phoneFor(index: number) {
  return `0997${String(index + 1).padStart(7, "0")}`;
}

function counts(hours: number[]): MedalCount[] {
  const grouped = new Map<number, number>();
  for (const hour of hours) grouped.set(hour, (grouped.get(hour) ?? 0) + 1);
  return [...grouped].map(([targetHours, count]) => ({ targetHours, count }));
}

function profileFor(index: number) {
  if (index < 10) {
    return { stage: "تازه‌وارد", xp: 0, coins: 0, onboardingDay: 0, step: 0, medals: [] as number[] };
  }
  if (index < 20) {
    return { stage: "شروع نیمه‌کاره", xp: 0, coins: 2, onboardingDay: 0, step: index % 2 ? 5 : 10, medals: [] as number[] };
  }
  if (index < 30) {
    return { stage: "تازه‌نفس", xp: 15 + (index - 20) * 8, coins: 12 + index, onboardingDay: 1, step: 0, medals: [] as number[] };
  }
  if (index < 40) {
    return { stage: "ثابت‌قدم", xp: 220 + (index - 30) * 20, coins: 70 + index, onboardingDay: 1, step: 0, medals: [20] };
  }
  if (index < 45) {
    return { stage: "ثابت‌قدم حرفه‌ای", xp: 850 + (index - 40) * 30, coins: 150 + index, onboardingDay: 1, step: 0, medals: [20, 25, 30, 35] };
  }
  return { stage: "پیشرو", xp: 1250 + (index - 45) * 80, coins: 240 + index, onboardingDay: 1, step: 0, medals: [20, 25, 30, 35, 35, 40] };
}

async function seedMissionCamps() {
  const members = Array.from(
    { length: USER_COUNT - CAMP_MEMBER_START_INDEX },
    (_, offset) => ({ index: CAMP_MEMBER_START_INDEX + offset, id: idFor(CAMP_MEMBER_START_INDEX + offset) }),
  );
  const memberIds = members.map((member) => member.id);
  const existingUsers = await prisma.user.count({ where: { id: { in: memberIds } } });
  if (existingUsers !== members.length) {
    throw new Error(`scenario_camp_users_${existingUsers}_of_${members.length}`);
  }

  const missionTargets = [
    ...DAILY_CAMP_TARGETS.map((targetHours) => ({ kind: "daily", targetHours })),
    ...WEEKLY_CAMP_TARGETS.map((targetHours) => ({ kind: "weekly", targetHours })),
  ];
  const missions = await prisma.mission.findMany({
    where: {
      isActive: true,
      OR: missionTargets,
    },
    select: { id: true, kind: true, targetHours: true },
  });
  const missionByKey = new Map(missions.map((mission) => [`${mission.kind}:${mission.targetHours}`, mission]));
  const missingMissions = missionTargets.filter(({ kind, targetHours }) => !missionByKey.has(`${kind}:${targetHours}`));
  if (missingMissions.length > 0) {
    throw new Error(`missing_missions:${missingMissions.map(({ kind, targetHours }) => `${kind}:${targetHours}`).join(",")}`);
  }

  const dailyStartsAt = tehranDayStart();
  const dailyEndsAt = new Date(dailyStartsAt.getTime() + 86_400_000);
  const weeklyWindow = getNextTehranMissionWeek();
  const campDefinitions = missionTargets.map(({ kind, targetHours }) => ({
    kind,
    targetHours,
    mission: missionByKey.get(`${kind}:${targetHours}`)!,
    startsAt: kind === "daily" ? dailyStartsAt : weeklyWindow.startsAt,
    endsAt: kind === "daily" ? dailyEndsAt : weeklyWindow.endsAt,
    status: kind === "daily" ? "active" : "pending",
  }));

  const result = await prisma.$transaction(async (tx) => {
    await tx.userMission.deleteMany({ where: { userId: { in: memberIds } } });

    const rooms = new Map<string, string>();
    for (const camp of campDefinitions) {
      const room = await tx.missionRoom.upsert({
        where: { missionId_startsAt: { missionId: camp.mission.id, startsAt: camp.startsAt } },
        create: {
          missionId: camp.mission.id,
          kind: camp.kind,
          targetHours: camp.targetHours,
          startsAt: camp.startsAt,
          endsAt: camp.endsAt,
        },
        update: { endsAt: camp.endsAt },
        select: { id: true },
      });
      rooms.set(`${camp.kind}:${camp.targetHours}`, room.id);
    }

    const userMissions = campDefinitions.flatMap((camp) => {
      const targets = camp.kind === "daily" ? DAILY_CAMP_TARGETS : WEEKLY_CAMP_TARGETS;
      return members
        .filter((_, memberIndex) => {
          const targetOffset = camp.kind === "daily" ? memberIndex : memberIndex + 1;
          return targets[targetOffset % targets.length] === camp.targetHours;
        })
        .map((member) => ({
          id: `${ID_PREFIX}mission-${camp.kind}-${member.index + 1}`,
          userId: member.id,
          missionId: camp.mission.id,
          roomId: rooms.get(`${camp.kind}:${camp.targetHours}`)!,
          activatesAt: camp.startsAt,
          expiresAt: camp.endsAt,
          status: camp.status,
        }));
    });
    await tx.userMission.createMany({
      data: userMissions.map(({ roomId: _roomId, ...userMission }) => userMission),
    });
    await tx.missionRoomMember.createMany({
      data: userMissions.map((userMission) => ({
        id: `${ID_PREFIX}member-${userMission.id.slice(ID_PREFIX.length)}`,
        roomId: userMission.roomId,
        userId: userMission.userId,
        userMissionId: userMission.id,
      })),
    });

    return Promise.all(campDefinitions.map(async (camp) => ({
      kind: camp.kind,
      targetHours: camp.targetHours,
      roomId: rooms.get(`${camp.kind}:${camp.targetHours}`)!,
      members: await tx.missionRoomMember.count({
        where: { roomId: rooms.get(`${camp.kind}:${camp.targetHours}`)! },
      }),
    })));
  }, { timeout: 15_000 });

  return {
    eligibleUsers: members.length,
    camps: result,
  };
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { id: { startsWith: ID_PREFIX } },
    select: { id: true },
  });
  const ids = users.map((user) => user.id);
  if (ids.length === 0) return { users: 0, outbox: 0, notificationLogs: 0, cacheKeys: 0, replayEvents: 0 };

  const notificationLogs = (await prisma.notificationLog.deleteMany({ where: { userId: { in: ids } } })).count;
  const outbox = (await prisma.productEventOutbox.deleteMany({ where: { distinctId: { in: ids } } })).count;
  const deletedUsers = (await prisma.user.deleteMany({ where: { id: { in: ids } } })).count;
  const cacheKeys = await redis.del(...ids.map((id) => `gcamp:session-version:${id}`));

  let replayEvents = 0;
  const replay = await redis.lrange("gcamp:feed:recent", 0, 99);
  for (const item of replay) {
    if (ids.some((id) => item.includes(id))) replayEvents += await redis.lrem("gcamp:feed:recent", 0, item);
  }

  return { users: deletedUsers, outbox, notificationLogs, cacheKeys, replayEvents };
}

async function seed() {
  const previous = await cleanup();
  const today = tehranDayStart();
  const medals = await prisma.medal.findMany({ select: { id: true, targetHours: true } });
  const medalIds = new Map(medals.map((medal) => [medal.targetHours, medal.id]));
  const missingMedals = [20, 25, 30, 35, 40].filter((hours) => !medalIds.has(hours));
  if (missingMedals.length > 0) throw new Error(`missing_medals:${missingMedals.join(",")}`);

  const profiles = Array.from({ length: USER_COUNT }, (_, index) => profileFor(index));
  await prisma.user.createMany({
    data: profiles.map((profile, index) => {
      const level = calcLevel(profile.xp, counts(profile.medals));
      return {
        id: idFor(index),
        phone: phoneFor(index),
        name: `${NAME_PREFIX} — ${profile.stage} ${String(index + 1).padStart(2, "0")}`,
        grade: ["دهم", "یازدهم", "دوازدهم"][index % 3],
        field: ["ریاضی", "تجربی", "انسانی"][index % 3],
        xp: profile.xp,
        coins: profile.coins,
        level: level.level,
        stars: level.stars,
        onboardingDay: profile.onboardingDay,
        onboardingStepMinutes: profile.step,
        day1GoalMinutes: 15,
        hasSeenIntro: index >= 10,
        isLeadComplete: index >= 10,
        videoAccess: index % 2 === 0 ? "free" : "paid",
        streak: index >= 20 ? (index % 7) + 1 : 0,
        lastStudyDate: index >= 20 ? today : null,
        profilePublic: true,
        activityPublic: true,
        avatarUrl: `/avatars/a${(index % 8) + 1}.svg`,
      };
    }),
  });

  const medalRows = profiles.flatMap((profile, index) => profile.medals.map((hours, medalIndex) => ({
    userId: idFor(index),
    medalId: medalIds.get(hours)!,
    earnedAt: new Date(today.getTime() - (profile.medals.length - medalIndex) * 86_400_000),
  })));
  if (medalRows.length > 0) await prisma.userMedal.createMany({ data: medalRows });

  const completedSessions = profiles.flatMap((_, index) => {
    if (index < 20) return [];
    return [0, 2, 4].map((daysAgo, sessionIndex) => {
      const durationMin = 30 + ((index + sessionIndex) % 6) * 15;
      const startTime = new Date(today.getTime() - daysAgo * 86_400_000 + (9 + sessionIndex) * 3_600_000);
      const reward = Math.floor(durationMin / 15);
      return {
        userId: idFor(index),
        startTime,
        endTime: new Date(startTime.getTime() + durationMin * 60_000),
        durationMin,
        plannedMin: durationMin,
        xpEarned: reward,
        coinsEarned: reward,
        tickCount: reward,
      };
    });
  });
  await prisma.studySession.createMany({ data: completedSessions });

  const activeIndexes = Array.from({ length: 20 }, (_, index) => index);
  await prisma.studySession.createMany({
    data: activeIndexes.map((index) => ({
      userId: idFor(index),
      startTime: new Date(Date.now() - (index % 5) * 60_000),
      plannedMin: 120,
    })),
  });

  const activityRows = await Promise.all(profiles.map((profile, index) => {
    const active = index < 20;
    const durationMin = 30 + (index % 6) * 15;
    return prisma.activityLog.create({
      data: {
        userId: idFor(index),
        type: active ? "timer_start" : "session_complete",
        metadata: active
          ? { durationMin: 120, productionScenario: true }
          : { durationMin, xp: Math.floor(durationMin / 15), coins: Math.floor(durationMin / 15), productionScenario: true },
        createdAt: new Date(Date.now() - (USER_COUNT - index) * 1_000),
      },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });
  }));
  const missionCamps = await seedMissionCamps();

  return {
    previous,
    users: USER_COUNT,
    activeSessions: activeIndexes.length,
    completedSessions: completedSessions.length,
    feedActivities: activityRows.length,
    missionCamps,
    stages: profiles.reduce<Record<string, number>>((result, profile) => {
      result[profile.stage] = (result[profile.stage] ?? 0) + 1;
      return result;
    }, {}),
  };
}

async function live() {
  const users = await prisma.user.findMany({
    where: { id: { startsWith: ID_PREFIX } },
    orderBy: { id: "asc" },
    select: { id: true, name: true, avatarUrl: true },
  });
  if (users.length !== USER_COUNT) throw new Error(`scenario_users_${users.length}_of_${USER_COUNT}`);

  for (let offset = 0; offset < users.length; offset += 5) {
    const wave = users.slice(offset, offset + 5);
    const logs = await Promise.all(wave.map((user, waveIndex) => prisma.activityLog.create({
      data: {
        userId: user.id,
        type: "timer_start",
        metadata: { durationMin: [30, 60, 90, 120][(offset + waveIndex) % 4], productionScenario: true },
      },
    })));
    logs.forEach((log, index) => broadcastActivity({ ...log, user: wave[index] }));
    console.log(JSON.stringify({ wave: offset / 5 + 1, users: wave.map((user) => user.name) }));
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  return { waves: 10, activities: USER_COUNT };
}

async function main() {
  assertConfirmed();
  if (ACTION === "cleanup") return cleanup();
  if (ACTION === "seed") return seed();
  if (ACTION === "camps") return seedMissionCamps();
  if (ACTION === "live") return live();
  throw new Error(`unknown_action:${ACTION}`);
}

main()
  .then((result) => console.log(JSON.stringify({ action: ACTION, ...result }, null, 2)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
