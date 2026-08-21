import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import { normalizePhone, normalizeDigits } from "@/lib/phone";
import { consumeOtp } from "@/lib/otp";
import { after } from "next/server";
import { captureServerEvent } from "@/lib/analytics-server";

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return NextResponse.json({ error: "شماره و کد الزامی است" }, { status: 400 });
    }

    const normalized = normalizePhone(String(phone));
    // کد ممکن است با ارقام فارسی وارد شده باشد
    const normalizedCode = normalizeDigits(String(code)).trim();
    if (!/^09[0-9]{9}$/.test(normalized) || !/^\d{6}$/.test(normalizedCode)) {
      return NextResponse.json({ error: "شماره یا کد تأیید نامعتبر است" }, { status: 400 });
    }

    const otpResult = await consumeOtp(normalized, normalizedCode);
    if (otpResult !== "valid") {
      const error = otpResult === "locked"
        ? "تعداد تلاش ناموفق زیاد بود؛ یک کد تازه بگیر"
        : "کد تأیید اشتباه یا منقضی شده است";
      return NextResponse.json({ error }, { status: 401 });
    }

    const user = await prisma.user.upsert({
      where: { phone: normalized },
      update: {},
      create: { phone: normalized },
    });

    const token = await signToken({ userId: user.id, sessionVersion: user.sessionVersion });
    const { name, value, options } = setSessionCookie(token);
    const response = NextResponse.json({
      message: "ورود موفق",
      user: { id: user.id, phone: user.phone, name: user.name, isLeadComplete: user.isLeadComplete, onboardingDay: user.onboardingDay },
    });
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    after(() => captureServerEvent({
      distinctId: user.id,
      event: "signed_in",
      insertId: `signed-in:${user.id}:${user.sessionVersion}`,
    }));
    return response;
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
