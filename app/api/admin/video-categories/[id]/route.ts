import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordAdminAudit } from "@/lib/admin-audit";
import { invalidateVideoCatalog } from "@/lib/catalog-cache";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const current = await prisma.videoCategory.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "دسته یافت نشد" }, { status: 404 });

  const data: { title?: string; requireSequential?: boolean } = {};
  if ("title" in body) {
    const title = String(body.title ?? "").trim();
    if (!title || title.length > 120) {
      return NextResponse.json({ error: "عنوان دسته باید بین ۱ تا ۱۲۰ نویسه باشد" }, { status: 400 });
    }
    const duplicate = await prisma.videoCategory.findFirst({
      where: { title, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ error: "دسته‌ای با این عنوان وجود دارد" }, { status: 409 });
    data.title = title;
  }
  if ("requireSequential" in body) data.requireSequential = body.requireSequential === true;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "تغییری ارسال نشده است" }, { status: 400 });
  }

  const category = await prisma.videoCategory.update({ where: { id }, data });
  await invalidateVideoCatalog();
  await recordAdminAudit({
    adminUserId: admin.userId,
    action: "video_category.update",
    request: req,
    targetType: "video_category",
    targetId: id,
    metadata: {
      title: category.title,
      requireSequential: category.requireSequential,
    },
  });
  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const category = await prisma.videoCategory.findUnique({
    where: { id },
    select: { title: true, _count: { select: { videos: true } } },
  });
  if (!category) return NextResponse.json({ error: "دسته یافت نشد" }, { status: 404 });

  await prisma.videoCategory.delete({ where: { id } });
  await invalidateVideoCatalog();
  await recordAdminAudit({
    adminUserId: admin.userId,
    action: "video_category.delete",
    request: req,
    targetType: "video_category",
    targetId: id,
    metadata: { title: category.title, detachedVideos: category._count.videos },
  });
  return NextResponse.json({ message: "دسته حذف شد؛ ویدیوهای آن به ویدیوهای تکی منتقل شدند" });
}
