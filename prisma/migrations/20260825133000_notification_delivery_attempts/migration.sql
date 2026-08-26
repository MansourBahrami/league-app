ALTER TABLE "NotificationLog"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'sent',
ADD COLUMN "errorCode" TEXT,
ADD COLUMN "durationMs" INTEGER;

CREATE INDEX "NotificationLog_ruleId_status_sentAt_idx"
ON "NotificationLog"("ruleId", "status", "sentAt");
