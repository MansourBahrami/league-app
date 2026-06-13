import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { parseTournamentBody, validateTournament } from "@/lib/tournament-admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const data = parseTournamentBody(await req.json());
  const err = validateTournament(data);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const tournament = await prisma.tournament.update({ where: { id }, data });
  return NextResponse.json(tournament);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ message: "حذف شد" });
}
