import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { broadcastActivity } from "@/app/api/feed/stream/route";
import { getDay1MissionHours } from "@/lib/gamification";
import { tehranParts } from "@/lib/date";
import { ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import { after } from "next/server";
import { captureServerEvent } from "@/lib/analytics-server";

const ALLOWED_DURATIONS = [30, 60, 90, 120];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { durationMin } = await req.json();
  const plannedMin = ALLOWED_DURATIONS.includes(durationMin) ? durationMin : 60;

  const now = new Date();
  const studySession = await prisma.$transaction(async (tx) => {
    // فقط یک جلسه باز در هر لحظه: جلسات رهاشده (tab بسته، ...) بدون پاداش بسته می‌شوند
    await tx.studySession.updateMany({
      where: { userId: session.userId, endTime: null },
      data: { endTime: now },
    });

    const onboardingUser = await tx.user.findUnique({
      where: { id: session.userId },
      select: { onboardingHints: true, pastAvgStudyHours: true, day1GoalMinutes: true, onboardingDay: true },
    });
    if (!onboardingUser) throw new Error("User not found");

    const assumedPastAverage = onboardingUser.pastAvgStudyHours ?? 1.5;
    await tx.user.update({
      where: { id: session.userId },
      data: {
        hasSeenIntro: true,
        onboardingHints: [...new Set([...onboardingUser.onboardingHints, ONBOARDING_HINTS.TIMER_STARTED])],
        ...(onboardingUser.pastAvgStudyHours === null ? { pastAvgStudyHours: assumedPastAverage } : {}),
        ...(onboardingUser.onboardingDay === 0 && onboardingUser.day1GoalMinutes === null
          ? { day1GoalMinutes: getDay1MissionHours(assumedPastAverage, tehranParts(now).hour) * 60 }
          : {}),
      },
    });

    return tx.studySession.create({
      data: {
        userId: session.userId,
        startTime: now,
        durationMin: 0,
        plannedMin,
      },
    });
  });

  // رویداد «فلانی تایمر ۹۰ دقیقه‌ای رو شروع کرد» در بورد زنده (طبق PRD)
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, avatarUrl: true },
  });
  const log = await prisma.activityLog.create({
    data: { userId: session.userId, type: "timer_start", metadata: { durationMin: plannedMin } },
  });
  broadcastActivity({ ...log, user });

  after(() => captureServerEvent({
    distinctId: session.userId,
    event: "study_started",
    properties: { planned_minutes: plannedMin },
    insertId: `study-started:${studySession.id}`,
  }));

  return NextResponse.json({ sessionId: studySession.id });
}
