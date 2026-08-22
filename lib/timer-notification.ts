/**
 * ماژول مدیریت اعلان‌های زنده تایمر مطالعه در پنل نوتیفیکیشن موبایل/مرورگر
 */

export const MOTIVATIONAL_QUOTES = [
  "تمرکز امروزت، رتبه و آینده فردات رو می‌سازه ✨",
  "قدم‌های کوچیک و پیوسته، نتایج بزرگ می‌سازن 🎯",
  "تو قوی‌تر از هر بهانه‌ای هستی، متمرکز ادامه بده 💪",
  "هر دقیقه‌ای که با تمرکز می‌خونی، یه قدم به هدفت نزدیک‌تری 🚀",
  "سختی‌ها موقتی‌اند، اما افتخار موفقیت همیشگیه 🌟",
  "رویاهات ارزش این تلاش رو دارن، متمرکز بمون 🏆",
  "قهرمان‌ها تو روزهایی ساخته می‌شن که خسته‌ان اما جا نمی‌زنن 🔥",
  "تمرکز کامل یعنی بالاترین بازدهی؛ فقط روی همین درس تمرکز کن 📚",
  "نتیجهٔ تلاش‌های بی‌صدا، غوغای موفقیت خواهد بود 💫",
  "فرصت‌ها منتظر نمی‌مونن، از همین لحظه نهایت استفاده رو ببر ⏳",
];

export function getRandomMotivationalQuote(exclude?: string): string {
  const filtered = exclude
    ? MOTIVATIONAL_QUOTES.filter((q) => q !== exclude)
    : MOTIVATIONAL_QUOTES;
  const pool = filtered.length > 0 ? filtered : MOTIVATIONAL_QUOTES;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

export function formatRemainingFa(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins === 0) {
    return `${secs.toLocaleString("fa-IR")} ثانیه`;
  }
  if (secs === 0) {
    return `${mins.toLocaleString("fa-IR")} دقیقه`;
  }
  return `${mins.toLocaleString("fa-IR")}:${secs < 10 ? "۰" : ""}${secs.toLocaleString("fa-IR")}`;
}

export const TIMER_NOTIFICATION_TAG = "study-timer-active";

export type NotificationStatus = "unsupported" | "ios_browser" | "default" | "granted" | "denied";

export function getTimerNotificationStatus(): NotificationStatus {
  if (typeof window === "undefined") return "unsupported";

  // تشخیص آیفون/آی‌پد در حالتی که هنوز به صفحه اصلی افزوده نشده (PWA نیست)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;

  if (isIOS && !isStandalone && !("Notification" in window)) {
    return "ios_browser";
  }

  if (!("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission as NotificationStatus;
}

export async function requestStudyNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // ثبت سرویس ورکر در اولین فرصت
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

interface NotificationOptionsParam {
  secondsLeft: number;
  totalSeconds: number;
  state: "running" | "paused" | "done";
  quote: string;
  isInitial?: boolean;
}

export async function showOrUpdateStudyNotification({
  secondsLeft,
  state,
  quote,
  isInitial = false,
}: NotificationOptionsParam): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  let title = "";
  if (state === "running") {
    title = `⏱️ مطالعه در جریان: ${formatRemainingFa(secondsLeft)} باقی‌مانده`;
  } else if (state === "paused") {
    title = `⏸️ تایمر متوقف شد (${formatRemainingFa(secondsLeft)} مانده)`;
  } else if (state === "done") {
    title = "🎉 جلسه مطالعه با موفقیت تمام شد!";
  }

  const body = state === "done" ? "پاداش و امتیاز شما آماده است. برای مشاهده کلیک کنید." : quote;

  const fullOptions: NotificationOptions & {
    renotify?: boolean;
    silent?: boolean;
    requireInteraction?: boolean;
  } = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: TIMER_NOTIFICATION_TAG,
    dir: "rtl",
    lang: "fa",
    renotify: isInitial || state === "done",
    silent: !isInitial && state !== "done",
    data: { url: "/dashboard" },
  };

  const simpleOptions: NotificationOptions = {
    body,
    tag: TIMER_NOTIFICATION_TAG,
    icon: "/icon-192.png",
    data: { url: "/dashboard" },
  };

  // ۱. ارسال پیام مستقیم به Service Worker
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_TIMER_NOTIFICATION",
        title,
        options: fullOptions,
      });
    }
  } catch {}

  // ۲. فراخوانی روی ServiceWorkerRegistration
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        try {
          await reg.showNotification(title, fullOptions);
          return;
        } catch {
          await reg.showNotification(title, simpleOptions);
          return;
        }
      }
    } catch {}
  }

  // ۳. فال‌بک اعلان استاندارد
  try {
    new Notification(title, fullOptions);
  } catch {
    try {
      new Notification(title, simpleOptions);
    } catch {}
  }
}

export async function sendTestNotification(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined") return { ok: false, reason: "محیط نامعتبر" };

  const status = getTimerNotificationStatus();
  if (status === "ios_browser") {
    return {
      ok: false,
      reason: "در آیفون، باید اپ را از منوی اشتراک‌گذاری به صفحه اصلی اضافه کنید (Add to Home Screen).",
    };
  }

  if (status === "unsupported") {
    return { ok: false, reason: "مرورگر شما از نوتیفیکیشن پشتیبانی نمی‌کند." };
  }

  if (status === "denied") {
    return {
      ok: false,
      reason: "دسترسی نوتیفیکیشن در تنظیمات مرورگر مسدود است. لطفاً آن را روی Allow بگذارید.",
    };
  }

  const granted = await requestStudyNotificationPermission();
  if (!granted) {
    return { ok: false, reason: "اجازهٔ نمایش نوتیفیکیشن داده نشد." };
  }

  await showOrUpdateStudyNotification({
    secondsLeft: 45 * 60,
    totalSeconds: 45 * 60,
    state: "running",
    quote: getRandomMotivationalQuote(),
    isInitial: true,
  });

  return { ok: true };
}

export async function closeStudyNotification(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "CLOSE_TIMER_NOTIFICATION",
          tag: TIMER_NOTIFICATION_TAG,
        });
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.getNotifications) {
        const notifications = await reg.getNotifications({ tag: TIMER_NOTIFICATION_TAG });
        for (const n of notifications) {
          n.close();
        }
      }
    }
  } catch (err) {
    console.error("Failed to close study timer notification:", err);
  }
}
