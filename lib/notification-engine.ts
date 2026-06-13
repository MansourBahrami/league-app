/**
 * موتور ارسال نوتیفیکیشن مبتنی بر قانون.
 *
 * مسئولیت‌ها:
 *   - غنی‌سازی کاربر (enrich) با مقادیر موردنیاز ارزیابی شرط.
 *   - بررسی ایمنی: cooldown، سقف روزانه، ساعت سکوت، در دسترس بودن کانال.
 *   - ارسال از کانال‌ها (بله + Web Push) و ثبت لاگ.
 *   - اجرای قانون‌های زمان‌بندی‌شده/نسبتی (برای cron) و قانون‌های رویدادی (hook).
 *
 * کاتالوگ فیلد/سگمنت/رویداد و ارزیابی شرط در lib/notification-rules.ts است.
 */

import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/bot";
import { sendPushToUser } from "@/lib/push";
import { getOnboardingDailyGoalMinutes } from "@/lib/gamification";
import {
  type EnrichedUser,
  type Condition,
  type NotifEvent,
  type NotifChannel,
  userMatches,
  renderTemplate,
} from "@/lib/notification-rules";

// نوع قانون آن‌طور که از DB می‌آید (Json ها loosely typed)
interface RuleRow {
  id: string;
  name: string;
  enabled: boolean;
  channels: string[];
  triggerType: string;
  triggerConfig: unknown;
  segment: string | null;
  conditions: unknown;
  title: string;
  body: string;
  linkUrl: string | null;
  cooldownHours: number;
  quietStart: number | null;
  quietEnd: number | null;
  maxPerDay: number | null;
}

// ستون‌هایی که برای enrich لازم است
const USER_SELECT = {
  id: true,
  name: true,
  level: true,
  grade: true,
  field: true,
  xp: true,
  coins: true,
  streak: true,
  onboardingDay: true,
  isLeadComplete: true,
  baleId: true,
  telegramId: true,
  lastStudyDate: true,
  nextStudyTarget: true,
  lastWeeklyRank: true,
  pastAvgStudyHours: true,
  day1GoalMinutes: true,
} as const;

type RawUser = {
  id: string; name: string | null; level: string; grade: string | null; field: string | null;
  xp: number; coins: number; streak: number; onboardingDay: number; isLeadComplete: boolean;
  baleId: string | null; telegramId: string | null; lastStudyDate: Date | null;
  nextStudyTarget: Date | null; lastWeeklyRank: number | null;
  pastAvgStudyHours: number | null; day1GoalMinutes: number | null;
};

function toEnriched(u: RawUser, pushSet: Set<string>): EnrichedUser {
  return {
    id: u.id,
    name: u.name,
    level: u.level,
    grade: u.grade,
    field: u.field,
    xp: u.xp,
    coins: u.coins,
    streak: u.streak,
    onboardingDay: u.onboardingDay,
    isLeadComplete: u.isLeadComplete,
    baleId: u.baleId,
    telegramId: u.telegramId,
    lastStudyDate: u.lastStudyDate,
    nextStudyTarget: u.nextStudyTarget,
    lastWeeklyRank: u.lastWeeklyRank,
    dailyGoalMin: getOnboardingDailyGoalMinutes(u.onboardingDay, u.pastAvgStudyHours, u.day1GoalMinutes),
    hasPush: pushSet.has(u.id),
  };
}

/** مجموعه‌ی userIdهایی که حداقل یک اشتراک Web Push دارند. */
async function getPushUserSet(userIds?: string[]): Promise<Set<string>> {
  const subs = await prisma.pushSubscription.findMany({
    where: userIds ? { userId: { in: userIds } } : undefined,
    select: { userId: true },
    distinct: ["userId"],
  });
  return new Set(subs.map((s) => s.userId));
}

// ---------------------------------------------------------------------------
// بررسی‌های ایمنی
// ---------------------------------------------------------------------------
function inQuietHours(rule: RuleRow, now = new Date()): boolean {
  if (rule.quietStart == null || rule.quietEnd == null) return false;
  const h = now.getHours();
  const { quietStart: s, quietEnd: e } = rule;
  // بازه‌ی شبانه ممکن است از نیمه‌شب عبور کند (مثلا 22 تا 8)
  return s <= e ? h >= s && h < e : h >= s || h < e;
}

/** آیا با توجه به cooldown و سقف روزانه، مجاز به ارسال این قانون به این کاربر هستیم؟ */
async function canSend(rule: RuleRow, userId: string, now = new Date()): Promise<boolean> {
  // cooldown: آخرین ارسال همین قانون به همین کاربر
  if (rule.cooldownHours > 0) {
    const since = new Date(now.getTime() - rule.cooldownHours * 3600_000);
    const recent = await prisma.notificationLog.findFirst({
      where: { ruleId: rule.id, userId, sentAt: { gte: since } },
      select: { id: true },
    });
    if (recent) return false;
  }
  // سقف روزانه
  if (rule.maxPerDay != null && rule.maxPerDay > 0) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const count = await prisma.notificationLog.count({
      where: { ruleId: rule.id, userId, sentAt: { gte: dayStart } },
    });
    if (count >= rule.maxPerDay) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// ارسال به یک کاربر
// ---------------------------------------------------------------------------
async function sendToUser(
  rule: RuleRow,
  u: EnrichedUser,
  ctx: Record<string, string | number>,
  opts: { skipSafety?: boolean } = {}
): Promise<NotifChannel[]> {
  const now = new Date();
  if (!opts.skipSafety) {
    if (inQuietHours(rule, now)) return [];
    if (!(await canSend(rule, u.id, now))) return [];
  }

  const title = renderTemplate(rule.title, u, ctx);
  const body = renderTemplate(rule.body, u, ctx);
  const sent: NotifChannel[] = [];

  // بله
  if (rule.channels.includes("bale") && u.baleId) {
    const text = `${title}\n\n${body}${rule.linkUrl ? `\n\n👉 ${rule.linkUrl}` : ""}`;
    const ok = await sendMessage("bale", u.baleId, text).then(() => true).catch(() => false);
    if (ok) sent.push("bale");
  }

  // Web Push
  if (rule.channels.includes("push") && u.hasPush) {
    const count = await sendPushToUser(u.id, { title, body, url: rule.linkUrl ?? undefined, tag: `rule-${rule.id}` })
      .catch(() => 0);
    if (count > 0) sent.push("push");
  }

  // ثبت لاگ (یک رکورد به ازای هر کانال موفق)
  for (const ch of sent) {
    await prisma.notificationLog.create({ data: { ruleId: rule.id, userId: u.id, channel: ch } });
  }
  return sent;
}

// ---------------------------------------------------------------------------
// اجرای یک قانون روی مجموعه‌ای از کاربران
// ---------------------------------------------------------------------------
async function runRuleOnUsers(
  rule: RuleRow,
  users: EnrichedUser[],
  ctxFor: (u: EnrichedUser) => Record<string, string | number> = () => ({}),
  opts: { skipSafety?: boolean } = {}
): Promise<{ matched: number; sent: number }> {
  const conditions = (Array.isArray(rule.conditions) ? rule.conditions : []) as Condition[];
  let matched = 0;
  let sent = 0;
  for (const u of users) {
    if (!userMatches(u, rule.segment, conditions)) continue;
    matched++;
    const channels = await sendToUser(rule, u, ctxFor(u), opts);
    if (channels.length) sent++;
  }
  if (sent > 0) {
    await prisma.notificationRule.update({
      where: { id: rule.id },
      data: { sentCount: { increment: sent }, lastRunAt: new Date() },
    });
  } else {
    await prisma.notificationRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date() } });
  }
  return { matched, sent };
}

// ---------------------------------------------------------------------------
// تریگر زمان‌بندی‌شده / نسبتی (برای cron)
// ---------------------------------------------------------------------------
interface ScheduledConfig { hour?: number; minute?: number; weekdays?: number[] }
interface RelativeConfig { beforeTargetMin?: number }

/** آیا یک قانون زمان‌بندی‌شده در پنجره‌ی فعلی باید اجرا شود؟ (cron هر چند دقیقه یک‌بار) */
function scheduledDue(cfg: ScheduledConfig, now: Date, windowMin: number): boolean {
  const weekday = now.getDay(); // 0=یکشنبه (مطابق JS)
  if (cfg.weekdays && cfg.weekdays.length && !cfg.weekdays.includes(weekday)) return false;
  if (cfg.hour == null) return false;
  const target = new Date(now);
  target.setHours(cfg.hour, cfg.minute ?? 0, 0, 0);
  const diff = now.getTime() - target.getTime();
  // اگر زمان هدف در پنجره‌ی [now - windowMin, now] افتاده باشد
  return diff >= 0 && diff < windowMin * 60_000;
}

/**
 * اجرای همه‌ی قانون‌های فعالِ زمان‌بندی‌شده و نسبتی که اکنون موعدشان است.
 * windowMin = بازه‌ای که cron در آن اجرا می‌شود (پیش‌فرض ۱۵ دقیقه).
 */
export async function runScheduledRules(windowMin = 15): Promise<{ rules: number; totalSent: number }> {
  const now = new Date();
  const rules = (await prisma.notificationRule.findMany({
    where: { enabled: true, triggerType: { in: ["scheduled", "relative"] } },
  })) as unknown as RuleRow[];

  let totalSent = 0;
  let firedRules = 0;

  for (const rule of rules) {
    if (rule.triggerType === "scheduled") {
      if (!scheduledDue((rule.triggerConfig ?? {}) as ScheduledConfig, now, windowMin)) continue;
      const raw = (await prisma.user.findMany({ select: USER_SELECT })) as RawUser[];
      const pushSet = await getPushUserSet(raw.map((u) => u.id));
      const users = raw.map((u) => toEnriched(u, pushSet));
      const { sent } = await runRuleOnUsers(rule, users);
      totalSent += sent;
      firedRules++;
    } else {
      // relative: کاربرانی که nextStudyTarget در پنجره‌ی [now+before, now+before+window] است
      const before = ((rule.triggerConfig ?? {}) as RelativeConfig).beforeTargetMin ?? 15;
      const from = new Date(now.getTime() + before * 60_000);
      const to = new Date(from.getTime() + windowMin * 60_000);
      const raw = (await prisma.user.findMany({
        where: { nextStudyTarget: { gte: from, lte: to } },
        select: USER_SELECT,
      })) as RawUser[];
      if (!raw.length) continue;
      const pushSet = await getPushUserSet(raw.map((u) => u.id));
      const users = raw.map((u) => toEnriched(u, pushSet));
      const { sent } = await runRuleOnUsers(rule, users);
      totalSent += sent;
      firedRules++;
    }
  }
  return { rules: firedRules, totalSent };
}

// ---------------------------------------------------------------------------
// تریگر رویدادی (hook از نقاط فعالیت)
// ---------------------------------------------------------------------------
/**
 * یک رویداد برای یک کاربر رخ داده؛ همه‌ی قانون‌های رویدادیِ منطبق را اجرا کن.
 * ctx متغیرهای اضافی پیام را می‌دهد (مثلا medalName، newLevel، rank).
 * این تابع عمداً throw نمی‌کند تا جریان اصلی (پایان جلسه و…) را مختل نکند.
 */
export async function fireEvent(
  event: NotifEvent,
  userId: string,
  ctx: Record<string, string | number> = {}
): Promise<void> {
  try {
    const rules = (await prisma.notificationRule.findMany({
      where: { enabled: true, triggerType: "event" },
    })) as unknown as RuleRow[];
    const matching = rules.filter((r) => {
      const cfg = (r.triggerConfig ?? {}) as { event?: string };
      return cfg.event === event;
    });
    if (!matching.length) return;

    const raw = (await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT })) as RawUser | null;
    if (!raw) return;
    const pushSet = await getPushUserSet([userId]);
    const u = toEnriched(raw, pushSet);

    for (const rule of matching) {
      await runRuleOnUsers(rule, [u], () => ctx);
    }
  } catch (err) {
    console.error("[notif] fireEvent error:", err);
  }
}

// ---------------------------------------------------------------------------
// اجرای دستی / تست (از پنل ادمین)
// ---------------------------------------------------------------------------
/**
 * اجرای دستی یک قانون.
 * - testUserId: فقط برای همین کاربر و با نادیده‌گرفتن cooldown/quiet (دکمه «تست برای من»).
 * - بدون testUserId: اجرای واقعی روی همه‌ی کاربران منطبق (با احترام به ایمنی).
 */
export async function runRuleManually(
  ruleId: string,
  testUserId?: string
): Promise<{ matched: number; sent: number }> {
  const rule = (await prisma.notificationRule.findUnique({ where: { id: ruleId } })) as unknown as RuleRow | null;
  if (!rule) return { matched: 0, sent: 0 };

  const where = testUserId ? { id: testUserId } : undefined;
  const raw = (await prisma.user.findMany({ where, select: USER_SELECT })) as RawUser[];
  const pushSet = await getPushUserSet(raw.map((u) => u.id));
  const users = raw.map((u) => toEnriched(u, pushSet));

  return runRuleOnUsers(rule, users, () => ({}), { skipSafety: Boolean(testUserId) });
}
