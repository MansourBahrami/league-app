import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { broadcastActivity } from "@/lib/feed-broadcast";
import { tryCompleteOnboardingDay } from "@/lib/onboarding";
import {
  VIDEO_BASE_REWARD_COINS,
  VIDEO_FAST_REWARD_COINS,
  VIDEO_FAST_REWARD_HOURS,
} from "@/lib/gamification";
import { withUserLock } from "@/lib/user-lock";
import { getVideoUnlockMode } from "@/lib/settings";
import { tehranDayDiff } from "@/lib/date";
import { after } from "next/server";
import { captureServerEvent } from "@/lib/analytics-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reportedSeconds = Number.isFinite(body.watchedSeconds)
    ? Math.max(0, Math.floor(body.watchedSeconds))
    : 0;
  const unlockMode = await getVideoUnlockMode();
  const now = new Date();

  const result = await withUserLock(session.userId, async (tx) => {
    const viewer = await tx.user.findUnique({
      where: { id: session.userId },
      select: {
        videoAccess: true,
        createdAt: true,
        name: true,
        avatarUrl: true,
      },
    });
    const video = await tx.video.findUnique({
      where: { id },
      select: { day: true, durationMin: true, isActive: true },
    });
    const existing = await tx.videoProgress.findUnique({
      where: { userId_videoId: { userId: session.userId, videoId: id } },
    });
    if (!viewer || !video || !video.isActive) {
      return { status: "not_found" } as const;
    }

    const daysSinceRegistration = Math.max(
      1,
      tehranDayDiff(now, viewer.createdAt) + 1,
    );
    if (unlockMode !== "all" && video.day > daysSinceRegistration) {
      return { status: "locked" } as const;
    }
    if (viewer.videoAccess === "paid" && video.day >= 1 && !existing?.purchasedAt) {
      return { status: "purchase_required" } as const;
    }

    const totalSeconds = Math.max(0, video.durationMin * 60);
    const previousSeconds = existing?.watchedSeconds ?? 0;
    const elapsedSinceHeartbeat = existing?.lastProgressAt
      ? Math.max(0, Math.floor((now.getTime() - existing.lastProgressAt.getTime()) / 1000))
      : 10;
    // هر heartbeat حداکثر به‌اندازه زمان واقعی گذشته (+۵ ثانیه tolerance) و
    // حداکثر ۳۰ ثانیه پیشرفت می‌دهد؛ بنابراین پرش مستقیم به ۹۰٪ ممکن نیست.
    const allowedAdvance = Math.min(30, elapsedSinceHeartbeat + 5);
    const watchedSeconds = Math.min(
      totalSeconds,
      Math.max(previousSeconds, Math.min(reportedSeconds, previousSeconds + allowedAdvance)),
    );
    const completed = totalSeconds > 0 && watchedSeconds / totalSeconds >= 0.9;
    const unlockedAt = existing?.unlockedAt ?? now;

    const progress = await tx.videoProgress.upsert({
      where: { userId_videoId: { userId: session.userId, videoId: id } },
      create: {
        userId: session.userId,
        videoId: id,
        watchedSeconds,
        totalSeconds,
        completed,
        unlockedAt,
        lastProgressAt: now,
      },
      update: {
        watchedSeconds,
        totalSeconds,
        completed: existing?.completed || completed,
        unlockedAt,
        lastProgressAt: now,
      },
    });

    let reward = 0;
    let completionLog = null;
    if (completed && !progress.rewardGiven) {
      const fast =
        now.getTime() - unlockedAt.getTime() <=
        VIDEO_FAST_REWARD_HOURS * 3_600_000;
      reward = fast ? VIDEO_FAST_REWARD_COINS : VIDEO_BASE_REWARD_COINS;
      const claimed = await tx.videoProgress.updateMany({
        where: { id: progress.id, rewardGiven: false },
        data: { rewardGiven: true },
      });
      if (claimed.count === 1) {
        await tx.user.update({
          where: { id: session.userId },
          data: { coins: { increment: reward } },
        });
        completionLog = await tx.activityLog.create({
          data: {
            userId: session.userId,
            type: "video_complete",
            metadata: { videoId: id },
            dedupeKey: `video-complete:${session.userId}:${id}`,
          },
        });
      } else {
        reward = 0;
      }
    }

    return {
      status: "saved",
      completed: progress.completed || completed,
      watchedSeconds,
      totalSeconds,
      reward,
      completionLog,
      user: { name: viewer.name, avatarUrl: viewer.avatarUrl },
    } as const;
  });

  if (result.status === "not_found") {
    return NextResponse.json({ error: "ویدیو یافت نشد" }, { status: 404 });
  }
  if (result.status === "locked") {
    return NextResponse.json({ error: "این ویدیو هنوز در دسترس نیست" }, { status: 403 });
  }
  if (result.status === "purchase_required") {
    return NextResponse.json(
      { error: "ابتدا ویدیو را خریداری کنید", needsPurchase: true },
      { status: 403 },
    );
  }

  let dayCompleted = false;
  if (result.completionLog) {
    broadcastActivity({ ...result.completionLog, user: result.user });
    const onboardingResult = await tryCompleteOnboardingDay(session.userId);
    dayCompleted = onboardingResult.dayCompleted;
    after(() => captureServerEvent({
      distinctId: session.userId,
      event: "video_completed",
      properties: {
        video_id: id,
        reward_coins: result.reward,
        onboarding_day_completed: dayCompleted,
      },
      insertId: `video-completed:${session.userId}:${id}`,
    }));
  }

  return NextResponse.json({
    completed: result.completed,
    watchedSeconds: result.watchedSeconds,
    totalSeconds: result.totalSeconds,
    reward: result.reward,
    dayCompleted,
  });
}
