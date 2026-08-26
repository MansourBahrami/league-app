import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getVideoUnlockMode, setVideoUnlockMode, type VideoUnlockMode } from "@/lib/settings";
import { recordAdminAudit } from "@/lib/admin-audit";

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
  await recordAdminAudit({ adminUserId: admin.userId, action: "settings.video_unlock_mode", request: req, targetType: "setting", targetId: "videoUnlockMode", metadata: { value: updatedMode } });
  return NextResponse.json({ videoUnlockMode: updatedMode });
}
