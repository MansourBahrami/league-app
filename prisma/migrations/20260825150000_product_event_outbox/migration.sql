CREATE TABLE "ProductEventOutbox" (
  "id" TEXT NOT NULL,
  "distinctId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "properties" JSONB NOT NULL DEFAULT '{}',
  "insertId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "ProductEventOutbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductEventOutbox_insertId_key" ON "ProductEventOutbox"("insertId");
CREATE INDEX "ProductEventOutbox_status_nextAttemptAt_idx" ON "ProductEventOutbox"("status", "nextAttemptAt");
CREATE INDEX "ProductEventOutbox_createdAt_idx" ON "ProductEventOutbox"("createdAt" DESC);
