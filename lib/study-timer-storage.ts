export type StoredTimerState = "running" | "paused";

export interface StoredStudyTimerSession {
  version: 1;
  sid: string;
  startTime: number;
  totalSecs: number;
  state: StoredTimerState;
  secondsLeft?: number;
}

export interface RestoredStudyTimerSession {
  sid: string;
  startTime: number;
  totalSecs: number;
  state: StoredTimerState;
  secondsLeft: number;
}

/**
 * نسخه‌های قدیمی فقط sid/startTime/totalSecs داشتند و running فرض می‌شوند.
 * در حالت paused، گذشت زمان دیواری نباید از زمان باقی‌مانده کم کند.
 */
export function restoreStudyTimerSession(
  raw: string,
  now = Date.now(),
): RestoredStudyTimerSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredStudyTimerSession>;
    if (
      typeof parsed.sid !== "string" || parsed.sid.length === 0 ||
      typeof parsed.startTime !== "number" || !Number.isFinite(parsed.startTime) ||
      typeof parsed.totalSecs !== "number" || !Number.isFinite(parsed.totalSecs) || parsed.totalSecs <= 0
    ) {
      return null;
    }

    const state: StoredTimerState = parsed.state === "paused" ? "paused" : "running";
    const elapsedSecs = Math.max(0, Math.floor((now - parsed.startTime) / 1000));
    const runningRemaining = Math.min(parsed.totalSecs, parsed.totalSecs - elapsedSecs);
    const pausedRemaining = typeof parsed.secondsLeft === "number" && Number.isFinite(parsed.secondsLeft)
      ? Math.min(parsed.totalSecs, Math.floor(parsed.secondsLeft))
      : runningRemaining;
    const secondsLeft = state === "paused" ? pausedRemaining : runningRemaining;

    if (secondsLeft <= 0) return null;

    return {
      sid: parsed.sid,
      startTime: parsed.startTime,
      totalSecs: parsed.totalSecs,
      state,
      secondsLeft,
    };
  } catch {
    return null;
  }
}
