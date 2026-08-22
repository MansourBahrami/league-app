import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// راز JWT به‌صورت lazy خوانده می‌شود تا در زمان build (که JWT_SECRET هنوز در محیط
// نیست) خطا ندهد، ولی در زمان اجرا اگر در production نبود، fail-closed شود —
// وگرنه یک رازِ قابل‌حدس امکان جعل سشن (از جمله ادمین) را می‌داد.
let cachedJwtSecret: Uint8Array | null = null;
function jwtSecret(): Uint8Array {
  if (cachedJwtSecret) return cachedJwtSecret;
  const raw = process.env.JWT_SECRET;
  if (!raw && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET تنظیم نشده است (در production الزامی است).");
  }
  cachedJwtSecret = new TextEncoder().encode(raw ?? "dev-only-insecure-secret-do-not-use-in-prod");
  return cachedJwtSecret;
}

export const COOKIE_NAME = "league_session";

// سشن طولانی تا کاربر الکی خارج نشود؛ با تمدید خودکار (sliding) در proxy عملاً تا
// زمانی که کاربر فعال است باز می‌ماند.
const SESSION_DAYS = 30;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60; // ثانیه
// اگر کمتر از این مقدار تا انقضا مانده باشد، توکن دوباره صادر می‌شود.
const REFRESH_THRESHOLD_SECONDS = 15 * 24 * 60 * 60;

export interface JwtPayload {
  userId: string;
  sessionVersion: number;
  exp?: number;
  iat?: number;
}

export async function signToken(payload: { userId: string; sessionVersion: number }): Promise<string> {
  return new SignJWT({ userId: payload.userId, sessionVersion: payload.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(jwtSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    // توکن‌های قدیمی فاقد sessionVersion تا اولین refresh با نسخه صفر پذیرفته می‌شوند.
    const sessionVersion = typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0;
    return { userId: payload.userId, sessionVersion, exp: payload.exp, iat: payload.iat };
  } catch {
    return null;
  }
}

/** آیا توکن به نیمه‌ی عمرش رسیده و باید تمدید شود؟ (برای sliding session) */
export function shouldRefreshToken(payload: JwtPayload): boolean {
  if (!payload.exp) return false;
  const remaining = payload.exp - Math.floor(Date.now() / 1000);
  return remaining < REFRESH_THRESHOLD_SECONDS;
}

export const getSession = cache(async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  // اعتبارسنجی امن نزدیک داده: logout با افزایش sessionVersion همه توکن‌های قبلی را باطل می‌کند.
  const { prisma } = await import("@/lib/db");
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { sessionVersion: true },
  });
  return user?.sessionVersion === payload.sessionVersion ? payload : null;
});

/** سشن را برمی‌گرداند فقط اگر کاربر ادمین باشد، در غیر این صورت null. */
export async function getAdminSession(): Promise<JwtPayload | null> {
  const session = await getSession();
  if (!session) return null;
  // import پویا برای جلوگیری از وابستگی حلقوی با lib/db
  const { prisma } = await import("@/lib/db");
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });
  return user?.role === "admin" ? session : null;
}

export function setSessionCookie(token: string): { name: string; value: string; options: object } {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      // ورود فقط در دامنه خود اپ انجام می‌شود؛ Lax سطح حمله CSRF را کاهش می‌دهد.
      secure: isProd,
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  };
}

export function clearSessionCookie(): { name: string; value: string; options: object } {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    },
  };
}
