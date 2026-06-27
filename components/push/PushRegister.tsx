"use client";

import { useEffect } from "react";

/**
 * ثبت Service Worker و اشتراک Web Push.
 * بی‌صدا اجرا می‌شود: اگر کاربر قبلاً اجازه داده باشد، اشتراک را تازه می‌کند؛
 * در غیر این صورت کاری نمی‌کند (درخواست اجازه از طریق دکمه‌ی صریح در پروفایل است).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { ok: false, reason: "مرورگر از نوتیفیکیشن پشتیبانی نمی‌کند" };
  }

  // مهم: اجازه را اول و مستقیم (همان لحظه‌ی کلیک) بگیر تا prompt مرورگر حتماً
  // ظاهر شود. قبلاً اگر PushManager پشتیبانی نمی‌شد، پیش از درخواست اجازه return
  // می‌کرد و prompt اصلاً نمی‌آمد.
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return { ok: false, reason: "درخواست اجازه ناموفق بود" };
  }
  if (permission !== "granted") return { ok: false, reason: "اجازه داده نشد" };

  // اشتراک Web Push فقط روی مرورگرهایی که پشتیبانی می‌کنند
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "مرورگر از Web Push پشتیبانی نمی‌کند" };
  }
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) return { ok: false, reason: "کلید نوتیفیکیشن پیکربندی نشده" };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    }));

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  return { ok: true };
}

export default function PushRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // فقط SW را ثبت کن و اگر اجازه از قبل داده شده، اشتراک را تازه کن (بدون prompt)
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (Notification.permission === "granted") {
      enablePush().catch(() => {});
    }
  }, []);

  return null;
}
