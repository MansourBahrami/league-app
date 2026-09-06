import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getActiveStudySessionSnapshot } from "@/lib/study-session";
import { createServerTiming } from "@/lib/server-timing";

export async function GET() {
  const timing = createServerTiming();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  timing.mark("auth");

  const activeSession = await getActiveStudySessionSnapshot(session.userId);
  timing.mark("study_lookup");
  return NextResponse.json(
    { activeSession },
    { headers: { "Server-Timing": timing.header() } },
  );
}
