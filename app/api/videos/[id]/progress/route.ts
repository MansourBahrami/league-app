import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { broadcastActivity } from "@/app/api/feed/stream/route";
import { tryCompleteOnboardingDay } from "@/lib/onboarding";

const BASE_REWARD = 15;
const FAST_WATCH_HOURS = 24; // تماشا در ۲۴ ساعت اول باز شدن → سکه ۲×

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { watchedSeconds, totalSeconds } = await req.json();
  const completed = totalSeconds > 0 && watchedSeconds / totalSeconds >= 0.9;

  // گروه paid: بدون خرید، پیشرفت/جایزه ثبت نمی‌شود (محافظ دوم؛ پلیر هم مسدود است)
  const [viewer, video] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { videoAccess: true } }),
    prisma.video.findUnique({ where: { id }, select: { day: true } }),
  ]);
  if (viewer?.videoAccess === "paid" && (video?.day ?? 0) >= 1) {
    const owned = await prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId: session.userId, videoId: id } },
      select: { purchasedAt: true },
    });
    if (!owned?.purchasedAt) {
      return NextResponse.json({ error: "ابتدا ویدیو را خریداری کنید", needsPurchase: true }, { status: 403 });
    }
  }

  const progress = await prisma.videoProgress.upsert({
    where: { userId_videoId: { userId: session.userId, videoId: id } },
    update: { watchedSeconds, totalSeconds, completed },
    create: { userId: session.userId, videoId: id, watchedSeconds, totalSeconds, completed },
  });

  let reward = 0;
  let dayCompleted = false;

  if (completed && !progress.rewardGiven) {
    // جایزه ۲× اگر در ۲۴ ساعت اول باز شدن دیده شده باشد
    const unlockedAt = progress.unlockedAt;
    const fast = unlockedAt && Date.now() - unlockedAt.getTime() <= FAST_WATCH_HOURS * 3600 * 1000;
    reward = fast ? BASE_REWARD * 2 : BASE_REWARD;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, avatarUrl: true },
    });
    await prisma.$transaction([
      prisma.videoProgress.update({ where: { id: progress.id }, data: { rewardGiven: true } }),
      prisma.user.update({ where: { id: session.userId }, data: { coins: { increment: reward } } }),
    ]);
    const log = await prisma.activityLog.create({
      data: { userId: session.userId, type: "video_complete", metadata: { videoId: id } },
    });
    broadcastActivity({ ...log, user: user ?? { name: null, avatarUrl: null } });

    // تماشای ویدیو ممکن است بخش دوم روز آنبوردینگ را تکمیل کند
    const res = await tryCompleteOnboardingDay(session.userId);
    dayCompleted = res.dayCompleted;
  }

  return NextResponse.json({ completed, reward, dayCompleted });
}
