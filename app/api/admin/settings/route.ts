import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getVideoUnlockMode, setVideoUnlockMode, type VideoUnlockMode } from "@/lib/settings";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const videoUnlockMode = await getVideoUnlockMode();
  return NextResponse.json({ videoUnlockMode });
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { videoUnlockMode } = body as { videoUnlockMode?: VideoUnlockMode };

  if (videoUnlockMode && (videoUnlockMode === "all" || videoUnlockMode === "daily")) {
    await setVideoUnlockMode(videoUnlockMode);
  }

  const updatedMode = await getVideoUnlockMode();
  return NextResponse.json({ videoUnlockMode: updatedMode });
}
