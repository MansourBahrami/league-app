import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createMagicToken } from "@/lib/magic";

/**
 * ساخت Magic Link برای ربات تلگرام/بله.
 *
 * سرویس ربات (Node.js مجزا) این endpoint را با هدر `Authorization: Bearer <BOT_API_SECRET>`
 * صدا می‌زند و شناسه‌ی پیام‌رسان کاربر را می‌فرستد. اینجا کاربر پیدا/ساخته می‌شود،
 * یک توکن یکبارمصرف ساخته می‌شود و لینک کامل ورود برمی‌گردد تا ربات برای کاربر بفرستد.
 *
 * بدنه: { messenger: "telegram"|"bale", messengerUserId: string, firstName?, lastName? }
 */
export async function POST(req: NextRequest) {
  const secret = process.env.BOT_API_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messenger, messengerUserId, firstName, lastName } = await req.json().catch(() => ({}));
  if ((messenger !== "telegram" && messenger !== "bale") || !messengerUserId) {
    return NextResponse.json({ error: "ورودی نامعتبر" }, { status: 400 });
  }

  const id = String(messengerUserId);
  const where = messenger === "telegram" ? { telegramId: id } : { baleId: id };
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;

  let user = await prisma.user.findUnique({ where });
  if (!user) {
    user = await prisma.user.create({
      data: messenger === "telegram" ? { telegramId: id, name: displayName } : { baleId: id, name: displayName },
    });
  }

  const token = await createMagicToken(user.id);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.json({ url: `${base}/api/auth/magic?token=${token}` });
}
