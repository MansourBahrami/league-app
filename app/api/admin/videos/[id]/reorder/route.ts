import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { invalidateVideoCatalog } from "@/lib/catalog-cache";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { direction?: unknown } | null;
  const direction = body?.direction;
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "جهت جابه‌جایی نامعتبر است" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const videos = await tx.video.findMany({
      orderBy: [{ sortOrder: "asc" }, { day: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      select: { id: true },
    });
    const currentIndex = videos.findIndex((video) => video.id === id);
    if (currentIndex === -1) return { status: "not_found" } as const;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= videos.length) {
      return { status: "unchanged", position: currentIndex + 1 } as const;
    }

    [videos[currentIndex], videos[targetIndex]] = [videos[targetIndex], videos[currentIndex]];
    for (let index = 0; index < videos.length; index += 1) {
      await tx.video.update({
        where: { id: videos[index].id },
        data: { sortOrder: index + 1 },
      });
    }

    return { status: "moved", position: targetIndex + 1 } as const;
  });

  if (result.status === "not_found") {
    return NextResponse.json({ error: "ویدیو یافت نشد" }, { status: 404 });
  }

  await invalidateVideoCatalog();
  if (result.status === "moved") {
    await recordAdminAudit({
      adminUserId: admin.userId,
      action: "video.reorder",
      request: req,
      targetType: "video",
      targetId: id,
      metadata: { direction, position: result.position },
    });
  }

  return NextResponse.json({ moved: result.status === "moved", position: result.position });
}
