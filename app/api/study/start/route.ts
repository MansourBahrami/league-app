import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { broadcastActivity } from "@/app/api/feed/stream/route";

const ALLOWED_DURATIONS = [30, 60, 90, 120];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { durationMin } = await req.json();
  const plannedMin = ALLOWED_DURATIONS.includes(durationMin) ? durationMin : 60;

  // فقط یک جلسه باز در هر لحظه: جلسات رهاشده (tab بسته، ...) بدون پاداش بسته می‌شوند
  await prisma.studySession.updateMany({
    where: { userId: session.userId, endTime: null },
    data: { endTime: new Date() },
  });

  const studySession = await prisma.studySession.create({
    data: {
      userId: session.userId,
      startTime: new Date(),
      durationMin: 0,
      plannedMin,
    },
  });

  // رویداد «فلانی تایمر ۹۰ دقیقه‌ای رو شروع کرد» در بورد زنده (طبق PRD)
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, avatarUrl: true },
  });
  const log = await prisma.activityLog.create({
    data: { userId: session.userId, type: "timer_start", metadata: { durationMin: plannedMin } },
  });
  broadcastActivity({ ...log, user });

  return NextResponse.json({ sessionId: studySession.id });
}
