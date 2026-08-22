-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivityLog_type_createdAt_idx" ON "ActivityLog"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt" DESC);
