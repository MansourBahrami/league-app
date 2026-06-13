import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/** پایان pause: مدت توقف به pausedSec اضافه و pausedAt پاک می‌شود. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const s = await prisma.studySession.findUnique({
    where: { id: sessionId, userId: session.userId },
    select: { id: true, pausedAt: true, endTime: true },
  });
  if (!s || s.endTime || !s.pausedAt) return NextResponse.json({ ok: true });

  const pausedSecDelta = Math.max(0, Math.floor((Date.now() - s.pausedAt.getTime()) / 1000));
  await prisma.studySession.updateMany({
    where: { id: s.id, pausedAt: s.pausedAt },
    data: { pausedSec: { increment: pausedSecDelta }, pausedAt: null },
  });

  return NextResponse.json({ ok: true });
}
