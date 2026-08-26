CREATE TABLE "AuthAttempt" (
  "id" TEXT NOT NULL,
  "identityHash" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "errorCode" TEXT,
  "durationMs" INTEGER NOT NULL,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuthAttempt_action_status_createdAt_idx" ON "AuthAttempt"("action", "status", "createdAt" DESC);
CREATE INDEX "AuthAttempt_identityHash_createdAt_idx" ON "AuthAttempt"("identityHash", "createdAt" DESC);
