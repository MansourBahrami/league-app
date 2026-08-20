import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createInboxItem } from "@/lib/inbox";
import { sendPushToUser } from "@/lib/push";

const CHEERS = {
  lets_go: "بزن بریم! امروز باهم جلو می‌ریم.",
  keep_going: "عالی پیش رفتی؛ ادامه بده.",
  almost_there: "خیلی به هدفت نزدیک شدی.",
} as const;

type CheerKey = keyof typeof CHEERS;

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : "";
  const cheer = typeof body.cheer === "string" ? body.cheer as CheerKey : "lets_go";
  if (!targetUserId || !(cheer in CHEERS)) {
    return NextResponse.json({ error: "تشویق نامعتبر است" }, { status: 400 });
  }
  if (targetUserId === session.userId) {
    return NextResponse.json({ error: "برای خودت نمی‌تونی تشویق بفرستی" }, { status: 400 });
  }

  const members = await prisma.missionRoomMember.count({
    where: { roomId, userId: { in: [session.userId, targetUserId] } },
  });
  if (members !== 2) return NextResponse.json({ error: "عضو این کمپ نیستید" }, { status: 403 });

  const cooldownStart = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.inboxItem.findFirst({
    where: {
      type: "room_cheer",
      userId: targetUserId,
      actorId: session.userId,
      createdAt: { gte: cooldownStart },
    },
    select: { id: true },
  });
  if (recent) {
    return NextResponse.json({ error: "تا یک ساعت دیگه دوباره می‌تونی تشویقش کنی" }, { status: 429 });
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });
  const message = CHEERS[cheer];
  await createInboxItem({
    userId: targetUserId,
    type: "room_cheer",
    actorId: session.userId,
    body: message,
    metadata: { roomId, cheer },
  });
  await sendPushToUser(targetUserId, {
    title: `تشویق از ${actor?.name ?? "هم‌کمپی‌ات"}`,
    body: message,
    url: `/mission-rooms/${roomId}`,
    tag: `room-cheer-${roomId}`,
  });

  return NextResponse.json({ message: "تشویقت ارسال شد" });
}
