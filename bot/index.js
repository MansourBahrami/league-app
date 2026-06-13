/**
 * سرویس ربات تلگرام (Magic Link) — فاز ۲۵.
 *
 * سرویس Node.js مجزا از اپ اصلی. با long-polling کار می‌کند (بدون نیاز به webhook عمومی
 * برای شروع). هنگام /start یک Magic Link از اپ اصلی می‌گیرد و برای کاربر می‌فرستد.
 *
 * اجرا: `npm install && node index.js` (متغیرهای bot/.env را تنظیم کنید).
 *
 * توجه: این سرویس عمداً بیرون از اپ Next.js است و در این محیط توسعه اجرا/تست نمی‌شود؛
 * هنگام استقرار روی سرور با توکن واقعی ربات اجرا می‌شود.
 */
import "dotenv/config";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const BOT_API_SECRET = process.env.BOT_API_SECRET;

if (!TELEGRAM_BOT_TOKEN || !BOT_API_SECRET) {
  console.error("TELEGRAM_BOT_TOKEN و BOT_API_SECRET الزامی است.");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function getMagicLink(user) {
  const res = await fetch(`${APP_URL}/api/bot/magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${BOT_API_SECRET}` },
    body: JSON.stringify({
      messenger: "telegram",
      messengerUserId: String(user.id),
      firstName: user.first_name,
      lastName: user.last_name,
    }),
  });
  if (!res.ok) throw new Error(`magic-link failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}

async function sendMessage(chatId, text, replyMarkup) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup, parse_mode: "HTML" }),
  });
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  if (msg.text.startsWith("/start")) {
    try {
      const url = await getMagicLink(msg.from);
      await sendMessage(
        msg.chat.id,
        "به اپ مطالعه و رقابت خوش اومدی! 🎯\nبرای ورود روی دکمه زیر بزن:",
        { inline_keyboard: [[{ text: "🚀 ورود به اپ", url }]] }
      );
    } catch (e) {
      console.error(e);
      await sendMessage(msg.chat.id, "خطا در ساخت لینک ورود. کمی بعد دوباره /start بزن.");
    }
  }
}

let offset = 0;
async function poll() {
  try {
    const res = await fetch(`${API}/getUpdates?timeout=30&offset=${offset}`);
    const data = await res.json();
    for (const update of data.result ?? []) {
      offset = update.update_id + 1;
      await handleUpdate(update);
    }
  } catch (e) {
    console.error("poll error:", e);
    await new Promise((r) => setTimeout(r, 3000));
  }
  poll();
}

console.log("ربات تلگرام در حال اجراست (long-polling)...");
poll();
