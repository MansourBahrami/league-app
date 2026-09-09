import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { parseVideoBody, validateVideoBody } from "@/lib/video-admin";
import { recordAdminAudit } from "@/lib/admin-audit";
import { invalidateVideoCatalog } from "@/lib/catalog-cache";

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
  if (data.categoryId) {
    const category = await prisma.videoCategory.findUnique({ where: { id: data.categoryId }, select: { id: true } });
    if (!category) return NextResponse.json({ error: "دسته‌بندی انتخاب‌شده یافت نشد" }, { status: 400 });
  }

  const video = await prisma.$transaction(async (tx) => {
    const current = await tx.video.findUnique({ where: { id }, select: { categoryId: true } });
    if (!current) return null;
    if (current.categoryId === data.categoryId) {
      return tx.video.update({ where: { id }, data });
    }
    const lastVideo = await tx.video.aggregate({
      where: { categoryId: data.categoryId },
      _max: { sortOrder: true },
    });
    return tx.video.update({
      where: { id },
      data: { ...data, sortOrder: (lastVideo._max.sortOrder ?? 0) + 1 },
    });
  });
  if (!video) return NextResponse.json({ error: "ویدیو یافت نشد" }, { status: 404 });
  await invalidateVideoCatalog();
  await recordAdminAudit({ adminUserId: admin.userId, action: "video.update", request: req, targetType: "video", targetId: id });
  return NextResponse.json(video);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.videoProgress.deleteMany({ where: { videoId: id } });
  await prisma.video.delete({ where: { id } });
  await invalidateVideoCatalog();
  await recordAdminAudit({ adminUserId: admin.userId, action: "video.delete", request: req, targetType: "video", targetId: id });
  return NextResponse.json({ message: "حذف شد" });
}
