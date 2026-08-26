import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordAdminAudit } from "@/lib/admin-audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.status !== "reviewed" && body.status !== "dismissed") {
    return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
  }
  const report = await prisma.userReport.update({ where: { id }, data: { status: body.status } });
  await recordAdminAudit({ adminUserId: admin.userId, action: "user_report.update", request: req, targetType: "user_report", targetId: id, metadata: { status: body.status } });
  return NextResponse.json(report);
}
