import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (id === session.userId) return NextResponse.json({ error: "نمی‌توانی خودت را مسدود کنی" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: session.userId, blockedId: id } },
    update: {},
    create: { blockerId: session.userId, blockedId: id },
  });
  return NextResponse.json({ blocked: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.userBlock.deleteMany({ where: { blockerId: session.userId, blockedId: id } });
  return NextResponse.json({ blocked: false });
}
