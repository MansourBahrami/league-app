/**
 * پارس و اعتبارسنجی ورودی فرم قانون نوتیفیکیشن (پنل ادمین).
 * خروجی پارس‌شده مستقیماً برای create/update پریزما قابل‌استفاده است.
 */
import {
  NOTIF_CHANNELS,
  SEGMENT_MAP,
  FIELD_MAP,
  EVENTS,
  type Op,
} from "@/lib/notification-rules";

const TRIGGER_TYPES = ["scheduled", "relative", "event"] as const;
const VALID_OPS: Op[] = ["eq", "ne", "gt", "lt", "gte", "lte", "between", "in"];

export interface ParsedRule {
  name: string;
  enabled: boolean;
  channels: string[];
  triggerType: string;
  triggerConfig: object;
  segment: string | null;
  conditions: object;
  title: string;
  body: string;
  linkUrl: string | null;
  cooldownHours: number;
  quietStart: number | null;
  quietEnd: number | null;
  maxPerDay: number | null;
}

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseConditions(raw: unknown): { field: string; op: Op; value: unknown }[] {
  if (!Array.isArray(raw)) return [];
  const out: { field: string; op: Op; value: unknown }[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const obj = c as Record<string, unknown>;
    const field = String(obj.field ?? "");
    const op = String(obj.op ?? "") as Op;
    if (!FIELD_MAP[field] || !VALID_OPS.includes(op)) continue;
    out.push({ field, op, value: obj.value });
  }
  return out;
}

export function parseRuleBody(body: unknown): ParsedRule {
  const b = (body ?? {}) as Record<string, unknown>;
  const channels = Array.isArray(b.channels)
    ? b.channels.map(String).filter((c) => (NOTIF_CHANNELS as readonly string[]).includes(c))
    : [];
  const triggerType = String(b.triggerType ?? "");
  return {
    name: String(b.name ?? "").trim(),
    enabled: b.enabled !== false,
    channels,
    triggerType,
    triggerConfig: (b.triggerConfig && typeof b.triggerConfig === "object" ? b.triggerConfig : {}) as object,
    segment: b.segment ? String(b.segment) : null,
    conditions: parseConditions(b.conditions) as unknown as object,
    title: String(b.title ?? "").trim(),
    body: String(b.body ?? "").trim(),
    linkUrl: b.linkUrl ? String(b.linkUrl).trim() : null,
    cooldownHours: toIntOrNull(b.cooldownHours) ?? 24,
    quietStart: toIntOrNull(b.quietStart),
    quietEnd: toIntOrNull(b.quietEnd),
    maxPerDay: toIntOrNull(b.maxPerDay),
  };
}

/** اعتبارسنجی؛ در صورت خطا پیام فارسی برمی‌گرداند، وگرنه null. */
export function validateRule(r: ParsedRule): string | null {
  if (!r.name) return "نام قانون الزامی است.";
  if (!r.title) return "عنوان پیام الزامی است.";
  if (!r.body) return "متن پیام الزامی است.";
  if (!r.channels.length) return "حداقل یک کانال ارسال انتخاب کنید.";
  if (!(TRIGGER_TYPES as readonly string[]).includes(r.triggerType))
    return "نوع تریگر نامعتبر است.";

  const cfg = r.triggerConfig as Record<string, unknown>;
  if (r.triggerType === "scheduled") {
    const h = Number(cfg.hour);
    if (!Number.isInteger(h) || h < 0 || h > 23) return "ساعت اجرا باید بین ۰ تا ۲۳ باشد.";
    const m = cfg.minute === undefined ? 0 : Number(cfg.minute);
    if (!Number.isInteger(m) || m < 0 || m > 59) return "دقیقه اجرا نامعتبر است.";
    if (cfg.weekdays !== undefined && !Array.isArray(cfg.weekdays))
      return "روزهای هفته نامعتبر است.";
  } else if (r.triggerType === "relative") {
    const b = Number(cfg.beforeTargetMin);
    if (!Number.isInteger(b) || b < 0) return "دقیقه‌ی قبل از هدف نامعتبر است.";
  } else if (r.triggerType === "event") {
    if (!cfg.event || !(String(cfg.event) in EVENTS)) return "رویداد انتخاب‌شده نامعتبر است.";
  }

  if (r.segment && !SEGMENT_MAP[r.segment]) return "سگمنت نامعتبر است.";
  if (r.quietStart !== null && (r.quietStart < 0 || r.quietStart > 23))
    return "ساعت شروع سکوت نامعتبر است.";
  if (r.quietEnd !== null && (r.quietEnd < 0 || r.quietEnd > 23))
    return "ساعت پایان سکوت نامعتبر است.";
  if (r.cooldownHours < 0) return "فاصله‌ی ارسال مجدد نمی‌تواند منفی باشد.";
  if (r.maxPerDay !== null && r.maxPerDay < 1) return "سقف روزانه باید حداقل ۱ باشد.";
  return null;
}
