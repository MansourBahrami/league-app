/**
 * منطق مشترک پردازش پیام‌های ربات (تلگرام و بله هر دو همین را صدا می‌زنند).
 *
 * دستورات پشتیبانی‌شده:
 *   /start         → لینک magic-link + دکمه باز کردن اپ
 *   /start <token> → مصرف magic token (در صورت عدم پشتیبانی از مینی‌اپ)
 *   /link          → لینک جدید برای کاربرانی که قبلاً ثبت‌نام کرده‌اند
 *
 * ثبت‌نام از ربات:
 *   - اگر کاربر با این telegramId/baleId شناخته نشده باشد → ایجاد حساب.
 *   - سپس magic link یا دکمه مینی‌اپ می‌فرستیم.
 */

import { prisma } from "@/lib/db";
import { createMagicToken } from "@/lib/magic";
import { sendMessageWithButtons, miniAppButton, sendMessage } from "@/lib/bot";

type Messenger = "telegram" | "bale";

interface TgUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
  };
}

export async function handleBotUpdate(messenger: Messenger, update: TgUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return; // callback_query و بقیه را فعلاً نادیده می‌گیریم

  const chatId = msg.chat.id;
  const from = msg.from;
  if (!from) return;

  const messengerId = String(from.id);
  const displayName =
    [from.first_name, from.last_name].filter(Boolean).join(" ") || null;

  const text = (msg.text ?? "").trim();

  if (text.startsWith("/start") || text.startsWith("/link")) {
    await handleStart(messenger, chatId, messengerId, displayName, text);
    return;
  }

  // سایر پیام‌ها
  await sendMessage(messenger, chatId,
    "سلام! برای ورود به اپ دستور /start رو بزن."
  );
}

async function handleStart(
  messenger: Messenger,
  chatId: number,
  messengerId: string,
  displayName: string | null,
  text: string
): Promise<void> {
  const appUrl = process.env.APP_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const messengerParam = messenger === "telegram" ? "tg" : "bale";

  // پیدا کردن یا ساختن کاربر
  const where = messenger === "telegram" ? { telegramId: messengerId } : { baleId: messengerId };
  let user = await prisma.user.findUnique({ where });
  if (!user) {
    const data = messenger === "telegram"
      ? { telegramId: messengerId, name: displayName }
      : { baleId: messengerId, name: displayName };
    user = await prisma.user.create({ data });
  }

  // ساخت magic token (یکبارمصرف ۱۵ دقیقه)
  const token = await createMagicToken(user.id);
  const magicUrl = `${appUrl}/api/auth/magic?token=${token}`;
  const miniAppUrl = `${appUrl}/login?mp=${messengerParam}`;

  // پیام خوش‌آمد
  const greeting = user.name ? `سلام ${user.name} 👋` : "سلام! 👋";
  const bodyText = messenger === "telegram"
    ? `${greeting}\n\n🎮 <b>لیگ مطالعه</b> — هر دقیقه‌ای که می‌خونی XP و سکه می‌گیری!\n\n🔒 لینک ورود سریع (۱۵ دقیقه اعتبار):\n<code>${magicUrl}</code>`
    : `${greeting}\n\n🎮 لیگ مطالعه — هر دقیقه‌ای که می‌خونی XP و سکه می‌گیری!\n\nبرای ورود روی دکمه زیر بزن:`;

  const buttons = messenger === "telegram"
    ? [
        [miniAppButton("telegram", "🚀 باز کردن اپ", miniAppUrl)],
        [{ text: "🔗 لینک ورود مستقیم", url: magicUrl }],
      ]
    : [
        [{ text: "🔗 ورود به اپ", url: magicUrl }],
      ];

  await sendMessageWithButtons(messenger, chatId, bodyText, buttons);
}
