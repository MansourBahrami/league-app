import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, signToken, shouldRefreshToken, setSessionCookie, COOKIE_NAME } from "@/lib/auth";
import { isCrossSiteMutation } from "@/lib/request-security";

const PUBLIC_PATHS = [
  "/login",
  "/sw.js",
  "/sitemap.xml",
  "/robots.txt",
  "/blog",
  "/rules",
  "/about",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/health",
  "/api/cron/",
  "/api/bot/", // webhook و API داخلی ربات‌ها با secret مستقل احراز می‌شوند
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return true;
  return PUBLIC_PATHS.some((path) =>
    path.endsWith("/") ? pathname.startsWith(path) : pathname === path
  );
}

function attachRequestId(response: NextResponse, requestId: string) {
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const suppliedRequestId = request.headers.get("x-request-id");
  const requestId = suppliedRequestId && /^[A-Za-z0-9._:-]{8,100}$/.test(suppliedRequestId)
    ? suppliedRequestId
    : crypto.randomUUID();
  const baseHeaders = new Headers(request.headers);
  baseHeaders.set("x-request-id", requestId);

  if (pathname.startsWith("/api/") && isCrossSiteMutation(request)) {
    return attachRequestId(NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 }), requestId);
  }

  if (isPublicPath(pathname)) {
    return attachRequestId(NextResponse.next({ request: { headers: baseHeaders } }), requestId);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icon-") ||
    pathname.startsWith("/posters/") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".json")
  ) {
    return attachRequestId(NextResponse.next({ request: { headers: baseHeaders } }), requestId);
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return attachRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), requestId);
    }
    return attachRequestId(NextResponse.redirect(new URL("/login", request.url)), requestId);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return attachRequestId(response, requestId);
  }

  const requestHeaders = baseHeaders;
  requestHeaders.set("x-user-id", payload.userId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // تمدید خودکار سشن (sliding): اگر به نیمه‌ی عمر رسیده، توکن تازه صادر کن تا
  // کاربر فعال هیچ‌وقت الکی خارج نشود.
  if (shouldRefreshToken(payload)) {
    const fresh = await signToken({ userId: payload.userId, sessionVersion: payload.sessionVersion });
    const { name, value, options } = setSessionCookie(fresh);
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  }

  return attachRequestId(response, requestId);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
