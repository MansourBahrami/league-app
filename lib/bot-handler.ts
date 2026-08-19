/**
 * منطق مشترک پردازش پیام‌های ربات (تلگرام و بله هر دو همین را صدا می‌زنند).
 *
 * دستورات پشتیبانی‌شده:
 *   /start <token> → اتصال حساب پیام‌رسان به Userی که قبلاً با موبایل وارد شده
 *   /start         → راهنمای گرفتن لینک اتصال از داخل اپ
 *
 * ربات نه User می‌سازد و نه سشن ورود صادر می‌کند.
 */

import { linkMessengerIdentity } from "@/lib/bot-link";
import { sendMessage } from "@/lib/bot";

export type Messenger = "telegram" | "bale";

export interface TgUpdate {
  update_id?: number;
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
  const text = (msg.text ?? "").trim();

  if (text.startsWith("/start")) {
    await handleStart(messenger, chatId, messengerId, text);
    return;
  }

  // سایر پیام‌ها
  await sendMessage(messenger, chatId,
    "برای اتصال ربات، داخل اپ G-camp و از بخش اتصال پیام‌رسان اقدام کن."
  );
}

async function handleStart(
  messenger: Messenger,
  chatId: number,
  messengerId: string,
  text: string
): Promise<void> {
  const token = text.trim().split(/\s+/)[1];
  if (!token) {
    await sendMessage(messenger, chatId, "برای اتصال امن، اول وارد اپ G-camp شو و روی «اتصال به ربات» بزن.");
    return;
  }

  const result = await linkMessengerIdentity(messenger, messengerId, token);
  if (result === "linked") {
    await sendMessage(messenger, chatId, "✅ حساب با موفقیت به G-camp متصل شد. از این به بعد یادآوری‌ها و خبرهای مهم را همین‌جا می‌فرستیم.");
  } else if (result === "conflict") {
    await sendMessage(messenger, chatId, "این حساب پیام‌رسان قبلاً به یک حساب دیگر متصل شده است.");
  } else {
    await sendMessage(messenger, chatId, "این لینک اتصال نامعتبر یا منقضی شده. از داخل اپ یک لینک تازه بگیر.");
  }
}
