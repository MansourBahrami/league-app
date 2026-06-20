import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markAllRead } from "@/lib/inbox";

/** علامت‌گذاری همه‌ی نوتیف‌های نخوانده به‌عنوان خوانده‌شده */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await markAllRead(session.userId);
  return NextResponse.json({ ok: true, count });
}
