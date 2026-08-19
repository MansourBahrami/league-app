import crypto from "crypto";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export type Messenger = "telegram" | "bale";

const PREFIX = "bot-link:";
const TTL_SECONDS = 15 * 60;

interface BotLinkPayload {
  userId: string;
  messenger: Messenger;
}

export async function createBotLinkToken(userId: string, messenger: Messenger): Promise<string> {
  // ۳۲ بایت در base64url برابر ۴۳ کاراکتر و زیر سقف ۶۴کاراکتری Telegram است.
  const token = crypto.randomBytes(32).toString("base64url");
  const payload: BotLinkPayload = { userId, messenger };
  await redis.set(`${PREFIX}${token}`, JSON.stringify(payload), "EX", TTL_SECONDS);
  return token;
}

async function consumeBotLinkToken(token: string, messenger: Messenger): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const raw = await redis.getdel(`${PREFIX}${token}`);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as BotLinkPayload;
    return payload.messenger === messenger && typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export function botDeepLink(messenger: Messenger, token: string): string | null {
  const rawUsername = messenger === "telegram"
    ? process.env.TELEGRAM_BOT_USERNAME
    : process.env.BALE_BOT_USERNAME;
  const username = rawUsername?.replace(/^@/, "").trim();
  if (!username) return null;
  const base = messenger === "telegram" ? "https://t.me" : "https://ble.ir";
  return `${base}/${encodeURIComponent(username)}?start=${encodeURIComponent(token)}`;
}

export type LinkMessengerResult = "linked" | "expired" | "conflict" | "user_missing";

/**
 * توکن فقط User موجود را به شناسه پیام‌رسان متصل می‌کند؛ ربات هرگز حساب جدید
 * نمی‌سازد و سشن ورود صادر نمی‌کند.
 */
export async function linkMessengerIdentity(
  messenger: Messenger,
  messengerUserId: string,
  token: string
): Promise<LinkMessengerResult> {
  const userId = await consumeBotLinkToken(token, messenger);
  if (!userId) return "expired";

  const [target, owner] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, phone: true } }),
    messenger === "telegram"
      ? prisma.user.findUnique({ where: { telegramId: messengerUserId }, select: { id: true } })
      : prisma.user.findUnique({ where: { baleId: messengerUserId }, select: { id: true } }),
  ]);
  if (!target?.phone) return "user_missing";
  if (owner && owner.id !== target.id) return "conflict";

  await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(messenger === "telegram" ? { telegramId: messengerUserId } : { baleId: messengerUserId }),
      messengerPromptDismissedAt: null,
    },
  });
  return "linked";
}
