import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcRewards } from "@/lib/gamification";
import { broadcastActivity } from "@/app/api/feed/stream/route";
import { processUserMissions, recalcUserLevel } from "@/lib/mission";
import { getOnboardingState, tryCompleteOnboardingDay } from "@/lib/onboarding";
import { applyStreak } from "@/lib/streak";
import { fireEvent } from "@/lib/notification-engine";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const studySession = await prisma.studySession.findUnique({
    where: { id: sessionId, userId: session.userId },
  });
  if (!studySession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // جلسه‌ای که قبلاً بسته شده دوباره پاداش نمی‌گیرد (ضد تقلب end دوباره)
  if (studySession.endTime) {
    return NextResponse.json({ error: "Session already ended", alreadyEnded: true }, { status: 409 });
  }

  const endTime = new Date();
  const now = endTime.getTime();

  // مدت واقعی = زمان سپری‌شده منهای کل زمان pause (سمت سرور). سقف = مدت انتخابی تایمر.
  const pausedMs =
    studySession.pausedSec * 1000 +
    (studySession.pausedAt ? Math.max(0, now - studySession.pausedAt.getTime()) : 0);
  let durationMin = Math.floor((now - studySession.startTime.getTime() - pausedMs) / 60000);
  if (studySession.plannedMin > 0) durationMin = Math.min(durationMin, studySession.plannedMin);
  durationMin = Math.max(0, durationMin);

  // پاداش نهایی = استحقاق کل منهای آنچه در tickها قبلاً پرداخت شده (جلوگیری از پاداش دوباره)
  const { xp: totalXp, coins: totalCoins } = calcRewards(durationMin);
  const xp = Math.max(0, totalXp - studySession.tickCount);
  const coins = Math.max(0, totalCoins - studySession.tickCount);

  const userBefore = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isLeadComplete: true },
  });
  if (!userBefore) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // وضعیت آنبوردینگ پیش از اعمال این جلسه (برای گزارش هدف/باقیمانده)
  const stateBefore = await getOnboardingState(session.userId);
  const inOnboarding = stateBefore?.inOnboarding ?? false;

  await prisma.$transaction([
    prisma.studySession.update({
      where: { id: sessionId },
      data: {
        endTime,
        durationMin,
        xpEarned: xp + studySession.tickCount,
        coinsEarned: coins + studySession.tickCount,
        pausedAt: null,
      },
    }),
    prisma.user.update({
      where: { id: session.userId },
      data: {
        xp: { increment: xp },
        coins: { increment: coins },
        // پیشرفت روز جاری آنبوردینگ: دقایق انباشته (پیوسته، نه تقویمی)
        ...(inOnboarding ? { onboardingStepMinutes: { increment: durationMin } } : {}),
      },
    }),
  ]);

  // استریک (زنجیره روزهای متوالی) — ممکن است رویداد فید streak ثبت کند
  const streakResult = await applyStreak(session.userId);

  const activityUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, avatarUrl: true },
  });
  const log = await prisma.activityLog.create({
    data: { userId: session.userId, type: "session_complete", metadata: { durationMin, xp, coins } },
  });
  broadcastActivity({ ...log, user: activityUser });

  // تریگر رویدادی: قانون‌های نوتیفیکیشن مربوط به پایان جلسه مطالعه
  await fireEvent("session_complete", session.userId, { durationMin, xp, coins, streak: streakResult.streak });

  // تلاش برای تکمیل روز آنبوردینگ (دقیقه‌ها + ویدیو). ویدیوی روز را در صورت پر شدن دقیقه‌ها باز می‌کند.
  let dayCompleted = false;
  if (inOnboarding) {
    const res = await tryCompleteOnboardingDay(session.userId);
    dayCompleted = res.dayCompleted;
  }

  // بررسی تکمیل/انقضای ماموریت‌ها + محاسبه مجدد سطح
  await processUserMissions(session.userId);
  await recalcUserLevel(session.userId);

  // وضعیت به‌روز پس از همه تغییرات
  const stateAfter = await getOnboardingState(session.userId);
  const newOnboardingDay = stateAfter?.currentDay ? stateAfter.currentDay - 1 : 0;

  // ویدیوی پاداش روز: باز شده ولی هنوز دیده نشده (مرتبط با روزی که الان کامل شد یا روز جاری)
  const rewardVideo =
    stateAfter?.video && stateAfter.videoUnlocked && !stateAfter.videoWatched
      ? { id: stateAfter.video.id, title: stateAfter.video.title }
      : null;

  // نیاز به تماشای ویدیو برای تکمیل روز (دقیقه‌ها کامل ولی ویدیو دیده نشده)
  const needsVideo = !!(stateAfter?.video && stateAfter.minutesDone && !stateAfter.videoWatched && stateAfter.inOnboarding);

  const tomorrowGoalMinutes = stateAfter?.inOnboarding ? stateAfter.goalMinutes : 0;

  // لید پس از تکمیل ماموریت روز اول و قبل از ویدیوی جایزه (طبق PRD)
  const needsLeadCapture = dayCompleted && newOnboardingDay === 1 && !userBefore.isLeadComplete;

  return NextResponse.json({
    xpEarned: xp,
    coinsEarned: coins,
    durationMin,
    dayCompleted,
    onboardingDay: newOnboardingDay,
    inOnboarding,
    dailyGoalMinutes: stateBefore?.goalMinutes ?? 0,
    stepMinutes: stateAfter?.stepMinutes ?? 0,
    remainingMinutes: Math.max(0, (stateBefore?.goalMinutes ?? 0) - (stateBefore?.stepMinutes ?? 0) - durationMin),
    needsVideo,
    needsLeadCapture,
    tomorrowGoalMinutes,
    rewardVideo,
    streak: streakResult.streak,
    streakMilestone: streakResult.milestone,
  });
}
