import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { parseTournamentBody, validateTournament } from "@/lib/tournament-admin";

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = parseTournamentBody(await req.json());
  const err = validateTournament(data);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const tournament = await prisma.tournament.create({ data });
  return NextResponse.json(tournament, { status: 201 });
}
