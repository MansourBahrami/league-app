import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listInbox, getUnreadCount } from "@/lib/inbox";

/** فهرست صندوق + تعداد نخوانده‌ها */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [items, unread] = await Promise.all([
    listInbox(session.userId),
    getUnreadCount(session.userId),
  ]);

  return NextResponse.json({ items, unread });
}
