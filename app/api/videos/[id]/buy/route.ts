import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getVideoPrice } from "@/lib/ab";

/**
 * خرید ویدیو با سکه (فقط گروه A/B «paid»).
 * قیمت بر اساس روزِ ویدیو است؛ پس از خرید ویدیو قابل تماشا می‌شود و پنجره‌ی
 * جایزه‌ی ۲× تماشای سریع (۲۴ ساعت) از همین لحظه آغاز می‌گردد.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, video] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { coins: true, videoAccess: true, onboardingDay: true },
    }),
    prisma.video.findUnique({ where: { id }, select: { id: true, day: true, isActive: true } }),
  ]);

  if (!user || !video) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  if (user.videoAccess !== "paid") {
    return NextResponse.json({ error: "این حساب نیازی به خرید ویدیو ندارد" }, { status: 400 });
  }
  // فقط ویدیوی روز جاری یا روزهای گذشته قابل خرید است (روزهای آینده قفل)
  if (video.day > user.onboardingDay + 1) {
    return NextResponse.json({ error: "این ویدیو هنوز در دسترس نیست" }, { status: 403 });
  }

  const existing = await prisma.videoProgress.findUnique({
    where: { userId_videoId: { userId: session.userId, videoId: id } },
    select: { purchasedAt: true },
  });
  if (existing?.purchasedAt) {
    return NextResponse.json({ error: "این ویدیو قبلاً خریداری شده", alreadyOwned: true }, { status: 400 });
  }

  const price = getVideoPrice(video.day);
  if (user.coins < price) {
    return NextResponse.json({ error: "سکه کافی نیست" }, { status: 400 });
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: session.userId }, data: { coins: { decrement: price } } }),
    prisma.videoProgress.upsert({
      where: { userId_videoId: { userId: session.userId, videoId: id } },
      // unlockedAt هم ست می‌شود تا پنجره‌ی جایزه‌ی ۲× از لحظه‌ی خرید آغاز شود
      create: { userId: session.userId, videoId: id, purchasedAt: now, unlockedAt: now },
      update: { purchasedAt: now, unlockedAt: now },
    }),
    prisma.activityLog.create({
      data: { userId: session.userId, type: "video_buy", metadata: { videoId: id, day: video.day, cost: price } },
    }),
  ]);

  return NextResponse.json({ message: "ویدیو خریداری شد", price, coins: user.coins - price });
}
