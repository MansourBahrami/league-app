import assert from "node:assert/strict";
import crypto from "node:crypto";
import { normalizePhone } from "../lib/phone";
import { botDeepLink } from "../lib/bot-link";
import { consumeOtp, deleteOtp, generateOtp, storeOtp, takeRateLimit } from "../lib/otp";
import { redis } from "../lib/redis";
import { NextRequest } from "next/server";
import { isBotWebhookAuthorized } from "../lib/bot-webhook";
import { isCrossSiteMutation } from "../lib/request-security";

async function main() {
  assert.equal(normalizePhone("۰۹۱۲ ۳۴۵ ۶۷۸۹"), "09123456789");
  assert.equal(normalizePhone("+98 912 345 6789"), "09123456789");
  for (let i = 0; i < 100; i++) assert.match(generateOtp(), /^\d{6}$/);

  process.env.TELEGRAM_BOT_USERNAME = "gcamp_test_bot";
  process.env.BALE_BOT_USERNAME = "gcamp_test_bale";
  const token = "A".repeat(43);
  assert.equal(botDeepLink("telegram", token), `https://t.me/gcamp_test_bot?start=${token}`);
  assert.equal(botDeepLink("bale", token), `https://ble.ir/gcamp_test_bale?start=${token}`);

  process.env.JWT_SECRET ??= "auth-test-secret-with-at-least-32-bytes";
  const { signToken, verifyToken } = await import("../lib/auth");
  const jwt = await signToken({ userId: "test-user", sessionVersion: 3 });
  assert.equal((await verifyToken(jwt))?.userId, "test-user");
  assert.equal((await verifyToken(jwt))?.sessionVersion, 3);
  // تغییر کاراکتر آخر base64url همیشه بایت‌های امضا را عوض نمی‌کند (padding bits).
  // یک کاراکتر میانی امضا را عوض کن تا tamper test قطعی باشد.
  const [jwtHeader, jwtPayload, jwtSignature] = jwt.split(".");
  const tamperIndex = Math.floor(jwtSignature.length / 2);
  const tamperedSignature = `${jwtSignature.slice(0, tamperIndex)}${jwtSignature[tamperIndex] === "A" ? "B" : "A"}${jwtSignature.slice(tamperIndex + 1)}`;
  assert.equal(await verifyToken(`${jwtHeader}.${jwtPayload}.${tamperedSignature}`), null);

  process.env.BOT_WEBHOOK_SECRET = "test-webhook-secret";
  assert.equal(isBotWebhookAuthorized(new NextRequest("https://gcamp.test/api/bot/bale")), false);
  assert.equal(isBotWebhookAuthorized(new NextRequest("https://gcamp.test/api/bot/bale", {
    headers: { "x-telegram-bot-api-secret-token": "test-webhook-secret" },
  })), true);

  // Next may retain localhost internally while the browser reaches dev via LAN.
  assert.equal(isCrossSiteMutation(new NextRequest("http://localhost:3000/api/auth/send-otp", {
    method: "POST",
    headers: {
      host: "192.168.10.21:3000",
      origin: "http://192.168.10.21:3000",
      "sec-fetch-site": "same-origin",
    },
  })), false);
  assert.equal(isCrossSiteMutation(new NextRequest("http://localhost:3000/api/auth/send-otp", {
    method: "POST",
    headers: {
      host: "192.168.10.21:3000",
      origin: "https://evil.example",
      "sec-fetch-site": "cross-site",
    },
  })), true);

  const { proxy } = await import("../proxy");
  const protectedResponse = await proxy(new NextRequest("https://app.gcamp.ir/dashboard"));
  assert.equal(protectedResponse.status, 307);
  assert.equal(new URL(protectedResponse.headers.get("location") ?? "", "https://app.gcamp.ir").pathname, "/login");
  const publicResponse = await proxy(new NextRequest("https://gcamp.ir/"));
  assert.equal(publicResponse.status, 200);
  assert.equal(publicResponse.headers.get("location"), null);

  const suffix = `${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
  const phoneKey = `auth-test-${suffix}`;
  const rateKey = `auth-test-rate:${suffix}`;
  try {
    await storeOtp(phoneKey, "123456", 60);
    for (let i = 0; i < 4; i++) assert.equal(await consumeOtp(phoneKey, "000000"), "invalid");
    assert.equal(await consumeOtp(phoneKey, "000000"), "locked");
    assert.equal(await consumeOtp(phoneKey, "123456"), "expired");

    await storeOtp(phoneKey, "654321", 60);
    const concurrent = await Promise.all([
      consumeOtp(phoneKey, "654321"),
      consumeOtp(phoneKey, "654321"),
    ]);
    assert.deepEqual(concurrent.sort(), ["expired", "valid"]);

    assert.equal(await takeRateLimit(rateKey, 2, 60), true);
    assert.equal(await takeRateLimit(rateKey, 2, 60), true);
    assert.equal(await takeRateLimit(rateKey, 2, 60), false);
  } finally {
    await Promise.all([deleteOtp(phoneKey), redis.del(rateKey)]);
    await redis.quit();
  }

  console.log("✅ auth tests passed");
}

main().catch(async (error) => {
  console.error(error);
  await redis.quit().catch(() => {});
  process.exit(1);
});
