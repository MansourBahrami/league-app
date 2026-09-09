import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { parseVideoBody, validateVideoBody } from "@/lib/video-admin";
import { recordAdminAudit } from "@/lib/admin-audit";
import { invalidateVideoCatalog } from "@/lib/catalog-cache";

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = parseVideoBody(await req.json());
  const validationError = validateVideoBody(data);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (data.categoryId) {
    const category = await prisma.videoCategory.findUnique({ where: { id: data.categoryId }, select: { id: true } });
    if (!category) return NextResponse.json({ error: "دسته‌بندی انتخاب‌شده یافت نشد" }, { status: 400 });
  }

  const video = await prisma.$transaction(async (tx) => {
    const lastVideo = await tx.video.aggregate({
      where: { categoryId: data.categoryId },
      _max: { sortOrder: true },
    });
    return tx.video.create({
      data: {
        ...data,
        sortOrder: (lastVideo._max.sortOrder ?? 0) + 1,
      },
    });
  });
  await invalidateVideoCatalog();
  await recordAdminAudit({ adminUserId: admin.userId, action: "video.create", request: req, targetType: "video", targetId: video.id });
  return NextResponse.json(video, { status: 201 });
}
