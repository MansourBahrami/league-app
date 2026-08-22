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

function formatRemainingFa(seconds: number): string {
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

const TIMER_NOTIFICATION_TAG = "study-timer-active";

export async function requestStudyNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
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
    title = `⏸️ تایمر مطالعه متوقف شد (${formatRemainingFa(secondsLeft)} مانده)`;
  } else if (state === "done") {
    title = "🎉 آفرین! جلسه مطالعه با موفقیت تموم شد";
  }

  const body = state === "done" ? "پاداش و امتیاز مطالعه شما آماده است. برای مشاهده کلیک کنید." : quote;

  const options: NotificationOptions = {
    body,
    icon: "/icon.png",
    badge: "/icon.png",
    tag: TIMER_NOTIFICATION_TAG,
    dir: "rtl",
    lang: "fa",
    renotify: isInitial || state === "done",
    silent: !isInitial && state !== "done",
    requireInteraction: state === "running",
    data: { url: "/dashboard" },
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    }
    // Fallback standard notification if service worker is not active
    new Notification(title, options);
  } catch (err) {
    console.error("Failed to show study timer notification:", err);
  }
}

export async function closeStudyNotification(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
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
