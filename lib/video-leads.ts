export const DEFAULT_HOT_LEAD_COMPLETED_VIDEOS = 3;
export const MAX_HOT_LEAD_COMPLETED_VIDEOS = 100;

export interface VideoProgressForLead {
  watchedSeconds: number;
  totalSeconds: number;
  completed: boolean;
  updatedAt: Date;
  video: {
    title: string;
    sortOrder: number;
  };
}

export interface VideoLeadSummary {
  startedVideos: number;
  completedVideos: number;
  watchedMinutes: number;
  lastProgressAt: Date | null;
  completedTitles: string[];
  progressDetails: string[];
}

export function normalizeCompletedVideoThreshold(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_HOT_LEAD_COMPLETED_VIDEOS;
  return Math.min(MAX_HOT_LEAD_COMPLETED_VIDEOS, Math.max(1, Math.trunc(parsed)));
}

export function getVideoWatchPercent(watchedSeconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((watchedSeconds / totalSeconds) * 100)));
}

export function summarizeVideoProgress(rows: VideoProgressForLead[]): VideoLeadSummary {
  const sorted = [...rows].sort((first, second) => (
    first.video.sortOrder - second.video.sortOrder
    || first.video.title.localeCompare(second.video.title, "fa")
  ));
  const totalWatchedSeconds = sorted.reduce((sum, row) => sum + Math.max(0, row.watchedSeconds), 0);
  const completed = sorted.filter((row) => row.completed);
  const timestamps = sorted.map((row) => row.updatedAt.getTime()).filter(Number.isFinite);

  return {
    startedVideos: sorted.length,
    completedVideos: completed.length,
    watchedMinutes: Math.round(totalWatchedSeconds / 60),
    lastProgressAt: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
    completedTitles: completed.map((row) => row.video.title),
    progressDetails: sorted.map((row) => (
      `${row.video.title}: ${getVideoWatchPercent(row.watchedSeconds, row.totalSeconds)}٪`
    )),
  };
}

export function isHotVideoLead(summary: VideoLeadSummary, minCompleted: number): boolean {
  return summary.completedVideos >= normalizeCompletedVideoThreshold(minCompleted);
}
