ALTER TABLE "StudySession"
ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "StudySession_userId_clientRequestId_key"
ON "StudySession"("userId", "clientRequestId");
