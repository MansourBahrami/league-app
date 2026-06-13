export const VALID_LEVELS = ["تازه‌نفس", "ثابت‌قدم", "پیشرو", "سرآمد", "الگو"];

/** پارس و پاکسازی بدنه‌ی فرم تورنومنت (مشترک بین POST و PATCH ادمین). */
export function parseTournamentBody(body: Record<string, unknown>) {
  const levels = Array.isArray(body.levels)
    ? (body.levels as unknown[]).map(String).filter((l) => VALID_LEVELS.includes(l))
    : [];
  return {
    name: String(body.name ?? "").trim(),
    description: body.description ? String(body.description) : null,
    startAt: new Date(String(body.startAt)),
    endAt: new Date(String(body.endAt)),
    entryCost: Math.max(0, Number(body.entryCost) || 0),
    prizeXp: Math.max(0, Number(body.prizeXp) || 0),
    prizeCoins: Math.max(0, Number(body.prizeCoins) || 0),
    levels,
    isActive: body.isActive !== false,
  };
}

/** اعتبارسنجی: نام لازم، endAt بعد از startAt. */
export function validateTournament(data: ReturnType<typeof parseTournamentBody>): string | null {
  if (!data.name) return "نام تورنومنت الزامی است";
  if (isNaN(data.startAt.getTime()) || isNaN(data.endAt.getTime())) return "تاریخ نامعتبر است";
  if (data.endAt <= data.startAt) return "زمان پایان باید بعد از شروع باشد";
  return null;
}
