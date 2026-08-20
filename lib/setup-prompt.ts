export const SETUP_PROMPT_SNOOZE_DAYS = 7;

export function isSetupPromptSnoozed(
  snoozedAt: Date | string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!snoozedAt) return false;
  const snoozedMs = new Date(snoozedAt).getTime();
  if (!Number.isFinite(snoozedMs)) return false;
  return nowMs - snoozedMs < SETUP_PROMPT_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}
