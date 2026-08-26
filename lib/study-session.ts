import type { StudySession } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { tehranParts } from "@/lib/date";
import { calcRewards, getDay1MissionHours } from "@/lib/gamification";
import { ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import { withUserLock } from "@/lib/user-lock";

export async function startStudySession(params: {
  userId: string;
  plannedMin: number;
  clientRequestId?: string;
  now?: Date;
}): Promise<{ studySession: StudySession; reused: boolean }> {
  const now = params.now ?? new Date();

  return withUserLock(params.userId, async (tx) => {
    if (params.clientRequestId) {
      const existing = await tx.studySession.findFirst({
        where: {
          userId: params.userId,
          clientRequestId: params.clientRequestId,
        },
      });
      if (existing) return { studySession: existing, reused: true };
    }

    // درخواست جدید نباید جلسه‌ی درحال‌اجرای دستگاه/تب دیگر را بی‌صدا ببندد.
    // همان جلسه برگردانده می‌شود و کلاینت وضعیت authoritative را بازیابی می‌کند.
    const activeSession = await tx.studySession.findFirst({
      where: { userId: params.userId, endTime: null },
      orderBy: { startTime: "desc" },
    });
    if (activeSession) return { studySession: activeSession, reused: true };

    const onboardingUser = await tx.user.findUnique({
      where: { id: params.userId },
      select: {
        onboardingHints: true,
        pastAvgStudyHours: true,
        day1GoalMinutes: true,
        onboardingDay: true,
      },
    });
    if (!onboardingUser) throw new Error("User not found");

    const assumedPastAverage = onboardingUser.pastAvgStudyHours ?? 1.5;
    await tx.user.update({
      where: { id: params.userId },
      data: {
        hasSeenIntro: true,
        onboardingHints: [
          ...new Set([
            ...onboardingUser.onboardingHints,
            ONBOARDING_HINTS.TIMER_STARTED,
          ]),
        ],
        ...(onboardingUser.pastAvgStudyHours === null
          ? { pastAvgStudyHours: assumedPastAverage }
          : {}),
        ...(onboardingUser.onboardingDay === 0 &&
        onboardingUser.day1GoalMinutes === null
          ? {
              day1GoalMinutes:
                getDay1MissionHours(
                  assumedPastAverage,
                  tehranParts(now).hour,
                ) * 60,
            }
          : {}),
      },
    });

    const studySession = await tx.studySession.create({
      data: {
        userId: params.userId,
        clientRequestId: params.clientRequestId,
        startTime: now,
        durationMin: 0,
        plannedMin: params.plannedMin,
      },
    });
    return { studySession, reused: false };
  });
}

export interface ActiveStudySessionSnapshot {
  sessionId: string;
  plannedMin: number;
  state: "running" | "paused";
  secondsLeft: number;
  elapsedSeconds: number;
  serverNow: number;
}

export async function getActiveStudySessionSnapshot(
  userId: string,
  now = new Date(),
): Promise<ActiveStudySessionSnapshot | null> {
  const studySession = await prisma.studySession.findFirst({
    where: { userId, endTime: null },
    orderBy: { startTime: "desc" },
  });
  if (!studySession) return null;

  const nowMs = now.getTime();
  const pausedMs =
    studySession.pausedSec * 1000 +
    (studySession.pausedAt
      ? Math.max(0, nowMs - studySession.pausedAt.getTime())
      : 0);
  const elapsedSeconds = Math.max(
    0,
    Math.floor((nowMs - studySession.startTime.getTime() - pausedMs) / 1000),
  );
  const totalSeconds = Math.max(0, studySession.plannedMin * 60);

  return {
    sessionId: studySession.id,
    plannedMin: studySession.plannedMin,
    state: studySession.pausedAt ? "paused" : "running",
    secondsLeft: Math.max(0, totalSeconds - elapsedSeconds),
    elapsedSeconds: Math.min(totalSeconds, elapsedSeconds),
    serverNow: nowMs,
  };
}

export type StudyTickResult =
  | { status: "not_found" }
  | { status: "closed"; granted: 0 }
  | { status: "open"; granted: number };

export async function grantStudyTick(params: {
  userId: string;
  sessionId: string;
  now?: Date;
}): Promise<StudyTickResult> {
  const now = params.now ?? new Date();

  return withUserLock(params.userId, async (tx) => {
    const studySession = await tx.studySession.findUnique({
      where: { id: params.sessionId, userId: params.userId },
    });
    if (!studySession) return { status: "not_found" };
    if (studySession.endTime) return { status: "closed", granted: 0 };

    const pausedMs =
      studySession.pausedSec * 1000 +
      (studySession.pausedAt
        ? Math.max(0, now.getTime() - studySession.pausedAt.getTime())
        : 0);
    const effectiveMin = Math.max(
      0,
      Math.floor(
        (now.getTime() - studySession.startTime.getTime() - pausedMs) / 60_000,
      ),
    );
    const capIntervals =
      studySession.plannedMin > 0
        ? Math.floor(studySession.plannedMin / 15)
        : 0;
    const entitled = Math.min(Math.floor(effectiveMin / 15), capIntervals);
    const granted = Math.max(0, entitled - studySession.tickCount);

    if (granted === 0) return { status: "open", granted: 0 };

    await tx.studySession.update({
      where: { id: studySession.id },
      data: {
        tickCount: { increment: granted },
        xpEarned: { increment: granted },
        coinsEarned: { increment: granted },
      },
    });
    await tx.user.update({
      where: { id: params.userId },
      data: {
        xp: { increment: granted },
        coins: { increment: granted },
      },
    });

    return { status: "open", granted };
  });
}

export type EndStudySessionResult =
  | { status: "not_found" }
  | { status: "already_ended" }
  | {
      status: "ended";
      studySession: StudySession;
      durationMin: number;
      totalXp: number;
      totalCoins: number;
      grantedXp: number;
      grantedCoins: number;
    };

export async function endStudySession(params: {
  userId: string;
  sessionId: string;
  inOnboarding: boolean;
  startsNewTehranDay: boolean;
  now?: Date;
}): Promise<EndStudySessionResult> {
  const now = params.now ?? new Date();

  return withUserLock(params.userId, async (tx) => {
    const studySession = await tx.studySession.findUnique({
      where: { id: params.sessionId, userId: params.userId },
    });
    if (!studySession) return { status: "not_found" };
    if (studySession.endTime) return { status: "already_ended" };

    const pausedMs =
      studySession.pausedSec * 1000 +
      (studySession.pausedAt
        ? Math.max(0, now.getTime() - studySession.pausedAt.getTime())
        : 0);
    let durationMin = Math.floor(
      (now.getTime() - studySession.startTime.getTime() - pausedMs) / 60_000,
    );
    if (studySession.plannedMin > 0) {
      durationMin = Math.min(durationMin, studySession.plannedMin);
    }
    durationMin = Math.max(0, durationMin);

    const { xp: totalXp, coins: totalCoins } = calcRewards(durationMin);
    const grantedXp = Math.max(0, totalXp - studySession.tickCount);
    const grantedCoins = Math.max(0, totalCoins - studySession.tickCount);

    const closedSession = await tx.studySession.update({
      where: { id: studySession.id },
      data: {
        endTime: now,
        durationMin,
        xpEarned: totalXp,
        coinsEarned: totalCoins,
        pausedAt: null,
      },
    });
    await tx.user.update({
      where: { id: params.userId },
      data: {
        xp: { increment: grantedXp },
        coins: { increment: grantedCoins },
        ...(params.inOnboarding
          ? {
              onboardingStepMinutes: params.startsNewTehranDay
                ? durationMin
                : { increment: durationMin },
            }
          : {}),
      },
    });

    return {
      status: "ended",
      studySession: closedSession,
      durationMin,
      totalXp,
      totalCoins,
      grantedXp,
      grantedCoins,
    };
  });
}

export type PauseStudySessionResult =
  | "updated"
  | "already_paused"
  | "ended"
  | "not_found";

export async function pauseStudySession(params: {
  userId: string;
  sessionId: string;
  now?: Date;
}): Promise<PauseStudySessionResult> {
  const now = params.now ?? new Date();

  return withUserLock(params.userId, async (tx) => {
    const studySession = await tx.studySession.findUnique({
      where: { id: params.sessionId, userId: params.userId },
      select: { id: true, endTime: true, pausedAt: true },
    });
    if (!studySession) return "not_found";
    if (studySession.endTime) return "ended";
    if (studySession.pausedAt) return "already_paused";

    await tx.studySession.update({
      where: { id: studySession.id },
      data: { pausedAt: now },
    });
    return "updated";
  });
}

export type ResumeStudySessionResult =
  | { status: "updated"; pausedSecDelta: number }
  | { status: "already_running" }
  | { status: "ended" }
  | { status: "not_found" };

export async function resumeStudySession(params: {
  userId: string;
  sessionId: string;
  now?: Date;
}): Promise<ResumeStudySessionResult> {
  const now = params.now ?? new Date();

  return withUserLock(params.userId, async (tx) => {
    const studySession = await tx.studySession.findUnique({
      where: { id: params.sessionId, userId: params.userId },
      select: { id: true, pausedAt: true, endTime: true },
    });
    if (!studySession) return { status: "not_found" };
    if (studySession.endTime) return { status: "ended" };
    if (!studySession.pausedAt) return { status: "already_running" };

    const pausedSecDelta = Math.max(
      0,
      Math.floor((now.getTime() - studySession.pausedAt.getTime()) / 1000),
    );
    await tx.studySession.update({
      where: { id: studySession.id },
      data: {
        pausedSec: { increment: pausedSecDelta },
        pausedAt: null,
      },
    });
    return { status: "updated", pausedSecDelta };
  });
}
