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
import { sendMessage, sendMessageWithButtons } from "@/lib/bot";

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
  const appUrl = (process.env.APP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.gcamp.ir").replace(/\/$/, "");
  await sendMessageWithButtons(
    messenger,
    chatId,
    "برای اتصال ربات و دریافت اعلان‌ها، از داخل اپ G-camp اقدام کن.",
    [[{ text: "🚀 بازگشت به G-camp", url: `${appUrl}/dashboard` }]]
  );
}

async function handleStart(
  messenger: Messenger,
  chatId: number,
  messengerId: string,
  text: string
): Promise<void> {
  const appUrl = (process.env.APP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.gcamp.ir").replace(/\/$/, "");
  const dashboardUrl = `${appUrl}/dashboard`;

  const token = text.trim().split(/\s+/)[1];
  if (!token) {
    await sendMessageWithButtons(
      messenger,
      chatId,
      "برای اتصال امن حساب، لطفاً ابتدا وارد اپلیکیشن G-camp شو و روی «اتصال به ربات» بزن.",
      [[{ text: "🚀 ورود به G-camp", url: dashboardUrl }]]
    );
    return;
  }

  const result = await linkMessengerIdentity(messenger, messengerId, token);
  if (result === "linked") {
    const successMsg =
      `✅ <b>حساب با موفقیت به G-camp متصل شد!</b>\n\n` +
      `از این پس یادآوری‌های زمان مطالعه، وضعیت زنجیره و اخبار رقابت‌ها را همین‌جا برات می‌فرستیم.\n\n` +
      `👇 برای ادامه، روی دکمه زیر بزن و به اپلیکیشن برگرد:`;
    await sendMessageWithButtons(messenger, chatId, successMsg, [
      [{ text: "🚀 بازگشت به اپلیکیشن", url: dashboardUrl }],
    ]);
  } else if (result === "conflict") {
    await sendMessage(
      messenger,
      chatId,
      "⚠️ این حساب پیام‌رسان قبلاً به یک حساب کاربری دیگر در G-camp متصل شده است."
    );
  } else {
    const expiredMsg =
      `❌ این لینک اتصال نامعتبر یا منقضی شده است.\n` +
      `لطفاً از داخل اپلیکیشن G-camp یک لینک تازه دریافت کن:`;
    await sendMessageWithButtons(messenger, chatId, expiredMsg, [
      [{ text: "ورود به G-camp", url: dashboardUrl }],
    ]);
  }
}
