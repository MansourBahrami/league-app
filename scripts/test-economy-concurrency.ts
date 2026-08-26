import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import { processUserMissions } from "../lib/mission";
import { applyStreak } from "../lib/streak";
import { toggleReaction, REACTION_REWARD_COINS } from "../lib/reaction";
import { joinTournament, settleEndedTournament } from "../lib/tournament";
import { tehranDayStart } from "../lib/date";
import { tryCompleteOnboardingDay } from "../lib/onboarding";
import { redis } from "../lib/redis";

async function createUser(data: { coins?: number; xp?: number; streak?: number; lastStudyDate?: Date } = {}) {
  return prisma.user.create({
    data: {
      name: "تست هم‌زمانی اقتصاد",
      onboardingDay: 1,
      isLeadComplete: true,
      coins: data.coins ?? 0,
      xp: data.xp ?? 0,
      streak: data.streak ?? 0,
      lastStudyDate: data.lastStudyDate,
    },
  });
}

async function testMissionRewardOnce() {
  const targetHours = 200_000 + Math.floor(Math.random() * 100_000);
  const medal = await prisma.medal.create({
    data: { name: `مدال تست ${targetHours}`, targetHours },
  });
  const mission = await prisma.mission.create({
    data: {
      kind: "weekly",
      targetHours,
      minAvgHours: 0,
      entryCost: 0,
      xpReward: 40,
      medalId: medal.id,
      isActive: true,
    },
  });
  const user = await createUser();
  try {
    const now = new Date();
    const userMission = await prisma.userMission.create({
      data: {
        userId: user.id,
        missionId: mission.id,
        activatesAt: new Date(now.getTime() - 60 * 60 * 1000),
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        status: "active",
      },
    });
    await prisma.studySession.create({
      data: {
        userId: user.id,
        startTime: new Date(now.getTime() - 30 * 60 * 1000),
        endTime: now,
        durationMin: targetHours * 60,
        plannedMin: targetHours * 60,
      },
    });

    await Promise.all(
      Array.from({ length: 100 }, () => processUserMissions(user.id)),
    );

    const [updatedUser, updatedMission, medals, logs] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      prisma.userMission.findUniqueOrThrow({ where: { id: userMission.id } }),
      prisma.userMedal.count({ where: { sourceUserMissionId: userMission.id } }),
      prisma.activityLog.count({
        where: { dedupeKey: `mission-medal:${userMission.id}` },
      }),
    ]);
    assert.equal(updatedUser.xp, 40);
    assert.equal(updatedMission.status, "completed");
    assert.equal(medals, 1);
    assert.equal(logs, 1);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.mission.delete({ where: { id: mission.id } });
    await prisma.medal.delete({ where: { id: medal.id } });
  }
}

async function testTournamentJoinNeverOverspends() {
  const user = await createUser({ coins: 10 });
  const now = new Date();
  const tournaments = await Promise.all(
    ["الف", "ب"].map((suffix) =>
      prisma.tournament.create({
        data: {
          name: `تورنومنت تست ${suffix}`,
          startAt: new Date(now.getTime() - 60_000),
          endAt: new Date(now.getTime() + 60 * 60 * 1000),
          entryCost: 7,
        },
      }),
    ),
  );
  try {
    const results = await Promise.all([
      ...Array.from({ length: 50 }, () => joinTournament(user.id, tournaments[0].id)),
      ...Array.from({ length: 50 }, () => joinTournament(user.id, tournaments[1].id)),
    ]);
    const [updatedUser, participants] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      prisma.tournamentParticipant.count({ where: { userId: user.id } }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(participants, 1);
    assert.equal(updatedUser.coins, 3);
  } finally {
    await prisma.tournament.deleteMany({
      where: { id: { in: tournaments.map((tournament) => tournament.id) } },
    });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

async function testTournamentSettlesOnce() {
  const [winner, runnerUp] = await Promise.all([createUser(), createUser()]);
  const now = new Date();
  const tournament = await prisma.tournament.create({
    data: {
      name: "تورنومنت پایان‌یافته تست",
      startAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() - 60 * 60 * 1000),
      prizeXp: 25,
      prizeCoins: 10,
    },
  });
  try {
    await prisma.tournamentParticipant.createMany({
      data: [
        { tournamentId: tournament.id, userId: winner.id },
        { tournamentId: tournament.id, userId: runnerUp.id },
      ],
    });
    await prisma.studySession.createMany({
      data: [
        {
          userId: winner.id,
          startTime: new Date(now.getTime() - 90 * 60 * 1000),
          endTime: new Date(now.getTime() - 80 * 60 * 1000),
          durationMin: 30,
          plannedMin: 30,
          xpEarned: 10,
          coinsEarned: 10,
        },
        {
          userId: runnerUp.id,
          startTime: new Date(now.getTime() - 90 * 60 * 1000),
          endTime: new Date(now.getTime() - 80 * 60 * 1000),
          durationMin: 15,
          plannedMin: 30,
          xpEarned: 5,
          coinsEarned: 5,
        },
      ],
    });

    const results = await Promise.all(
      Array.from({ length: 100 }, () => settleEndedTournament(tournament.id, now)),
    );
    const [updatedWinner, updatedTournament, winnerEntry] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: winner.id } }),
      prisma.tournament.findUniqueOrThrow({ where: { id: tournament.id } }),
      prisma.tournamentParticipant.findUniqueOrThrow({
        where: {
          tournamentId_userId: {
            tournamentId: tournament.id,
            userId: winner.id,
          },
        },
      }),
    ]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(updatedWinner.xp, 25);
    assert.equal(updatedWinner.coins, 10);
    assert.equal(updatedTournament.rewardsPaid, true);
    assert.equal(winnerEntry.score, 10);
  } finally {
    await prisma.tournament.delete({ where: { id: tournament.id } });
    await prisma.user.deleteMany({ where: { id: { in: [winner.id, runnerUp.id] } } });
  }
}

async function testReactionRewardOnce() {
  const actor = await createUser();
  const targets = await Promise.all(
    Array.from({ length: 5 }, () => createUser()),
  );
  try {
    const activities = await Promise.all(
      targets.map((target) =>
        prisma.activityLog.create({
          data: { userId: target.id, type: "session_complete" },
        }),
      ),
    );
    const results = await Promise.all(
      activities.map((activity) => toggleReaction(actor.id, activity.id, "👏")),
    );
    const [updatedActor, rewards] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: actor.id } }),
      prisma.inboxItem.count({
        where: { userId: actor.id, type: "reaction_reward" },
      }),
    ]);
    assert.equal(results.filter((result) => "rewardGranted" in result && result.rewardGranted).length, 1);
    assert.equal(updatedActor.coins, REACTION_REWARD_COINS);
    assert.equal(rewards, 1);
  } finally {
    await prisma.user.deleteMany({
      where: { id: { in: [actor.id, ...targets.map((target) => target.id)] } },
    });
  }
}

async function testStreakMilestoneOnce() {
  const yesterday = new Date(tehranDayStart().getTime() - 24 * 60 * 60 * 1000);
  const user = await createUser({ streak: 2, lastStudyDate: yesterday });
  try {
    const results = await Promise.all(
      Array.from({ length: 100 }, () => applyStreak(user.id)),
    );
    const [updatedUser, logs] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      prisma.activityLog.count({ where: { userId: user.id, type: "streak" } }),
    ]);
    assert.equal(updatedUser.streak, 3);
    assert.equal(results.filter((result) => result.milestone === 3).length, 1);
    assert.equal(logs, 1);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

async function testOnboardingCompletesOnce() {
  const user = await prisma.user.create({
    data: {
      name: "تست هم‌زمانی آنبوردینگ",
      onboardingDay: 0,
      onboardingStepMinutes: 60,
      day1GoalMinutes: 60,
      lastStudyDate: tehranDayStart(),
    },
  });
  try {
    const results = await Promise.all(
      Array.from({ length: 100 }, () => tryCompleteOnboardingDay(user.id)),
    );
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(results.filter((result) => result.dayCompleted).length, 1);
    assert.equal(updated.onboardingDay, 1);
    assert.equal(updated.onboardingStepMinutes, 0);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

async function main() {
  await testMissionRewardOnce();
  await testTournamentJoinNeverOverspends();
  await testTournamentSettlesOnce();
  await testReactionRewardOnce();
  await testStreakMilestoneOnce();
  await testOnboardingCompletesOnce();
  console.log("✅ economy concurrency tests passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
