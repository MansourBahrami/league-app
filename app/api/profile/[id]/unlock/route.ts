import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PROFILE_UNLOCK_COST, PROFILE_UNLOCK_HOURS } from "@/lib/gamification";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id: targetUserId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (targetUserId === session.userId) {
    return NextResponse.json({ error: "نمی‌توانی لاگ خودت را بخری" }, { status: 400 });
  }

  const [viewer, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { coins: true } }),
    prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } }),
  ]);

  if (!viewer || !target) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });

  // اگر هنوز قفل فعالی دارد، نیازی به پرداخت دوباره نیست
  const existing = await prisma.profileUnlock.findUnique({
    where: { viewerId_targetUserId: { viewerId: session.userId, targetUserId } },
  });
  if (existing && existing.expiresAt > new Date()) {
    return NextResponse.json({ message: "قبلاً باز شده", expiresAt: existing.expiresAt });
  }

  if (viewer.coins < PROFILE_UNLOCK_COST) {
    return NextResponse.json({ error: "سکه کافی نیست" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + PROFILE_UNLOCK_HOURS * 60 * 60 * 1000); // ۱ ساعت

  await prisma.$transaction([
    prisma.user.update({ where: { id: session.userId }, data: { coins: { decrement: PROFILE_UNLOCK_COST } } }),
    prisma.profileUnlock.upsert({
      where: { viewerId_targetUserId: { viewerId: session.userId, targetUserId } },
      update: { expiresAt, createdAt: new Date() },
      create: { viewerId: session.userId, targetUserId, expiresAt },
    }),
  ]);

  return NextResponse.json({ message: "لاگ مطالعه باز شد", expiresAt });
}
