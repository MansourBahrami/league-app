import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { verifyInitData, botTokenFor, type Messenger } from "@/lib/miniapp";

/**
 * احراز هویت خودکار مینی‌اپ تلگرام/بله.
 * کلاینت `initData` (و نوع پیام‌رسان) را می‌فرستد؛ اینجا اعتبارسنجی می‌شود،
 * کاربر بر اساس شناسه‌ی پیام‌رسان پیدا یا ساخته می‌شود، و سشن صادر می‌شود.
 * شماره (کلید اصلی) بعداً در lead capture گرفته می‌شود.
 */
export async function POST(req: NextRequest) {
  try {
    const { initData, messenger } = await req.json();
    if (messenger !== "telegram" && messenger !== "bale") {
      return NextResponse.json({ error: "پیام‌رسان نامعتبر" }, { status: 400 });
    }

    const botToken = botTokenFor(messenger as Messenger);
    if (!botToken) {
      return NextResponse.json({ error: "ربات این پیام‌رسان پیکربندی نشده" }, { status: 503 });
    }

    const miniUser = verifyInitData(initData, botToken);
    if (!miniUser) {
      return NextResponse.json({ error: "اعتبارسنجی initData ناموفق" }, { status: 401 });
    }

    const displayName = [miniUser.firstName, miniUser.lastName].filter(Boolean).join(" ") || null;

    // کاربر را با شناسه‌ی پیام‌رسان پیدا یا بساز
    const where = messenger === "telegram" ? { telegramId: miniUser.id } : { baleId: miniUser.id };
    let user = await prisma.user.findUnique({ where });
    if (!user) {
      const data = messenger === "telegram"
        ? { telegramId: miniUser.id, name: displayName }
        : { baleId: miniUser.id, name: displayName };
      user = await prisma.user.create({ data });
    }

    const token = await signToken({ userId: user.id, phone: user.phone ?? "" });
    const { name, value, options } = setSessionCookie(token);
    const response = NextResponse.json({
      message: "ورود موفق",
      user: { id: user.id, name: user.name, isLeadComplete: user.isLeadComplete, onboardingDay: user.onboardingDay },
    });
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch (err) {
    console.error("miniapp auth error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
