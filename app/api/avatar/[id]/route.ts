import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isBlockedBetween } from "@/lib/privacy";

// GET /api/avatar/[id] — بایت‌های عکس پروفایلِ آپلودیِ کاربر را سرو می‌کند.
// عمومی است چون آواتارها در فید/لیدربورد برای دیگران هم نمایش داده می‌شوند.
// URL شامل ?v=<timestamp> است (در زمان آپلود ست می‌شود)، پس می‌توان immutable کش کرد.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (id !== session.userId) {
    const owner = await prisma.user.findUnique({ where: { id }, select: { profilePublic: true } });
    if (!owner?.profilePublic || await isBlockedBetween(session.userId, id)) {
      return new Response("Not found", { status: 404 });
    }
  }

  const avatar = await prisma.avatarImage.findUnique({
    where: { userId: id },
    select: { data: true, contentType: true },
  });
  if (!avatar) return new Response("Not found", { status: 404 });

  const body = new Uint8Array(avatar.data);
  return new Response(body, {
    headers: {
      "Content-Type": avatar.contentType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
