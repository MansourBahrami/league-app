import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMissionRoomSnapshot } from "@/lib/mission-room";


export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const room = await getMissionRoomSnapshot(id, session.userId);
  if (!room) return NextResponse.json({ error: "کمپ پیدا نشد" }, { status: 404 });
  return NextResponse.json(room);
}
