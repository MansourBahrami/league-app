import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { parseVideoBody, validateVideoBody } from "@/lib/video-admin";
import { recordAdminAudit } from "@/lib/admin-audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const data = parseVideoBody(await req.json());
  const validationError = validateVideoBody(data);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const video = await prisma.video.update({ where: { id }, data });
  await recordAdminAudit({ adminUserId: admin.userId, action: "video.update", request: req, targetType: "video", targetId: id });
  return NextResponse.json(video);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.videoProgress.deleteMany({ where: { videoId: id } });
  await prisma.video.delete({ where: { id } });
  await recordAdminAudit({ adminUserId: admin.userId, action: "video.delete", request: req, targetType: "video", targetId: id });
  return NextResponse.json({ message: "حذف شد" });
}
