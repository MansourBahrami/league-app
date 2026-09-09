export const VIDEO_PROGRESS_HEARTBEAT_SECONDS = 30;
export const VIDEO_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;

export type VideoPlaybackRate = (typeof VIDEO_PLAYBACK_RATES)[number];

export function normalizeVideoPlaybackRate(value: unknown): VideoPlaybackRate {
  const numericValue = Number(value);
  return VIDEO_PLAYBACK_RATES.find((rate) => rate === numericValue) ?? 1;
}

export function getAllowedVideoProgressAdvance(
  elapsedSeconds: number,
  value: unknown,
): number {
  const playbackRate = normalizeVideoPlaybackRate(value);
  const elapsed = Math.max(0, Math.floor(elapsedSeconds));
  return Math.min(
    Math.ceil(VIDEO_PROGRESS_HEARTBEAT_SECONDS * playbackRate),
    Math.floor(elapsed * playbackRate) + 5,
  );
}
