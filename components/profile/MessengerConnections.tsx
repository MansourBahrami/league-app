"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { captureClientError } from "@/lib/analytics-client";

type Messenger = "telegram" | "bale";

interface Props {
  connected: { telegram: boolean; bale: boolean };
  available: { telegram: boolean; bale: boolean };
}

export default function MessengerConnections({ connected: initialConnected, available }: Props) {
  const router = useRouter();
  const [connected, setConnected] = useState(initialConnected);
  const [loading, setLoading] = useState<Messenger | null>(null);
  const [error, setError] = useState("");

  const checkConnectionStatus = useCallback(async () => {
    const res = await fetch("/api/profile/bot-link", { cache: "no-store" }).catch((caught) => {
      captureClientError("messenger_connections.status", caught);
      return null;
    });
    if (!res?.ok) return;
    const data = (await res.json()) as { telegram?: boolean; bale?: boolean };
    setConnected({
      telegram: Boolean(data.telegram),
      bale: Boolean(data.bale),
    });
    if (data.telegram || data.bale) {
      setLoading(null);
      router.refresh();
    }
  }, [router]);

  // وقتی کاربر از ربات به مرورگر برمی‌گردد
  useEffect(() => {
    const onReturn = () => {
      void checkConnectionStatus();
      // بازگرداندن دکمه از حالت درحال اتصال به حالت عادی اگر کاربر برگشته
      window.setTimeout(() => {
        setLoading(null);
      }, 1500);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onReturn();
    };

    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkConnectionStatus]);

  // پولینگ کوتاه‌مدت هنگام انتظار اتصال
  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => {
      void checkConnectionStatus();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [loading, checkConnectionStatus]);

  async function connect(messenger: Messenger) {
    setLoading(messenger);
    setError("");
    const res = await fetch("/api/profile/bot-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messenger }),
    }).catch((caught) => {
      captureClientError("messenger_connections.link", caught, { messenger });
      return null;
    });
    const data = (await res?.json().catch(() => ({}))) as { url?: string; error?: string } | undefined;
    if (!res?.ok || !data?.url) {
      setError(data?.error ?? "ساخت لینک اتصال انجام نشد.");
      setLoading(null);
      return;
    }
    window.location.assign(data.url);
  }

  const rows: { id: Messenger; label: string; icon: string }[] = [
    { id: "telegram", label: "تلگرام", icon: "send" },
    { id: "bale", label: "بله", icon: "forum" },
  ];

  return (
    <section className="glass-card rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">notifications_active</span>
        <div>
          <h3 className="text-[15px] font-bold text-on-surface">اتصال پیام‌رسان</h3>
          <p className="text-[12px] text-on-surface-variant">برای یادآوری مطالعه و خبر ماموریت‌ها</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((row) => {
          const isConnected = connected[row.id];
          const isAvailable = available[row.id];
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => connect(row.id)}
              disabled={isConnected || !isAvailable || loading !== null}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-[13px] font-bold transition-colors ${
                isConnected
                  ? "border-primary/25 bg-primary-fixed text-primary"
                  : "border-outline-variant text-on-surface hover:bg-surface-container"
              } disabled:cursor-default disabled:opacity-70`}
            >
              <span className="material-symbols-outlined text-[18px]">{isConnected ? "check_circle" : row.icon}</span>
              {isConnected ? `${row.label} متصل است` : !isAvailable ? `${row.label} غیرفعال` : loading === row.id ? "در حال اتصال…" : `اتصال ${row.label}`}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-3 text-center text-[12px] text-error">{error}</p>}
    </section>
  );
}
