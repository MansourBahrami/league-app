/**
 * ثبت webhook برای تلگرام و بله.
 * اجرا: APP_PUBLIC_URL=https://xxx.serveousercontent.com npx tsx scripts/setup-webhooks.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

// بارگذاری .env.local
const envFile = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

const APP_URL = process.env.APP_PUBLIC_URL ?? "";
const SECRET = process.env.BOT_WEBHOOK_SECRET ?? "";
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const BALE_TOKEN = process.env.BALE_BOT_TOKEN ?? "";

async function setWebhook(
  name: string,
  base: string,
  token: string,
  webhookUrl: string
) {
  if (!token) { console.log(`⚠️  ${name}: توکن خالی است`); return; }
  const apiUrl = `${base}/bot${token}/setWebhook`;
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (data.ok) {
      console.log(`✅ ${name}: webhook ثبت شد → ${webhookUrl}`);
    } else {
      console.log(`❌ ${name}: ${data.description}`);
    }
  } catch (e) {
    console.log(`❌ ${name}: خطا — ${e instanceof Error ? e.message : e}`);
    console.log(`   → برای تلگرام: به VPN نیاز است یا webhook از سرور ابری ثبت کنید.`);
  }
}

async function getMe(name: string, base: string, token: string) {
  if (!token) return;
  try {
    const res = await fetch(`${base}/bot${token}/getMe`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json() as { ok: boolean; result?: { username?: string; first_name?: string } };
    if (data.ok) console.log(`  ربات ${name}: @${data.result?.username} (${data.result?.first_name})`);
  } catch { /* ignore */ }
}

(async () => {
  if (!APP_URL || APP_URL.includes("localhost")) {
    console.error("❌ APP_PUBLIC_URL باید URL عمومی tunnel باشد (نه localhost)");
    console.log("   مثال: APP_PUBLIC_URL=https://xxx.serveousercontent.com npx tsx scripts/setup-webhooks.ts");
    process.exit(1);
  }

  console.log(`\n🌐 APP_PUBLIC_URL: ${APP_URL}\n`);

  const tgWebhook = `${APP_URL}/api/bot/telegram?secret=${SECRET}`;
  const baleWebhook = `${APP_URL}/api/bot/bale?secret=${SECRET}`;

  await getMe("تلگرام", "https://api.telegram.org", TG_TOKEN);
  await getMe("بله", "https://tapi.bale.ai", BALE_TOKEN);
  console.log("");

  await setWebhook("تلگرام", "https://api.telegram.org", TG_TOKEN, tgWebhook);
  await setWebhook("بله", "https://tapi.bale.ai", BALE_TOKEN, baleWebhook);

  console.log("\n📋 URL‌های webhook:");
  console.log(`  تلگرام: ${tgWebhook}`);
  console.log(`  بله:     ${baleWebhook}`);
})();
