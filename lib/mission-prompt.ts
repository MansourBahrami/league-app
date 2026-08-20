import { tehranDayDiff } from "@/lib/date";

export function wasMissionPromptHandledToday(
  handledAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!handledAt) return false;
  const handledDate = new Date(handledAt);
  if (!Number.isFinite(handledDate.getTime())) return false;
  return tehranDayDiff(now, handledDate) === 0;
}
