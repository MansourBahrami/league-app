const MESSENGER_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export function isMessengerPromptSnoozed(dismissedAt: Date | null): boolean {
  if (!dismissedAt) return false;
  return Date.now() - dismissedAt.getTime() < MESSENGER_PROMPT_SNOOZE_MS;
}
