import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidIranPhone(phone: string): boolean {
  return /^(\+98|0)?9[0-9]{9}$/.test(phone.trim());
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("98")) return "0" + digits.slice(2);
  if (digits.startsWith("9") && digits.length === 10) return "0" + digits;
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone || !isValidIranPhone(phone)) {
      return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    const normalized = normalizePhone(phone);
    const otp = generateOtp();
    const expirySeconds = parseInt(process.env.OTP_EXPIRY_SECONDS ?? "300");

    await redis.set(`otp:${normalized}`, otp, "EX", expirySeconds);
    await prisma.otpToken.upsert({
      where: { phone: normalized },
      update: { code: otp, expiresAt: new Date(Date.now() + expirySeconds * 1000) },
      create: { phone: normalized, code: otp, expiresAt: new Date(Date.now() + expirySeconds * 1000) },
    });

    // در محیط production اینجا SMS ارسال می‌شود
    if (process.env.NODE_ENV !== "production") {
      console.log(`OTP for ${normalized}: ${otp}`);
      return NextResponse.json({ message: "کد ارسال شد", _dev_otp: otp });
    }

    return NextResponse.json({ message: "کد تأیید به شماره موبایل شما ارسال شد" });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
