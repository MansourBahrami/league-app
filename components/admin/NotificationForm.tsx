"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  NOTIF_CHANNELS,
  FIELDS,
  FIELD_MAP,
  SEGMENTS,
  EVENTS,
  OP_LABELS,
  TEMPLATE_VARS,
  type Op,
  type Condition,
} from "@/lib/notification-rules";

// ---------------------------------------------------------------------------
// انواع داده‌ی فرم
// ---------------------------------------------------------------------------
type TriggerType = "scheduled" | "relative" | "event";

interface RuleFormData {
  id?: string;
  name: string;
  enabled: boolean;
  channels: string[];
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  segment: string;
  conditions: Condition[];
  title: string;
  body: string;
  linkUrl: string;
  cooldownHours: number;
  quietStart: number | null;
  quietEnd: number | null;
  maxPerDay: number | null;
}

const CHANNEL_LABELS: Record<string, string> = { bale: "ربات بله", push: "اعلان مرورگر" };

const WEEKDAYS = [
  { v: 6, l: "شنبه" },
  { v: 0, l: "یکشنبه" },
  { v: 1, l: "دوشنبه" },
  { v: 2, l: "سه‌شنبه" },
  { v: 3, l: "چهارشنبه" },
  { v: 4, l: "پنجشنبه" },
  { v: 5, l: "جمعه" },
];

const EVENT_ENTRIES = Object.entries(EVENTS) as [string, string][];

const inputCls =
  "w-full rounded-xl border border-[#c7c4d7] bg-white px-4 py-2.5 text-[15px] text-[#0b1c30] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#4648d4]/20 transition-all";
const labelCls = "text-[13px] font-semibold text-[#0b1c30]";

// رندر ساده‌ی پیش‌نمایش با مقادیر نمونه
function previewText(tpl: string): string {
  const sample: Record<string, string> = {
    name: "زهرا",
    streak: "۵",
    xp: "۱٬۲۰۰",
    coins: "۳۴۰",
    level: "پیشرو",
    rank: "۳",
    dailyGoalMin: "۹۰",
    overtakenBy: "۲",
    durationMin: "۶۰",
  };
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => sample[k] ?? `{{${k}}}`);
}

export default function NotificationForm({ initial }: { initial?: RuleFormData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<RuleFormData>(
    initial ?? {
      name: "",
      enabled: true,
      channels: ["bale", "push"],
      triggerType: "scheduled",
      triggerConfig: { hour: 21, minute: 0, weekdays: [] },
      segment: "all",
      conditions: [],
      title: "",
      body: "",
      linkUrl: "/dashboard",
      cooldownHours: 24,
      quietStart: null,
      quietEnd: null,
      maxPerDay: null,
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [testMsg, setTestMsg] = useState("");

  function set<K extends keyof RuleFormData>(key: K, value: RuleFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setCfg(key: string, value: unknown) {
    setForm((f) => ({ ...f, triggerConfig: { ...f.triggerConfig, [key]: value } }));
  }

  function toggleChannel(c: string) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(c) ? f.channels.filter((x) => x !== c) : [...f.channels, c],
    }));
  }

  function changeTriggerType(t: TriggerType) {
    const defaults: Record<TriggerType, Record<string, unknown>> = {
      scheduled: { hour: 21, minute: 0, weekdays: [] },
      relative: { beforeTargetMin: 15 },
      event: { event: "session_complete" },
    };
    setForm((f) => ({ ...f, triggerType: t, triggerConfig: defaults[t] }));
  }

  // --- شرط‌ها ---
  function addCondition() {
    const first = FIELDS[0];
    setForm((f) => ({
      ...f,
      conditions: [...f.conditions, { field: first.key, op: first.ops[0], value: first.type === "boolean" ? true : "" }],
    }));
  }
  function updateCondition(i: number, patch: Partial<Condition>) {
    setForm((f) => ({ ...f, conditions: f.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
  }
  function removeCondition(i: number) {
    setForm((f) => ({ ...f, conditions: f.conditions.filter((_, idx) => idx !== i) }));
  }
  function changeConditionField(i: number, fieldKey: string) {
    const def = FIELD_MAP[fieldKey];
    updateCondition(i, { field: fieldKey, op: def.ops[0], value: def.type === "boolean" ? true : "" });
  }

  function payload() {
    return {
      ...form,
      segment: form.segment || null,
      linkUrl: form.linkUrl.trim() || null,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.title.trim() || !form.body.trim()) {
      setError("نام، عنوان و متن پیام الزامی است.");
      return;
    }
    if (!form.channels.length) {
      setError("حداقل یک کانال ارسال انتخاب کنید.");
      return;
    }
    setSaving(true);
    const url = isEdit ? `/api/admin/notifications/${initial!.id}` : "/api/admin/notifications";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    if (res.ok) {
      router.push("/admin/notifications");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "خطا در ذخیره");
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!isEdit) {
      setTestMsg("اول قانون را ذخیره کن، بعد تست بزن.");
      return;
    }
    setTestMsg("در حال ارسال تست…");
    const res = await fetch(`/api/admin/notifications/${initial!.id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setTestMsg(d.sent > 0 ? "✅ پیام تست برایت ارسال شد (بله/مرورگر)." : "ارسال نشد — احتمالاً بله را استارت نکرده‌ای یا اعلان مرورگر فعال نیست.");
    } else {
      setTestMsg(d.error ?? "خطا در ارسال تست");
    }
  }

  const cfg = form.triggerConfig;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-white rounded-2xl p-6 border border-[#c7c4d7]/30">
      <h1 className="text-[20px] font-extrabold text-[#0b1c30]">
        {isEdit ? "ویرایش قانون نوتیفیکیشن" : "قانون نوتیفیکیشن جدید"}
      </h1>

      {/* نام */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>نام قانون *</label>
        <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="مثلاً: یادآور هدف مطالعه" required />
      </div>

      {/* کانال‌ها */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>کانال‌های ارسال *</label>
        <div className="flex flex-wrap gap-2">
          {NOTIF_CHANNELS.map((c) => (
            <button key={c} type="button" onClick={() => toggleChannel(c)}
              className={`px-3 py-2 rounded-xl text-[13px] font-semibold border transition-all flex items-center gap-1 ${
                form.channels.includes(c) ? "bg-[#4648d4] text-white border-[#4648d4]" : "border-[#c7c4d7] text-[#464554] hover:bg-[#e1e0ff]"
              }`}>
              {form.channels.includes(c) && <span className="material-symbols-outlined text-[14px]">check</span>}
              {CHANNEL_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* نوع تریگر */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>چه‌وقت ارسال شود؟ (تریگر)</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["scheduled", "زمان‌بندی‌شده", "schedule"],
            ["relative", "نسبت به هدف", "timer"],
            ["event", "رویدادی", "bolt"],
          ] as const).map(([val, lbl, icon]) => (
            <button key={val} type="button" onClick={() => changeTriggerType(val)}
              className={`py-2.5 rounded-xl text-[13px] font-semibold border transition-all flex items-center justify-center gap-1 ${
                form.triggerType === val ? "bg-[#4648d4] text-white border-[#4648d4]" : "border-[#c7c4d7] text-[#464554] hover:bg-[#e1e0ff]"
              }`}>
              <span className="material-symbols-outlined text-[16px]">{icon}</span>
              {lbl}
            </button>
          ))}
        </div>

        {/* تنظیمات تریگر */}
        <div className="mt-2 rounded-xl bg-[#f8f9ff] p-3 border border-[#c7c4d7]/30">
          {form.triggerType === "scheduled" && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>ساعت (۰–۲۳)</label>
                  <input type="number" min={0} max={23} className={inputCls} value={Number(cfg.hour ?? 0)} onChange={(e) => setCfg("hour", parseInt(e.target.value) || 0)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>دقیقه (۰–۵۹)</label>
                  <input type="number" min={0} max={59} className={inputCls} value={Number(cfg.minute ?? 0)} onChange={(e) => setCfg("minute", parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>روزهای هفته (خالی = همه‌روزه)</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d) => {
                    const days = Array.isArray(cfg.weekdays) ? (cfg.weekdays as number[]) : [];
                    const on = days.includes(d.v);
                    return (
                      <button key={d.v} type="button"
                        onClick={() => setCfg("weekdays", on ? days.filter((x) => x !== d.v) : [...days, d.v])}
                        className={`px-2.5 py-1.5 rounded-lg text-[12px] font-semibold border ${on ? "bg-[#4648d4] text-white border-[#4648d4]" : "border-[#c7c4d7] text-[#464554]"}`}>
                        {d.l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {form.triggerType === "relative" && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>چند دقیقه قبل از زمان هدف مطالعه؟</label>
              <input type="number" min={0} className={inputCls} value={Number(cfg.beforeTargetMin ?? 15)} onChange={(e) => setCfg("beforeTargetMin", parseInt(e.target.value) || 0)} />
              <p className="text-[12px] text-[#767586]">برای کاربرانی که زمان شروع مطالعه‌ی فردا را تنظیم کرده‌اند.</p>
            </div>
          )}
          {form.triggerType === "event" && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>کدام رویداد؟</label>
              <select className={inputCls} value={String(cfg.event ?? "")} onChange={(e) => setCfg("event", e.target.value)}>
                {EVENT_ENTRIES.map(([k, lbl]) => (
                  <option key={k} value={k}>{lbl}</option>
                ))}
              </select>
              <p className="text-[12px] text-[#767586]">به‌محض وقوع این رویداد برای کاربر، اگر شرط‌ها برقرار باشد ارسال می‌شود.</p>
            </div>
          )}
        </div>
      </div>

      {/* مخاطب: سگمنت + شرط‌ها */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>به‌چه‌کسی؟ (سگمنت آماده)</label>
        <select className={inputCls} value={form.segment} onChange={(e) => set("segment", e.target.value)}>
          {SEGMENTS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className={labelCls}>شرط‌های سفارشی (همه باید برقرار باشند)</label>
          <button type="button" onClick={addCondition} className="text-[12px] font-semibold text-[#4648d4] flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">add</span> افزودن شرط
          </button>
        </div>
        {form.conditions.length === 0 && <p className="text-[12px] text-[#767586]">شرطی اضافه نشده؛ فقط سگمنت بالا اعمال می‌شود.</p>}
        {form.conditions.map((c, i) => {
          const def = FIELD_MAP[c.field] ?? FIELDS[0];
          return (
            <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center rounded-xl bg-[#f8f9ff] p-2 border border-[#c7c4d7]/30">
              <select className={inputCls + " !py-2 !px-2 text-[13px]"} value={c.field} onChange={(e) => changeConditionField(i, e.target.value)}>
                {FIELDS.map((f) => (<option key={f.key} value={f.key}>{f.label}</option>))}
              </select>
              <select className={inputCls + " !py-2 !px-2 text-[13px] w-auto"} value={c.op} onChange={(e) => updateCondition(i, { op: e.target.value as Op })}>
                {def.ops.map((op) => (<option key={op} value={op}>{OP_LABELS[op]}</option>))}
              </select>
              <ConditionValue def={def} cond={c} onChange={(value) => updateCondition(i, { value })} />
              <button type="button" onClick={() => removeCondition(i)} className="text-[#ba1a1a] p-1">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* پیام */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>عنوان پیام *</label>
        <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>متن پیام *</label>
        <textarea className={inputCls} rows={3} value={form.body} onChange={(e) => set("body", e.target.value)} required />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {TEMPLATE_VARS.map((v) => (
            <button key={v.key} type="button"
              onClick={() => set("body", form.body + `{{${v.key}}}`)}
              className="text-[11px] px-2 py-1 rounded-lg bg-[#e1e0ff] text-[#4648d4] font-semibold">
              {`{{${v.key}}}`} {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>لینک (هنگام کلیک)</label>
        <input className={inputCls} value={form.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} placeholder="/dashboard" dir="ltr" />
      </div>

      {/* پیش‌نمایش */}
      <div className="rounded-xl bg-[#0b1c30] text-white p-4">
        <p className="text-[11px] text-[#6cf8bb] mb-1 font-semibold">پیش‌نمایش (با مقادیر نمونه)</p>
        <p className="font-bold text-[15px]">{previewText(form.title) || "عنوان…"}</p>
        <p className="text-[13px] text-[#c7c4d7] whitespace-pre-wrap mt-1">{previewText(form.body) || "متن پیام…"}</p>
      </div>

      {/* ایمنی */}
      <div className="flex flex-col gap-3">
        <label className={labelCls}>تنظیمات ایمنی</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#464554]">فاصله‌ی ارسال مجدد (ساعت)</label>
            <input type="number" min={0} className={inputCls} value={form.cooldownHours} onChange={(e) => set("cooldownHours", parseInt(e.target.value) || 0)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#464554]">سقف در روز (خالی = نامحدود)</label>
            <input type="number" min={1} className={inputCls} value={form.maxPerDay ?? ""} onChange={(e) => set("maxPerDay", e.target.value === "" ? null : parseInt(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#464554]">شروع ساعت سکوت (خالی = بدون سکوت)</label>
            <input type="number" min={0} max={23} className={inputCls} value={form.quietStart ?? ""} onChange={(e) => set("quietStart", e.target.value === "" ? null : parseInt(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#464554]">پایان ساعت سکوت</label>
            <input type="number" min={0} max={23} className={inputCls} value={form.quietEnd ?? ""} onChange={(e) => set("quietEnd", e.target.value === "" ? null : parseInt(e.target.value))} />
          </div>
        </div>
      </div>

      {/* وضعیت */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>وضعیت</label>
        <button type="button" onClick={() => set("enabled", !form.enabled)}
          className={`py-2.5 rounded-xl text-[14px] font-semibold border ${form.enabled ? "bg-[#d4f5e6] text-[#006c49] border-[#006c49]/30" : "bg-[#f3f3f3] text-[#767586] border-[#c7c4d7]"}`}>
          {form.enabled ? "فعال" : "غیرفعال"}
        </button>
      </div>

      {error && <p className="text-[#ba1a1a] text-[13px]">{error}</p>}
      {testMsg && <p className="text-[#4648d4] text-[13px]">{testMsg}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="flex-1 py-3 rounded-xl border border-[#c7c4d7] text-[#464554] text-[14px] font-semibold">
          انصراف
        </button>
        {isEdit && (
          <button type="button" onClick={handleTest} className="px-4 py-3 rounded-xl border border-[#4648d4] text-[#4648d4] text-[14px] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">send</span> تست برای من
          </button>
        )}
        <button type="submit" disabled={saving} className="flex-grow bg-[#4648d4] text-white font-bold text-[15px] py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : isEdit ? "ذخیره تغییرات" : "ایجاد قانون"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// ورودی مقدار شرط بسته به نوع فیلد و عملگر
// ---------------------------------------------------------------------------
function ConditionValue({
  def,
  cond,
  onChange,
}: {
  def: (typeof FIELDS)[number];
  cond: Condition;
  onChange: (v: unknown) => void;
}) {
  const cls = inputCls + " !py-2 !px-2 text-[13px]";

  if (def.type === "boolean") {
    return (
      <select className={cls} value={String(cond.value)} onChange={(e) => onChange(e.target.value === "true")}>
        <option value="true">درست</option>
        <option value="false">نادرست</option>
      </select>
    );
  }

  if (cond.op === "between") {
    const arr = Array.isArray(cond.value) ? (cond.value as number[]) : [0, 0];
    return (
      <div className="flex gap-1 items-center">
        <input type="number" className={cls} value={arr[0] ?? ""} onChange={(e) => onChange([Number(e.target.value), arr[1] ?? 0])} />
        <span className="text-[12px] text-[#767586]">تا</span>
        <input type="number" className={cls} value={arr[1] ?? ""} onChange={(e) => onChange([arr[0] ?? 0, Number(e.target.value)])} />
      </div>
    );
  }

  if (def.type === "enum") {
    if (cond.op === "in") {
      // چند انتخاب با کاما
      const selected = Array.isArray(cond.value) ? (cond.value as string[]) : String(cond.value ?? "").split(",").filter(Boolean);
      return (
        <div className="flex flex-wrap gap-1">
          {(def.options ?? []).map((o) => {
            const on = selected.includes(o);
            return (
              <button key={o} type="button"
                onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${on ? "bg-[#4648d4] text-white border-[#4648d4]" : "border-[#c7c4d7] text-[#464554]"}`}>
                {o}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <select className={cls} value={String(cond.value ?? "")} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>انتخاب…</option>
        {(def.options ?? []).map((o) => (<option key={o} value={o}>{o}</option>))}
      </select>
    );
  }

  // number
  return <input type="number" className={cls} value={cond.value === "" || cond.value == null ? "" : Number(cond.value)} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
}
