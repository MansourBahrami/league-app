import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcRewards } from "@/lib/gamification";
import { broadcastActivity } from "@/app/api/feed/stream/route";
import { processUserMissions, recalcUserLevel } from "@/lib/mission";
import { getOnboardingState, tryCompleteOnboardingDay } from "@/lib/onboarding";
import { getWeeklyMissionState } from "@/lib/weekly-mission";
import { applyStreak } from "@/lib/streak";
import { fireEvent } from "@/lib/notification-engine";
import { tehranDayDiff } from "@/lib/date";
import { after } from "next/server";
import { captureServerEvent } from "@/lib/analytics-server";

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
    select: { isLeadComplete: true, lastStudyDate: true, onboardingDay: true, name: true, avatarUrl: true },
  });
  if (!userBefore) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // وضعیت آنبوردینگ پیش از اعمال این جلسه (برای گزارش هدف/باقیمانده)
  const stateBefore = await getOnboardingState(session.userId);
  const inOnboarding = stateBefore?.inOnboarding ?? false;

  // آیا این اولین جلسه‌ی امروز (به وقت تهران) است؟ هر روزِ آنبوردینگ باید در یک
  // روزِ تقویمی کامل شود؛ پس با شروع روز جدید، دقیقه‌های روزهای قبل سرریز نمی‌شوند
  // (وگرنه مطالعه‌ی پراکنده در چند روز، روزهای آنبوردینگ را اشتباهاً کامل می‌کرد).
  const startsNewTehranDay =
    !userBefore.lastStudyDate || tehranDayDiff(endTime, userBefore.lastStudyDate) >= 1;

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
        // پیشرفت روز جاری آنبوردینگ: دقیقه‌های مطالعه‌ی همین روزِ تقویمی (با شروع
        // روز جدید از نو شمرده می‌شود تا روزِ ناتمامِ قبلی سرریز نکند).
        ...(inOnboarding
          ? { onboardingStepMinutes: startsNewTehranDay ? durationMin : { increment: durationMin } }
          : {}),
      },
    }),
  ]);

  // استریک (زنجیره روزهای متوالی) — ممکن است رویداد فید streak ثبت کند
  const streakResult = await applyStreak(session.userId);

  const log = await prisma.activityLog.create({
    data: { userId: session.userId, type: "session_complete", metadata: { durationMin, xp: totalXp, coins: totalCoins } },
  });
  broadcastActivity({ ...log, user: { name: userBefore.name, avatarUrl: userBefore.avatarUrl } });

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

  let dailyGoalMinutes = 0;
  let stepMinutes = 0;
  let remainingMinutes = 0;
  let tomorrowGoalMinutes = 0;

  if (inOnboarding) {
    dailyGoalMinutes = stateAfter?.goalMinutes ?? 0;
    stepMinutes = stateAfter?.stepMinutes ?? 0;
    remainingMinutes = Math.max(0, dailyGoalMinutes - stepMinutes);
    tomorrowGoalMinutes = stateAfter?.inOnboarding ? stateAfter.goalMinutes : 0;
  } else {
    // بررسی ماموریت روزانه فعال یا تکمیل‌شده امروز
    const activeDaily = await prisma.userMission.findFirst({
      where: { userId: session.userId, status: { in: ["active", "completed"] }, mission: { kind: "daily" } },
      include: { mission: true },
      orderBy: { activatesAt: "desc" },
    });

    if (activeDaily) {
      const aggregate = await prisma.studySession.aggregate({
        where: { userId: session.userId, startTime: { gte: activeDaily.activatesAt, lt: activeDaily.expiresAt } },
        _sum: { durationMin: true },
      });
      dailyGoalMinutes = activeDaily.mission.targetHours * 60;
      stepMinutes = aggregate._sum.durationMin ?? 0;
      remainingMinutes = Math.max(0, dailyGoalMinutes - stepMinutes);
      dayCompleted = stepMinutes >= dailyGoalMinutes || activeDaily.status === "completed";
      tomorrowGoalMinutes = 0;
    } else {
      // بررسی ماموریت هفتگی
      const weekly = await getWeeklyMissionState(session.userId);
      if (weekly && !weekly.pending) {
        dailyGoalMinutes = weekly.dailyGoalMin;
        stepMinutes = weekly.dailyStudiedMin;
        remainingMinutes = Math.max(0, dailyGoalMinutes - stepMinutes);
        dayCompleted = (stepMinutes >= dailyGoalMinutes && dailyGoalMinutes > 0) || weekly.isRestDay;
        tomorrowGoalMinutes = weekly.dailyGoalMin;
      }
    }
  }

  // ویدیوی پاداش روز: باز شده ولی هنوز دیده نشده (مرتبط با روزی که الان کامل شد یا روز جاری)
  let rewardVideo =
    stateAfter?.video && stateAfter.videoUnlocked && !stateAfter.videoWatched
      ? { id: stateAfter.video.id, title: stateAfter.video.title }
      : null;

  if (!rewardVideo && dayCompleted && inOnboarding) {
    const firstVideo = await prisma.video.findFirst({
      where: { isActive: true },
      orderBy: { day: "asc" },
      select: { id: true, title: true },
    });
    if (firstVideo) {
      rewardVideo = firstVideo;
    }
  }

  // ویدیو دیگر شرط تکمیل روز نیست؛ صرفاً جایزه‌ی اختیاری است.
  const needsVideo = false;

  // تکمیل پروفایل (Lead capture): در روز دوم به بعد، اگر سشن مطالعه حداقل ۳۰ دقیقه ثبت شد و پروفایل ناقص بود
  const isAfterDay1 = userBefore.onboardingDay >= 1 || (inOnboarding && dayCompleted);
  const needsLeadCapture = isAfterDay1 && !userBefore.isLeadComplete && durationMin >= 30;

  after(async () => {
    // تریگر رویدادی: قانون‌های نوتیفیکیشن مربوط به پایان جلسه مطالعه (در پس‌زمینه بدون مسدودسازی پاسخ کاربر)
    await fireEvent("session_complete", session.userId, {
      durationMin,
      xp: totalXp,
      coins: totalCoins,
      streak: streakResult.streak,
    });

    await captureServerEvent({
      distinctId: session.userId,
      event: "study_completed",
      properties: {
        planned_minutes: studySession.plannedMin,
        verified_minutes: durationMin,
        xp_earned: totalXp,
        coins_earned: totalCoins,
        onboarding_day_completed: dayCompleted,
      },
      insertId: `study-completed:${studySession.id}`,
    });
  });

  return NextResponse.json({
    // نتیجه‌ی جلسه باید کل پاداش همان جلسه را نشان دهد؛ بخشی از آن ممکن است
    // پیش‌تر با tick پرداخت شده باشد و `xp`/`coins` فقط مانده‌ی پرداخت در end است.
    xpEarned: totalXp,
    coinsEarned: totalCoins,
    durationMin,
    dayCompleted,
    onboardingDay: newOnboardingDay,
    inOnboarding,
    dailyGoalMinutes,
    stepMinutes,
    remainingMinutes,
    needsVideo,
    needsLeadCapture,
    tomorrowGoalMinutes,
    rewardVideo,
    streak: streakResult.streak,
    streakMilestone: streakResult.milestone,
  });
}
