import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// در production نبودِ JWT_SECRET باید اپ را متوقف کند (fail-closed) — وگرنه یک رازِ
// قابل‌حدس امکان جعل سشن (از جمله ادمین) را می‌داد.
const rawJwtSecret = process.env.JWT_SECRET;
if (!rawJwtSecret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET تنظیم نشده است (در production الزامی است).");
}
const JWT_SECRET = new TextEncoder().encode(
  rawJwtSecret ?? "dev-only-insecure-secret-do-not-use-in-prod"
);

export const COOKIE_NAME = "league_session";

// سشن طولانی تا کاربر الکی خارج نشود؛ با تمدید خودکار (sliding) در proxy عملاً تا
// زمانی که کاربر فعال است باز می‌ماند.
const SESSION_DAYS = 30;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60; // ثانیه
// اگر کمتر از این مقدار تا انقضا مانده باشد، توکن دوباره صادر می‌شود.
const REFRESH_THRESHOLD_SECONDS = 15 * 24 * 60 * 60;

export interface JwtPayload {
  userId: string;
  phone: string;
  exp?: number;
  iat?: number;
}

export async function signToken(payload: { userId: string; phone: string }): Promise<string> {
  return new SignJWT({ userId: payload.userId, phone: payload.phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
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

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

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
      // در production کوکی باید secure + SameSite=None باشد تا داخل WebView مینی‌اپ
      // تلگرام/بله هم ارسال شود. در dev (http) از lax استفاده می‌کنیم.
      secure: isProd,
      sameSite: (isProd ? "none" : "lax") as "none" | "lax",
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
