/**
 * کاتالوگ و منطق ارزیابی قانون‌های نوتیفیکیشن.
 *
 * اینجا «چه‌کسی پیام می‌گیرد» تعریف می‌شود: کاتالوگ فیلدهای قابل‌شرط، عملگرها،
 * سگمنت‌های آماده، رویدادها، و توابع ارزیابی شرط روی یک کاربرِ غنی‌شده + رندر متن پیام.
 *
 * موتورِ ارسال (cooldown/quiet/کانال/لاگ) در lib/notification-engine.ts است.
 */

export const LEVELS = ["تازه‌نفس", "ثابت‌قدم", "پیشرو", "سرآمد", "الگو"] as const;

export const NOTIF_CHANNELS = ["bale", "push"] as const;
export type NotifChannel = (typeof NOTIF_CHANNELS)[number];

export const GRADES = ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل"] as const;

// ---------------------------------------------------------------------------
// عملگرها
// ---------------------------------------------------------------------------
export type Op = "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "between" | "in";

export const OP_LABELS: Record<Op, string> = {
  eq: "برابر با",
  ne: "نامساوی با",
  gt: "بزرگ‌تر از",
  lt: "کوچک‌تر از",
  gte: "بزرگ‌تر یا مساوی",
  lte: "کوچک‌تر یا مساوی",
  between: "بین",
  in: "یکی از",
};

export interface Condition {
  field: string;
  op: Op;
  value: unknown;
}

// ---------------------------------------------------------------------------
// کاربرِ غنی‌شده: همه‌ی مقادیری که ارزیابی شرط به آن نیاز دارد
// ---------------------------------------------------------------------------
export interface EnrichedUser {
  id: string;
  name: string | null;
  level: string;
  grade: string | null;
  field: string | null;
  xp: number;
  coins: number;
  streak: number;
  onboardingDay: number;
  isLeadComplete: boolean;
  baleId: string | null;
  telegramId: string | null;
  lastStudyDate: Date | null;
  nextStudyTarget: Date | null;
  lastWeeklyRank: number | null;
  dailyGoalMin: number;
  // محاسبه‌شده
  hasPush: boolean;
}

// ---------------------------------------------------------------------------
// کاتالوگ فیلدهای قابل‌شرط
// ---------------------------------------------------------------------------
export type FieldType = "number" | "enum" | "boolean";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  ops: Op[];
  options?: readonly string[]; // برای enum
  resolve: (u: EnrichedUser) => number | string | boolean | null;
}

const NUM_OPS: Op[] = ["eq", "ne", "gt", "lt", "gte", "lte", "between"];
const BOOL_OPS: Op[] = ["eq"];
const ENUM_OPS: Op[] = ["eq", "ne", "in"];

function daysSince(d: Date | null): number {
  if (!d) return 9999; // هرگز مطالعه نکرده = خیلی زیاد (ریزشی)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - day.getTime()) / 86400000);
}

function isToday(d: Date | null): boolean {
  return daysSince(d) === 0;
}

export const FIELDS: FieldDef[] = [
  { key: "level", label: "سطح", type: "enum", ops: ENUM_OPS, options: LEVELS, resolve: (u) => u.level },
  { key: "grade", label: "پایه", type: "enum", ops: ENUM_OPS, options: GRADES, resolve: (u) => u.grade },
  { key: "streak", label: "استریک (روز)", type: "number", ops: NUM_OPS, resolve: (u) => u.streak },
  { key: "xp", label: "XP", type: "number", ops: NUM_OPS, resolve: (u) => u.xp },
  { key: "coins", label: "سکه", type: "number", ops: NUM_OPS, resolve: (u) => u.coins },
  { key: "daysInactive", label: "روزهای بی‌فعالیتی", type: "number", ops: NUM_OPS, resolve: (u) => daysSince(u.lastStudyDate) },
  { key: "onboardingDay", label: "روز آنبوردینگ", type: "number", ops: NUM_OPS, resolve: (u) => u.onboardingDay },
  { key: "studiedToday", label: "امروز مطالعه کرده", type: "boolean", ops: BOOL_OPS, resolve: (u) => isToday(u.lastStudyDate) },
  { key: "hasTarget", label: "هدف فردا تنظیم شده", type: "boolean", ops: BOOL_OPS, resolve: (u) => u.nextStudyTarget != null },
  { key: "isLeadComplete", label: "پروفایل کامل", type: "boolean", ops: BOOL_OPS, resolve: (u) => u.isLeadComplete },
  { key: "hasBale", label: "ربات بله را استارت کرده", type: "boolean", ops: BOOL_OPS, resolve: (u) => u.baleId != null },
  { key: "hasPush", label: "اعلان مرورگر فعال دارد", type: "boolean", ops: BOOL_OPS, resolve: (u) => u.hasPush },
];

export const FIELD_MAP: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

// ---------------------------------------------------------------------------
// سگمنت‌های آماده (میان‌بُر؛ شرط‌هایشان با شرط‌های سفارشی AND می‌شود)
// ---------------------------------------------------------------------------
export interface SegmentDef {
  key: string;
  label: string;
  conditions: Condition[];
}

export const SEGMENTS: SegmentDef[] = [
  { key: "all", label: "همه کاربران", conditions: [] },
  { key: "inactive", label: "ریزشی‌ها (۳+ روز نخوانده)", conditions: [{ field: "daysInactive", op: "gte", value: 3 }] },
  { key: "newbie", label: "تازه‌نفس‌ها", conditions: [{ field: "level", op: "eq", value: "تازه‌نفس" }] },
  { key: "onboarding", label: "در آنبوردینگ", conditions: [{ field: "onboardingDay", op: "lt", value: 6 }] },
  { key: "streakHolders", label: "استریک‌دارها", conditions: [{ field: "streak", op: "gte", value: 1 }] },
  { key: "notStudiedToday", label: "امروز نخوانده‌اند", conditions: [{ field: "studiedToday", op: "eq", value: false }] },
  { key: "incompleteProfile", label: "پروفایل ناقص", conditions: [{ field: "isLeadComplete", op: "eq", value: false }] },
  { key: "noBale", label: "ربات بله را استارت نکرده‌اند", conditions: [{ field: "hasBale", op: "eq", value: false }] },
];

export const SEGMENT_MAP: Record<string, SegmentDef> = Object.fromEntries(SEGMENTS.map((s) => [s.key, s]));

// ---------------------------------------------------------------------------
// رویدادها (برای triggerType = event)
// ---------------------------------------------------------------------------
export const EVENTS = {
  session_complete: "پایان جلسه مطالعه",
  streak_milestone: "نقطه‌عطف استریک",
  level_up: "ارتقای سطح",
  medal_earn: "کسب مدال",
  rank_drop: "افت رتبه هفتگی",
} as const;
export type NotifEvent = keyof typeof EVENTS;

// ---------------------------------------------------------------------------
// ارزیابی یک شرط روی یک کاربر
// ---------------------------------------------------------------------------
function evalCondition(cond: Condition, u: EnrichedUser): boolean {
  const def = FIELD_MAP[cond.field];
  if (!def) return true; // فیلد ناشناخته = نادیده (محافظه‌کارانه)
  const actual = def.resolve(u);
  const v = cond.value;

  switch (cond.op) {
    case "eq":
      if (def.type === "boolean") return Boolean(actual) === Boolean(v);
      return String(actual) === String(v);
    case "ne":
      return String(actual) !== String(v);
    case "gt":
      return Number(actual) > Number(v);
    case "lt":
      return Number(actual) < Number(v);
    case "gte":
      return Number(actual) >= Number(v);
    case "lte":
      return Number(actual) <= Number(v);
    case "between": {
      const [lo, hi] = Array.isArray(v) ? v.map(Number) : [NaN, NaN];
      return Number(actual) >= lo && Number(actual) <= hi;
    }
    case "in": {
      const arr = Array.isArray(v) ? v.map(String) : String(v).split(",").map((s) => s.trim());
      return arr.includes(String(actual));
    }
    default:
      return false;
  }
}

/** آیا کاربر همه‌ی شرط‌ها (segment + custom، با AND) را برآورده می‌کند؟ */
export function userMatches(
  u: EnrichedUser,
  segment: string | null,
  custom: Condition[]
): boolean {
  const segConds = segment && SEGMENT_MAP[segment] ? SEGMENT_MAP[segment].conditions : [];
  const all = [...segConds, ...custom];
  return all.every((c) => evalCondition(c, u));
}

// ---------------------------------------------------------------------------
// رندر متن پیام با متغیرها
// ---------------------------------------------------------------------------
export function renderTemplate(
  template: string,
  u: EnrichedUser,
  ctx: Record<string, string | number> = {}
): string {
  const vars: Record<string, string> = {
    name: u.name ?? "دوست من",
    streak: u.streak.toLocaleString("fa-IR"),
    xp: u.xp.toLocaleString("fa-IR"),
    coins: u.coins.toLocaleString("fa-IR"),
    level: u.level,
    dailyGoalMin: u.dailyGoalMin.toLocaleString("fa-IR"),
    rank: u.lastWeeklyRank ? u.lastWeeklyRank.toLocaleString("fa-IR") : "—",
    ...Object.fromEntries(Object.entries(ctx).map(([k, val]) => [k, String(val)])),
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");
}

export const TEMPLATE_VARS = [
  { key: "name", label: "نام کاربر" },
  { key: "streak", label: "استریک" },
  { key: "xp", label: "XP" },
  { key: "coins", label: "سکه" },
  { key: "level", label: "سطح" },
  { key: "rank", label: "رتبه هفتگی" },
  { key: "dailyGoalMin", label: "هدف روزانه (دقیقه)" },
] as const;
