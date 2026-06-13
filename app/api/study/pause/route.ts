import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/** ثبت pause سمت سرور — زمان pause از مدت جلسه و پاداش کسر می‌شود. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  await prisma.studySession.updateMany({
    where: { id: sessionId, userId: session.userId, endTime: null, pausedAt: null },
    data: { pausedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
