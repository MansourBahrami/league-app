import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getActiveFocusCount, getActiveFocusSnapshot } from "@/lib/focus";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (new URL(req.url).searchParams.get("summary") === "1") {
    const count = await getActiveFocusCount();
    return NextResponse.json(
      { count, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "private, max-age=5" } },
    );
  }

  const snapshot = await getActiveFocusSnapshot();
  return NextResponse.json(
    { count: snapshot.users.length, ...snapshot },
    { headers: { "Cache-Control": "no-store" } }
  );
}
