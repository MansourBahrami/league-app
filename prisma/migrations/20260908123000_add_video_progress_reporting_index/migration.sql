-- گزارش ترکینگ هر ویدیو در پنل ادمین را با رشد داده سریع نگه می‌دارد.
CREATE INDEX "VideoProgress_videoId_completed_idx" ON "VideoProgress"("videoId", "completed");
