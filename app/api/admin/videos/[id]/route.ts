import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { parseVideoBody } from "@/lib/video-admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const data = parseVideoBody(await req.json());
  if (!data.title || !data.hlsUrl) {
    return NextResponse.json({ error: "عنوان و آدرس ویدیو الزامی است" }, { status: 400 });
  }

  const video = await prisma.video.update({ where: { id }, data });
  return NextResponse.json(video);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.videoProgress.deleteMany({ where: { videoId: id } });
  await prisma.video.delete({ where: { id } });
  return NextResponse.json({ message: "حذف شد" });
}
