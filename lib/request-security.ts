import type { NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

/**
 * Reject browser mutations whose Origin does not match the address the browser
 * used for this request. Comparing only with nextUrl.origin is insufficient in
 * local networks and behind reverse proxies because Next can see an internal
 * hostname such as localhost/app while the browser uses a LAN IP/public host.
 */
export function isCrossSiteMutation(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return false;

  const origin = request.headers.get("origin");
  if (!origin) {
    // Keep webhook/cron/non-browser calls possible, but honor an explicit
    // browser signal that the mutation came from another site.
    return request.headers.get("sec-fetch-site") === "cross-site";
  }

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return true;
  }

  const allowedOrigins = new Set([request.nextUrl.origin]);
  for (const configured of [process.env.APP_PUBLIC_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (!configured) continue;
    try {
      allowedOrigins.add(new URL(configured).origin);
    } catch {
      // env نامعتبر در مجموعه originهای مجاز وارد نمی‌شود.
    }
  }
  if (allowedOrigins.has(originUrl.origin)) return false;

  const requestHost = firstHeaderValue(request.headers.get("host"))?.toLowerCase();
  const forwardedProtocol = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const requestProtocol = forwardedProtocol
    ? `${forwardedProtocol.replace(/:$/, "").toLowerCase()}:`
    : request.nextUrl.protocol.toLowerCase();

  // Host شامل port است؛ بنابراین 192.168.x.x:3000 فقط به همان origin مجاز است.
  return !(
    requestHost &&
    originUrl.host.toLowerCase() === requestHost &&
    originUrl.protocol.toLowerCase() === requestProtocol
  );
}
