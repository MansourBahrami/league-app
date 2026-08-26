import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const REASONS = new Set(["نامناسب", "مزاحمت", "تقلب", "جعل هویت", "سایر"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (id === session.userId || !REASONS.has(body.reason) || (body.details && typeof body.details !== "string")) {
    return NextResponse.json({ error: "گزارش نامعتبر است" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });

  await prisma.userReport.create({
    data: {
      reporterId: session.userId,
      targetUserId: id,
      reason: body.reason,
      details: body.details?.trim().slice(0, 500) || null,
    },
  });
  return NextResponse.json({ reported: true });
}
