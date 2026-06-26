import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/avatar/[id] — بایت‌های عکس پروفایلِ آپلودیِ کاربر را سرو می‌کند.
// عمومی است چون آواتارها در فید/لیدربورد برای دیگران هم نمایش داده می‌شوند.
// URL شامل ?v=<timestamp> است (در زمان آپلود ست می‌شود)، پس می‌توان immutable کش کرد.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
