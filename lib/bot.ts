/**
 * کلاینت ارسال پیام ربات برای تلگرام و بله.
 *
 * هر دو پیام‌رسان از پروتکل Bot API سازگار با تلگرام استفاده می‌کنند.
 * بله endpoint: https://tapi.bale.ai/bot{token}/
 * تلگرام endpoint: https://api.telegram.org/bot{token}/
 */

type Messenger = "telegram" | "bale";

const BASE: Record<Messenger, string> = {
  telegram: "https://api.telegram.org",
  bale: "https://tapi.bale.ai",
};

function apiUrl(messenger: Messenger, method: string): string {
  const token =
    messenger === "telegram"
      ? process.env.TELEGRAM_BOT_TOKEN!
      : process.env.BALE_BOT_TOKEN!;
  return `${BASE[messenger]}/bot${token}/${method}`;
}

async function callBot(messenger: Messenger, method: string, body: object): Promise<unknown> {
  const res = await fetch(apiUrl(messenger, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as { ok: boolean; description?: string };
  if (!data.ok) {
    console.error(`[bot/${messenger}] ${method} failed:`, data.description);
  }
  return data;
}

/** ارسال متن ساده به یک چَت */
export async function sendMessage(
  messenger: Messenger,
  chatId: string | number,
  text: string,
  extra?: object
): Promise<unknown> {
  return callBot(messenger, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

/** ارسال پیام با دکمه‌های inline keyboard */
export async function sendMessageWithButtons(
  messenger: Messenger,
  chatId: string | number,
  text: string,
  buttons: { text: string; url?: string; callback_data?: string }[][]
): Promise<unknown> {
  return sendMessage(messenger, chatId, text, {
    reply_markup: { inline_keyboard: buttons },
  });
}

/** ثبت webhook (برای راه‌اندازی اولیه) */
export async function setWebhook(messenger: Messenger, url: string): Promise<unknown> {
  return callBot(messenger, "setWebhook", { url });
}

/** حذف webhook (برای تست polling) */
export async function deleteWebhook(messenger: Messenger): Promise<unknown> {
  return callBot(messenger, "deleteWebhook", { drop_pending_updates: true });
}

/** اطلاعات ربات */
export async function getMe(messenger: Messenger): Promise<unknown> {
  const res = await fetch(apiUrl(messenger, "getMe"));
  return res.json();
}

/**
 * ساخت URL دکمه «باز کردن مینی‌اپ» برای تلگرام.
 * بله از web_app_info نیز پشتیبانی می‌کند ولی تجربه ضعیف‌تری دارد —
 * برای بله فقط url ساده می‌فرستیم.
 */
export function miniAppButton(
  messenger: Messenger,
  label: string,
  appUrl: string
): { text: string; url?: string; web_app?: { url: string } } {
  if (messenger === "telegram") {
    return { text: label, web_app: { url: appUrl } };
  }
  // بله: لینک مستقیم (مینی‌اپ بله مشکل‌دار است)
  return { text: label, url: appUrl };
}
