import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { normalizePhone, normalizeDigits } from "@/lib/phone";
import { consumeOtp, rateLimitIdentity } from "@/lib/otp";
import { ensureVariant } from "@/lib/ab";
import { after } from "next/server";
import { captureServerEvent } from "@/lib/analytics-server";
import { recordAuthAttempt } from "@/lib/auth-attempt";
import { captureCaughtError } from "@/lib/observability";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let identityHash = rateLimitIdentity("unknown");
  try {
    const { phone, code } = await req.json();
    identityHash = rateLimitIdentity(normalizePhone(String(phone ?? "")) || String(phone ?? "invalid"));
    if (!phone || !code) {
      await recordAuthAttempt({ identityHash, action: "otp_verify", status: "failed", errorCode: "missing_fields", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
      return NextResponse.json({ error: "شماره و کد الزامی است" }, { status: 400 });
    }

    const normalized = normalizePhone(String(phone));
    // کد ممکن است با ارقام فارسی وارد شده باشد
    const normalizedCode = normalizeDigits(String(code)).trim();
    if (!/^09[0-9]{9}$/.test(normalized) || !/^\d{6}$/.test(normalizedCode)) {
      await recordAuthAttempt({ identityHash, action: "otp_verify", status: "failed", errorCode: "invalid_input", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
      return NextResponse.json({ error: "شماره یا کد تأیید نامعتبر است" }, { status: 400 });
    }

    const otpResult = await consumeOtp(normalized, normalizedCode);
    if (otpResult !== "valid") {
      const error = otpResult === "locked"
        ? "تعداد تلاش ناموفق زیاد بود؛ یک کد تازه بگیر"
        : "کد تأیید اشتباه یا منقضی شده است";
      await recordAuthAttempt({ identityHash, action: "otp_verify", status: "failed", errorCode: otpResult, durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
      return NextResponse.json({ error }, { status: 401 });
    }

    const existingUser = await prisma.user.findUnique({ where: { phone: normalized }, select: { id: true } });
    const user = await prisma.user.upsert({
      where: { phone: normalized },
      update: {},
      create: { phone: normalized },
    });

    // تخصیص A/B یک‌بار و در mutation ورود انجام می‌شود؛ render صفحات نباید write داشته باشد.
    await ensureVariant(user.id, user.videoAccess);

    const token = await signToken({ userId: user.id, sessionVersion: user.sessionVersion });
    await redis.set(`gcamp:session-version:${user.id}`, String(user.sessionVersion), "EX", 300).catch((error) => {
      captureCaughtError("auth.session_cache_prime", error, { userId: user.id });
    });
    const { name, value, options } = setSessionCookie(token);
    const response = NextResponse.json({
      message: "ورود موفق",
      user: { id: user.id, phone: user.phone, name: user.name, isLeadComplete: user.isLeadComplete, onboardingDay: user.onboardingDay },
    });
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    await recordAuthAttempt({ identityHash, action: "otp_verify", status: "succeeded", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
    after(async () => {
      await captureServerEvent({
        distinctId: user.id,
        event: "signed_in",
        insertId: `signed-in:${user.id}:${crypto.randomUUID()}`,
      });
      if (!existingUser) {
        await captureServerEvent({
          distinctId: user.id,
          event: "onboarding_started",
          insertId: `onboarding-started:${user.id}`,
        });
      }
    });
    return response;
  } catch (err) {
    captureCaughtError("auth.verify_otp", err, { requestId: req.headers.get("x-request-id") });
    await recordAuthAttempt({ identityHash, action: "otp_verify", status: "failed", errorCode: "internal_error", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
