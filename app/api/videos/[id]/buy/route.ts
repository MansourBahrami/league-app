import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getVideoPrice } from "@/lib/ab";
import { withUserLock } from "@/lib/user-lock";
import { getVideoUnlockMode } from "@/lib/settings";
import { tehranDayDiff } from "@/lib/date";
import { findVideoSequenceBlocker } from "@/lib/video-sequence";

/**
 * خرید ویدیو با سکه (فقط گروه A/B «paid»).
 * قیمت بر اساس روزِ ویدیو است؛ پس از خرید ویدیو قابل تماشا می‌شود و پنجره‌ی
 * جایزه‌ی ۲× تماشای سریع (۲۴ ساعت) از همین لحظه آغاز می‌گردد.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      id: true,
      day: true,
      isActive: true,
      grades: true,
      category: {
        select: {
          requireSequential: true,
          videos: {
            where: { isActive: true, day: { gte: 0 } },
            orderBy: [{ sortOrder: "asc" }, { day: "asc" }, { id: "asc" }],
            select: { id: true, title: true, grades: true },
          },
        },
      },
    },
  });

  if (!video || !video.isActive) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  if (video.day === 0) {
    return NextResponse.json({ error: "این ویدیو بدون خرید در دسترس است" }, { status: 400 });
  }

  const price = getVideoPrice(video.day);
  const now = new Date();
  const unlockMode = await getVideoUnlockMode();
  const result = await withUserLock(session.userId, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: session.userId },
      select: { coins: true, videoAccess: true, createdAt: true, grade: true },
    });
    if (!user) return { status: "not_found" } as const;
    if (video.day < 0 || (video.grades.length > 0 && (!user.grade || !video.grades.includes(user.grade)))) {
      return { status: "not_found" } as const;
    }
    if (user.videoAccess !== "paid") return { status: "not_needed" } as const;
    const daysSinceRegistration = Math.max(
      1,
      tehranDayDiff(now, user.createdAt) + 1,
    );
    if (video.day > 0 && unlockMode !== "all" && video.day > daysSinceRegistration) {
      return { status: "locked" } as const;
    }
    if (video.category?.requireSequential) {
      const completed = await tx.videoProgress.findMany({
        where: { userId: session.userId, completed: true },
        select: { videoId: true },
      });
      const blocker = findVideoSequenceBlocker(
        video.category.videos,
        id,
        new Set(completed.map((item) => item.videoId)),
        user.grade,
      );
      if (blocker) return { status: "sequence_locked", blocker } as const;
    }

    const existing = await tx.videoProgress.findUnique({
      where: { userId_videoId: { userId: session.userId, videoId: id } },
      select: { purchasedAt: true },
    });
    if (existing?.purchasedAt) {
      return { status: "owned", coins: user.coins } as const;
    }

    const debit = await tx.user.updateMany({
      where: { id: session.userId, coins: { gte: price } },
      data: { coins: { decrement: price } },
    });
    if (debit.count !== 1) return { status: "insufficient" } as const;

    await tx.videoProgress.upsert({
      where: { userId_videoId: { userId: session.userId, videoId: id } },
      create: {
        userId: session.userId,
        videoId: id,
        purchasedAt: now,
        unlockedAt: now,
      },
      update: { purchasedAt: now, unlockedAt: now },
    });
    await tx.activityLog.create({
      data: {
        userId: session.userId,
        type: "video_buy",
        metadata: { videoId: id, day: video.day, cost: price },
        dedupeKey: `video-buy:${session.userId}:${id}`,
      },
    });
    return { status: "purchased", coins: user.coins - price } as const;
  });

  if (result.status === "not_found") return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  if (result.status === "not_needed") {
    return NextResponse.json({ error: "این حساب نیازی به خرید ویدیو ندارد" }, { status: 400 });
  }
  if (result.status === "locked") {
    return NextResponse.json({ error: "این ویدیو هنوز در دسترس نیست" }, { status: 403 });
  }
  if (result.status === "sequence_locked") {
    return NextResponse.json(
      {
        error: `اول ویدیوی «${result.blocker.title}» را حداقل تا ۹۰٪ ببین`,
        prerequisiteVideoId: result.blocker.id,
      },
      { status: 403 },
    );
  }
  if (result.status === "owned") {
    return NextResponse.json({ message: "این ویدیو قبلاً خریداری شده", alreadyOwned: true, coins: result.coins });
  }
  if (result.status === "insufficient") {
    return NextResponse.json({ error: "سکه کافی نیست" }, { status: 400 });
  }

  return NextResponse.json({ message: "ویدیو خریداری شد", price, coins: result.coins });
}
