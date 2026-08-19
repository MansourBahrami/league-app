/**
 * سرویس ربات تلگرام برای اتصال حساب پیام‌رسان به حساب موبایلی G-camp.
 *
 * سرویس Node.js مجزا از اپ اصلی. با long-polling کار می‌کند (بدون نیاز به webhook عمومی
 * برای شروع). توکن /start را به اپ اصلی می‌فرستد تا همان User موجود لینک شود.
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

async function linkAccount(user, token) {
  const res = await fetch(`${APP_URL}/api/bot/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${BOT_API_SECRET}` },
    body: JSON.stringify({
      messenger: "telegram",
      messengerUserId: String(user.id),
      token,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.result ?? `link failed: ${res.status}`);
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
    const token = msg.text.trim().split(/\s+/)[1];
    if (!token) {
      await sendMessage(msg.chat.id, "برای اتصال امن، اول وارد اپ G-camp شو و روی «اتصال به ربات» بزن.");
      return;
    }
    try {
      await linkAccount(msg.from, token);
      await sendMessage(msg.chat.id, "✅ حساب با موفقیت به G-camp متصل شد. از این به بعد یادآوری‌ها و خبرهای مهم را همین‌جا می‌فرستیم.");
    } catch (e) {
      console.error(e);
      await sendMessage(msg.chat.id, "این لینک اتصال نامعتبر، منقضی یا قبلاً استفاده شده است. از داخل اپ یک لینک تازه بگیر.");
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

console.log("ربات اتصال تلگرام در حال اجراست (long-polling)...");
poll();
