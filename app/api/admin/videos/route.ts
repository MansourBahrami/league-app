import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { parseVideoBody } from "@/lib/video-admin";

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = parseVideoBody(await req.json());
  if (!data.title || !data.hlsUrl) {
    return NextResponse.json({ error: "عنوان و آدرس ویدیو الزامی است" }, { status: 400 });
  }

  const video = await prisma.video.create({ data });
  return NextResponse.json(video, { status: 201 });
}
