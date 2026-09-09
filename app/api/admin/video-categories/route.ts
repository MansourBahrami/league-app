import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordAdminAudit } from "@/lib/admin-audit";
import { invalidateVideoCatalog } from "@/lib/catalog-cache";

function parseTitle(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = parseTitle(body.title);
  if (!title || title.length > 120) {
    return NextResponse.json({ error: "عنوان دسته باید بین ۱ تا ۱۲۰ نویسه باشد" }, { status: 400 });
  }
  const duplicate = await prisma.videoCategory.findUnique({ where: { title }, select: { id: true } });
  if (duplicate) {
    return NextResponse.json({ error: "دسته‌ای با این عنوان وجود دارد" }, { status: 409 });
  }

  const category = await prisma.$transaction(async (tx) => {
    const last = await tx.videoCategory.aggregate({ _max: { sortOrder: true } });
    return tx.videoCategory.create({
      data: {
        title,
        requireSequential: body.requireSequential === true,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
      },
    });
  });
  await invalidateVideoCatalog();
  await recordAdminAudit({
    adminUserId: admin.userId,
    action: "video_category.create",
    request: req,
    targetType: "video_category",
    targetId: category.id,
    metadata: { title, requireSequential: category.requireSequential },
  });
  return NextResponse.json(category, { status: 201 });
}
