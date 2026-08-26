import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resumeStudySession } from "@/lib/study-session";

/** پایان pause: مدت توقف به pausedSec اضافه و pausedAt پاک می‌شود. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const result = await resumeStudySession({
    userId: session.userId,
    sessionId,
  });
  if (result.status === "not_found") {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: result.status !== "ended",
    changed: result.status === "updated",
    state: result.status,
  }, { status: result.status === "ended" ? 409 : 200 });
}
