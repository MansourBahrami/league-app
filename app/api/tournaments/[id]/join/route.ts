import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { joinTournament } from "@/lib/tournament";
import { after } from "next/server";
import { captureServerEvent } from "@/lib/analytics-server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await joinTournament(session.userId, id);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
  after(() => captureServerEvent({
    distinctId: session.userId,
    event: "tournament_joined",
    properties: { tournament_id: id },
    insertId: `tournament-joined:${session.userId}:${id}`,
  }));
  return NextResponse.json({ ok: true });
}
