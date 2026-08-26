ALTER TABLE "UserMedal"
ADD COLUMN "sourceUserMissionId" TEXT;

ALTER TABLE "VideoProgress"
ADD COLUMN "lastProgressAt" TIMESTAMP(3);

ALTER TABLE "ActivityLog"
ADD COLUMN "dedupeKey" TEXT;

ALTER TABLE "InboxItem"
ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "UserMedal_sourceUserMissionId_key"
ON "UserMedal"("sourceUserMissionId");

CREATE UNIQUE INDEX "ActivityLog_dedupeKey_key"
ON "ActivityLog"("dedupeKey");

CREATE UNIQUE INDEX "InboxItem_dedupeKey_key"
ON "InboxItem"("dedupeKey");
