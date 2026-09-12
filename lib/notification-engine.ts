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
import { TEHRAN_OFFSET_MIN, tehranDayStart } from "@/lib/date";
import { captureCaughtError } from "@/lib/observability";
import { mapWithConcurrency } from "@/lib/concurrency";
import { withDistributedLock } from "@/lib/distributed-lock";
import { safeWebUrl } from "@/lib/url-safety";
import {
  type EnrichedUser,
  type Condition,
  type NotifEvent,
  type NotifChannel,
  type NotificationContext,
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
  lastRunAt?: Date | null;
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

interface VideoNotificationStats {
  started: number;
  completed: number;
  watchedSeconds: number;
  lastProgressAt: Date | null;
}

function toEnriched(
  u: RawUser,
  pushSet: Set<string>,
  videoStats: Map<string, VideoNotificationStats>,
): EnrichedUser {
  const video = videoStats.get(u.id) ?? {
    started: 0,
    completed: 0,
    watchedSeconds: 0,
    lastProgressAt: null,
  };
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
    videosStarted: video.started,
    videosCompleted: video.completed,
    videoWatchedMinutes: Math.round(video.watchedSeconds / 60),
    lastVideoProgressAt: video.lastProgressAt,
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

async function getVideoStatsMap(userIds?: string[]): Promise<Map<string, VideoNotificationStats>> {
  if (userIds?.length === 0) return new Map();
  const where = {
    watchedSeconds: { gt: 0 },
    ...(userIds ? { userId: { in: userIds } } : {}),
  };
  const [allRows, completedRows] = await Promise.all([
    prisma.videoProgress.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
      _sum: { watchedSeconds: true },
      _max: { updatedAt: true },
    }),
    prisma.videoProgress.groupBy({
      by: ["userId"],
      where: { ...where, completed: true },
      _count: { _all: true },
    }),
  ]);
  const completedMap = new Map(
    completedRows.map((row) => [row.userId, row._count._all]),
  );
  return new Map(allRows.map((row) => [row.userId, {
    started: row._count._all,
    completed: completedMap.get(row.userId) ?? 0,
    watchedSeconds: row._sum.watchedSeconds ?? 0,
    lastProgressAt: row._max.updatedAt ?? null,
  }]));
}

async function enrichUsers(raw: RawUser[]): Promise<EnrichedUser[]> {
  const userIds = raw.map((user) => user.id);
  const [pushSet, videoStats] = await Promise.all([
    getPushUserSet(userIds),
    getVideoStatsMap(userIds),
  ]);
  return raw.map((user) => toEnriched(user, pushSet, videoStats));
}

// ---------------------------------------------------------------------------
// بررسی‌های ایمنی
// ---------------------------------------------------------------------------
function getTehranTime(instant = new Date()): { hour: number; minute: number; weekday: number } {
  const tehranMs = instant.getTime() + TEHRAN_OFFSET_MIN * 60000;
  const d = new Date(tehranMs);
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes(), weekday: d.getUTCDay() };
}

function inQuietHours(rule: RuleRow, now = new Date()): boolean {
  if (rule.quietStart == null || rule.quietEnd == null) return false;
  const { hour: h } = getTehranTime(now);
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
      where: { ruleId: rule.id, userId, status: "sent", sentAt: { gte: since } },
      select: { id: true },
    });
    if (recent) return false;
  }
  // سقف روزانه بر مبنای روز تقویمی تهران
  if (rule.maxPerDay != null && rule.maxPerDay > 0) {
    const dayStart = tehranDayStart(now);
    const count = await prisma.notificationLog.count({
      where: { ruleId: rule.id, userId, status: "sent", sentAt: { gte: dayStart } },
    });
    if (count >= rule.maxPerDay) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// ارسال به یک کاربر
// ---------------------------------------------------------------------------
async function sendToUserLocked(
  rule: RuleRow,
  u: EnrichedUser,
  ctx: NotificationContext,
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

  async function deliver(
    channel: NotifChannel,
    sender: () => Promise<{ ok: boolean; errorCode?: string }>,
  ) {
    const startedAt = Date.now();
    let result: { ok: boolean; errorCode?: string };
    try {
      result = await sender();
    } catch (error) {
      captureCaughtError("notification.deliver", error, { ruleId: rule.id, channel });
      result = { ok: false, errorCode: "exception" };
    }
    await prisma.notificationLog.create({
      data: {
        ruleId: rule.id,
        userId: u.id,
        channel,
        status: result.ok ? "sent" : "failed",
        errorCode: result.ok ? null : (result.errorCode ?? "delivery_failed"),
        durationMs: Date.now() - startedAt,
      },
    });
    if (result.ok) sent.push(channel);
  }

  // تبدیل linkUrl نسبتی به نشانی کامل برای پیام‌رسان بله
  const appUrl = (process.env.APP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.gcamp.ir").replace(/\/$/, "");
  const safeLink = safeWebUrl(rule.linkUrl);
  const absoluteLink = safeLink
    ? (safeLink.startsWith("https://")
        ? safeLink
        : `${appUrl}${safeLink}`)
    : null;

  // بله
  if (rule.channels.includes("bale") && u.baleId) {
    const text = `${title}\n\n${body}${absoluteLink ? `\n\n👉 ${absoluteLink}` : ""}`;
    await deliver("bale", async () => {
      const res = (await sendMessage("bale", u.baleId!, text)) as { ok?: boolean; description?: string };
      return { ok: res?.ok === true, errorCode: res?.ok ? undefined : "provider_rejected" };
    });
  }

  // تلگرام
  if (rule.channels.includes("telegram") && u.telegramId) {
    const text = `${title}\n\n${body}${absoluteLink ? `\n\n👉 ${absoluteLink}` : ""}`;
    await deliver("telegram", async () => {
      const res = (await sendMessage("telegram", u.telegramId!, text)) as { ok?: boolean; description?: string };
      return { ok: res?.ok === true, errorCode: res?.ok ? undefined : "provider_rejected" };
    });
  }

  // Web Push
  if (rule.channels.includes("push") && u.hasPush) {
    await deliver("push", async () => {
      const count = await sendPushToUser(u.id, {
        title,
        body,
        url: safeLink ?? undefined,
        tag: `rule-${rule.id}`,
      });
      return { ok: count > 0, errorCode: count > 0 ? undefined : "no_delivery" };
    });
  }
  return sent;
}

async function sendToUser(
  rule: RuleRow,
  user: EnrichedUser,
  ctx: NotificationContext,
  opts: { skipSafety?: boolean } = {},
): Promise<NotifChannel[]> {
  const locked = await withDistributedLock(
    `notification:${rule.id}:${user.id}`,
    () => sendToUserLocked(rule, user, ctx, opts),
    60_000,
  );
  return locked.acquired ? locked.value : [];
}

// ---------------------------------------------------------------------------
// اجرای یک قانون روی مجموعه‌ای از کاربران
// ---------------------------------------------------------------------------
async function runRuleOnUsers(
  rule: RuleRow,
  users: EnrichedUser[],
  ctxFor: (u: EnrichedUser) => NotificationContext = () => ({}),
  opts: { skipSafety?: boolean; skipConditions?: boolean } = {}
): Promise<{ matched: number; sent: number }> {
  const conditions = (Array.isArray(rule.conditions) ? rule.conditions : []) as Condition[];
  const matchingUsers = users
    .map((user) => ({ user, ctx: ctxFor(user) }))
    .filter(({ user, ctx }) => opts.skipConditions || userMatches(user, rule.segment, conditions, ctx));
  const matched = matchingUsers.length;
  const outcomes = await mapWithConcurrency(
    matchingUsers,
    10,
    async ({ user, ctx }) => (await sendToUser(rule, user, ctx, opts)).length > 0,
  );
  const sent = outcomes.filter(Boolean).length;
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

/** آیا یک قانون زمان‌بندی‌شده در پنجره‌ی فعلی باید اجرا شود؟ (cron هر چند دقیقه یک‌بار با مبنای ساعت تهران) */
function scheduledDue(cfg: ScheduledConfig, now: Date, windowMin: number): boolean {
  const { hour: currentHour, minute: currentMinute, weekday } = getTehranTime(now);
  if (cfg.weekdays && cfg.weekdays.length && !cfg.weekdays.includes(weekday)) return false;
  if (cfg.hour == null) return false;
  const targetMinOfDay = cfg.hour * 60 + (cfg.minute ?? 0);
  const currentMinOfDay = currentHour * 60 + currentMinute;
  const diffMin = (currentMinOfDay - targetMinOfDay + 1440) % 1440;
  // اگر زمان هدف در پنجره‌ی [now - windowMin, now] افتاده باشد
  return diffMin >= 0 && diffMin < windowMin;
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
      // اگر این قانون اخیراً در همین پنجره اجرا شده باشد، از اجرای مجدد صرف‌نظر کن
      if (rule.lastRunAt && now.getTime() - new Date(rule.lastRunAt).getTime() < windowMin * 60_000) {
        continue;
      }
      const raw = (await prisma.user.findMany({ select: USER_SELECT })) as RawUser[];
      const users = await enrichUsers(raw);
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
      const users = await enrichUsers(raw);
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
  ctx: NotificationContext = {}
): Promise<void> {
  try {
    const rules = (await prisma.notificationRule.findMany({
      where: { enabled: true, triggerType: "event" },
    })) as unknown as RuleRow[];
    const matching = rules.filter((r) => {
      const cfg = (r.triggerConfig ?? {}) as { event?: string; categoryId?: string };
      const categoryMatches = !cfg.categoryId || cfg.categoryId === ctx.categoryId;
      return cfg.event === event && categoryMatches;
    });
    if (!matching.length) return;

    const raw = (await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT })) as RawUser | null;
    if (!raw) return;
    const [u] = await enrichUsers([raw]);

    for (const rule of matching) {
      await runRuleOnUsers(rule, [u], () => ctx);
    }
  } catch (err) {
    captureCaughtError("notification.fire_event", err, { event, userId });
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
  const users = await enrichUsers(raw);

  return runRuleOnUsers(rule, users, () => ({}), {
    skipSafety: Boolean(testUserId),
    skipConditions: Boolean(testUserId),
  });
}
