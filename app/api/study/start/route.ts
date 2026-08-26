import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { broadcastActivity } from "@/lib/feed-broadcast";
import { after } from "next/server";
import { captureServerEvent } from "@/lib/analytics-server";
import { startStudySession } from "@/lib/study-session";

const ALLOWED_DURATIONS = [30, 60, 90, 120];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { durationMin, requestId } = await req.json();
  const plannedMin = ALLOWED_DURATIONS.includes(durationMin) ? durationMin : 60;
  const clientRequestId =
    typeof requestId === "string" && requestId.length >= 8 && requestId.length <= 100
      ? requestId
      : undefined;

  const now = new Date();
  const isLoadTest = process.env.GCAMP_LOAD_TEST_MODE === "1"
    && req.headers.get("x-gcamp-load-test") === "1";
  const { studySession, reused } = await startStudySession({
    userId: session.userId,
    plannedMin,
    clientRequestId,
    now,
  });

  if (studySession.endTime) {
    return NextResponse.json(
      { error: "Start request already belongs to a closed session", sessionEnded: true },
      { status: 409 },
    );
  }

  // رویداد «فلانی تایمر ۹۰ دقیقه‌ای رو شروع کرد» در بورد زنده (طبق PRD)
  if (!reused) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, avatarUrl: true },
    });
    const log = await prisma.activityLog.create({
      data: { userId: session.userId, type: "timer_start", metadata: { durationMin: plannedMin } },
    });
    broadcastActivity({ ...log, user });

    after(() => captureServerEvent({
      distinctId: session.userId,
      event: "study_started",
      properties: { planned_minutes: plannedMin },
      insertId: `study-started:${studySession.id}`,
      deferDelivery: isLoadTest,
    }));
  }

  return NextResponse.json({
    sessionId: studySession.id,
    startTime: studySession.startTime.getTime(),
    plannedMin: studySession.plannedMin,
    reused,
  });
}
