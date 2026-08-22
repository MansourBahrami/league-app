import assert from "node:assert/strict";
import { restoreStudyTimerSession, type StoredStudyTimerSession } from "../lib/study-timer-storage";

const startTime = Date.UTC(2026, 7, 21, 12, 0, 0);
const totalSecs = 30 * 60;

const running: StoredStudyTimerSession = {
  version: 1,
  sid: "running-session",
  startTime,
  totalSecs,
  state: "running",
};
const restoredRunning = restoreStudyTimerSession(JSON.stringify(running), startTime + 12_000);
assert.deepEqual(restoredRunning, {
  sid: "running-session",
  startTime,
  totalSecs,
  state: "running",
  secondsLeft: totalSecs - 12,
});

const paused: StoredStudyTimerSession = {
  version: 1,
  sid: "paused-session",
  startTime,
  totalSecs,
  state: "paused",
  secondsLeft: 1_777,
};
const restoredPaused = restoreStudyTimerSession(JSON.stringify(paused), startTime + 6 * 60 * 60 * 1000);
assert.equal(restoredPaused?.state, "paused");
assert.equal(restoredPaused?.secondsLeft, 1_777, "زمان pause نباید پس از refresh کم شود");

const legacy = JSON.stringify({ sid: "legacy-session", startTime, totalSecs });
assert.equal(restoreStudyTimerSession(legacy, startTime + 5_000)?.state, "running");
assert.equal(restoreStudyTimerSession(legacy, startTime + 5_000)?.secondsLeft, totalSecs - 5);

assert.equal(restoreStudyTimerSession("not-json", startTime), null);
assert.equal(restoreStudyTimerSession(JSON.stringify(running), startTime + totalSecs * 1000), null);

console.log("✅ study timer persistence tests passed");
