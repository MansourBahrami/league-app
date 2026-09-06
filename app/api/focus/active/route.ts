import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getActiveFocusCount, getActiveFocusSnapshot } from "@/lib/focus";
import { createServerTiming } from "@/lib/server-timing";

export async function GET(req: Request) {
  const timing = createServerTiming();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  timing.mark("auth");

  if (new URL(req.url).searchParams.get("summary") === "1") {
    const count = await getActiveFocusCount();
    timing.mark("focus_snapshot");
    return NextResponse.json(
      { count, updatedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "private, max-age=5",
          "Server-Timing": timing.header(),
        },
      },
    );
  }

  const snapshot = await getActiveFocusSnapshot();
  timing.mark("focus_snapshot");
  return NextResponse.json(
    { count: snapshot.users.length, ...snapshot },
    {
      headers: {
        "Cache-Control": "no-store",
        "Server-Timing": timing.header(),
      },
    },
  );
}
