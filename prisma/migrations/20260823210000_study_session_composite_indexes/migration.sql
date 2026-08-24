-- مسیرهای پرتکرار گزارش، ماموریت و بررسی session فعال را پوشش می‌دهد.
CREATE INDEX "StudySession_userId_startTime_idx"
ON "StudySession"("userId", "startTime");

CREATE INDEX "StudySession_userId_endTime_idx"
ON "StudySession"("userId", "endTime");

CREATE INDEX "StudySession_endTime_pausedAt_startTime_idx"
ON "StudySession"("endTime", "pausedAt", "startTime");
