import assert from "node:assert/strict";
import {
  getVideoWatchPercent,
  isHotVideoLead,
  normalizeCompletedVideoThreshold,
  summarizeVideoProgress,
} from "../lib/video-leads";
import { userMatches, type EnrichedUser } from "../lib/notification-rules";
import {
  getCrossedVideoProgressMilestones,
  isBenignVideoPlayInterruption,
} from "../lib/video-playback";

const rows = [
  {
    watchedSeconds: 540,
    totalSeconds: 600,
    completed: true,
    updatedAt: new Date("2026-09-09T08:00:00.000Z"),
    video: { title: "جلسه ۲", sortOrder: 2 },
  },
  {
    watchedSeconds: 300,
    totalSeconds: 600,
    completed: false,
    updatedAt: new Date("2026-09-09T09:00:00.000Z"),
    video: { title: "جلسه ۳", sortOrder: 3 },
  },
  {
    watchedSeconds: 600,
    totalSeconds: 600,
    completed: true,
    updatedAt: new Date("2026-09-08T09:00:00.000Z"),
    video: { title: "جلسه ۱", sortOrder: 1 },
  },
];

const summary = summarizeVideoProgress(rows);
assert.equal(summary.startedVideos, 3);
assert.equal(summary.completedVideos, 2);
assert.equal(summary.watchedMinutes, 24);
assert.equal(summary.lastProgressAt?.toISOString(), "2026-09-09T09:00:00.000Z");
assert.deepEqual(summary.completedTitles, ["جلسه ۱", "جلسه ۲"]);
assert.deepEqual(summary.progressDetails, ["جلسه ۱: 100٪", "جلسه ۲: 90٪", "جلسه ۳: 50٪"]);
assert.equal(getVideoWatchPercent(999, 600), 100);
assert.equal(getVideoWatchPercent(20, 0), 0);
assert.equal(normalizeCompletedVideoThreshold("4"), 4);
assert.equal(normalizeCompletedVideoThreshold("invalid"), 3);
assert.equal(normalizeCompletedVideoThreshold(0), 1);
assert.equal(isHotVideoLead(summary, 2), true);
assert.equal(isHotVideoLead(summary, 3), false);
assert.deepEqual(getCrossedVideoProgressMilestones(100, 460, 600), [25, 50, 75]);
assert.deepEqual(getCrossedVideoProgressMilestones(300, 460, 600), [75]);
assert.deepEqual(getCrossedVideoProgressMilestones(460, 540, 600), []);
assert.equal(isBenignVideoPlayInterruption({
  name: "AbortError",
  message: "The play() request was interrupted by a call to pause().",
}), true);
assert.equal(isBenignVideoPlayInterruption({
  name: "NotAllowedError",
  message: "play() failed because the user did not interact with the document",
}), false);
assert.equal(isBenignVideoPlayInterruption(new Error("network failed")), false);

const user: EnrichedUser = {
  id: "user-1",
  name: "سارا",
  level: "تازه‌نفس",
  grade: "دوازدهم",
  field: "تجربی",
  xp: 0,
  coins: 0,
  streak: 0,
  onboardingDay: 1,
  isLeadComplete: true,
  baleId: null,
  telegramId: null,
  lastStudyDate: null,
  nextStudyTarget: null,
  lastWeeklyRank: null,
  dailyGoalMin: 15,
  hasPush: true,
  videosStarted: 4,
  videosCompleted: 3,
  videoWatchedMinutes: 72,
  lastVideoProgressAt: new Date(),
};

assert.equal(userMatches(user, "videoWarm", []), true);
assert.equal(userMatches(user, "all", [{ field: "videosCompleted", op: "gte", value: 4 }]), false);
assert.equal(userMatches(
  user,
  "all",
  [{ field: "currentVideoProgressPercent", op: "eq", value: 50 }],
  { videoProgressPercent: 50 },
), true);
assert.equal(userMatches(
  user,
  "all",
  [{ field: "categoryVideosCompleted", op: "gte", value: 3 }],
  { categoryVideosCompleted: 2 },
), false);

console.log("✅ گزارش لید و شرط‌های نوتیفیکیشن ویدیویی درست کار می‌کنند.");
