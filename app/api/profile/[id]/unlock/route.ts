import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PROFILE_UNLOCK_COST, PROFILE_UNLOCK_HOURS } from "@/lib/gamification";
import { withUserLock } from "@/lib/user-lock";
import { isBlockedBetween } from "@/lib/privacy";

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

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, profilePublic: true },
  });
  if (!target || !target.profilePublic || await isBlockedBetween(session.userId, targetUserId)) {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }

  const result = await withUserLock(session.userId, async (tx) => {
    const viewer = await tx.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });
    if (!viewer) return { status: "not_found" } as const;

    const existing = await tx.profileUnlock.findUnique({
      where: { viewerId_targetUserId: { viewerId: session.userId, targetUserId } },
    });
    const now = new Date();
    if (existing && existing.expiresAt > now) {
      return { status: "owned", expiresAt: existing.expiresAt } as const;
    }

    const debit = await tx.user.updateMany({
      where: { id: session.userId, coins: { gte: PROFILE_UNLOCK_COST } },
      data: { coins: { decrement: PROFILE_UNLOCK_COST } },
    });
    if (debit.count !== 1) return { status: "insufficient" } as const;

    const expiresAt = new Date(
      now.getTime() + PROFILE_UNLOCK_HOURS * 60 * 60 * 1000,
    );
    await tx.profileUnlock.upsert({
      where: { viewerId_targetUserId: { viewerId: session.userId, targetUserId } },
      update: { expiresAt, createdAt: now },
      create: { viewerId: session.userId, targetUserId, expiresAt },
    });
    return { status: "purchased", expiresAt } as const;
  });

  if (result.status === "not_found") {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }
  if (result.status === "insufficient") {
    return NextResponse.json({ error: "سکه کافی نیست" }, { status: 400 });
  }
  return NextResponse.json({
    message: result.status === "owned" ? "قبلاً باز شده" : "لاگ مطالعه باز شد",
    expiresAt: result.expiresAt,
  });
}
