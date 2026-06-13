"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EVENTS, SEGMENT_MAP } from "@/lib/notification-rules";

export interface RuleListItem {
  id: string;
  name: string;
  enabled: boolean;
  channels: string[];
  triggerType: string;
  triggerConfig: unknown;
  segment: string | null;
  sentCount: number;
  lastRunAt: string | null;
}

const TRIGGER_LABELS: Record<string, string> = {
  scheduled: "زمان‌بندی‌شده",
  relative: "نسبت به هدف",
  event: "رویدادی",
};
const CHANNEL_LABELS: Record<string, string> = { bale: "بله", push: "مرورگر" };

function triggerSummary(item: RuleListItem): string {
  const cfg = (item.triggerConfig ?? {}) as Record<string, unknown>;
  if (item.triggerType === "scheduled") {
    const h = Number(cfg.hour ?? 0).toLocaleString("fa-IR", { minimumIntegerDigits: 2 });
    const m = Number(cfg.minute ?? 0).toLocaleString("fa-IR", { minimumIntegerDigits: 2 });
    return `هر روز ساعت ${h}:${m}`;
  }
  if (item.triggerType === "relative") {
    return `${Number(cfg.beforeTargetMin ?? 0).toLocaleString("fa-IR")} دقیقه قبل از هدف`;
  }
  const ev = String(cfg.event ?? "");
  return EVENTS[ev as keyof typeof EVENTS] ?? "رویداد";
}

export default function NotificationList({ rules }: { rules: RuleListItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function toggle(item: RuleListItem) {
    setBusy(item.id);
    await fetch(`/api/admin/notifications/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    setBusy(null);
    router.refresh();
  }

  async function runNow(item: RuleListItem) {
    if (!confirm(`«${item.name}» همین حالا برای همه‌ی کاربران منطبق اجرا شود؟`)) return;
    setBusy(item.id);
    const res = await fetch(`/api/admin/notifications/${item.id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    setMsg(res.ok ? `«${item.name}»: ${Number(d.sent ?? 0).toLocaleString("fa-IR")} ارسال (${Number(d.matched ?? 0).toLocaleString("fa-IR")} منطبق)` : d.error ?? "خطا");
    router.refresh();
  }

  async function remove(item: RuleListItem) {
    if (!confirm(`«${item.name}» حذف شود؟`)) return;
    setBusy(item.id);
    await fetch(`/api/admin/notifications/${item.id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {msg && <p className="text-[13px] text-[#006c49] bg-[#d4f5e6] rounded-xl px-3 py-2">{msg}</p>}
      {rules.length === 0 ? (
        <p className="text-[#767586] text-center py-10">هنوز قانونی تعریف نشده.</p>
      ) : (
        rules.map((r) => (
          <div key={r.id} className="bg-white rounded-xl p-4 border border-[#c7c4d7]/30 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[15px] text-[#0b1c30]">{r.name}</p>
                  {!r.enabled && <span className="text-[11px] text-[#ba1a1a] bg-[#ffe5e5] px-2 py-0.5 rounded-full">غیرفعال</span>}
                </div>
                <p className="text-[12px] text-[#767586] mt-0.5">
                  {TRIGGER_LABELS[r.triggerType]} · {triggerSummary(r)} · {r.segment ? SEGMENT_MAP[r.segment]?.label ?? r.segment : "همه"}
                </p>
                <p className="text-[11px] text-[#a09eb0] mt-0.5">
                  کانال: {r.channels.map((c) => CHANNEL_LABELS[c] ?? c).join("، ") || "—"} · {r.sentCount.toLocaleString("fa-IR")} ارسال
                </p>
              </div>
              <button onClick={() => toggle(r)} disabled={busy === r.id}
                className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${r.enabled ? "bg-[#4648d4]" : "bg-[#c7c4d7]"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${r.enabled ? "left-0.5" : "right-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Link href={`/admin/notifications/${r.id}`} className="text-[12px] font-semibold text-[#4648d4] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">edit</span> ویرایش
              </Link>
              <button onClick={() => runNow(r)} disabled={busy === r.id} className="text-[12px] font-semibold text-[#006c49] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">play_arrow</span> اجرای فوری
              </button>
              <button onClick={() => remove(r)} disabled={busy === r.id} className="text-[12px] font-semibold text-[#ba1a1a] flex items-center gap-1 mr-auto">
                <span className="material-symbols-outlined text-[16px]">delete</span> حذف
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
