import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pauseStudySession } from "@/lib/study-session";

/** ثبت pause سمت سرور — زمان pause از مدت جلسه و پاداش کسر می‌شود. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const result = await pauseStudySession({
    userId: session.userId,
    sessionId,
  });
  if (result === "not_found") {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: result !== "ended",
    changed: result === "updated",
    state: result,
  }, { status: result === "ended" ? 409 : 200 });
}
