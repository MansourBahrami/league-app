-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "body" TEXT,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reaction_activityId_idx" ON "Reaction"("activityId");

-- CreateIndex
CREATE INDEX "Reaction_actorId_createdAt_idx" ON "Reaction"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "Reaction_targetUserId_idx" ON "Reaction"("targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_actorId_activityId_key" ON "Reaction"("actorId", "activityId");

-- CreateIndex
CREATE INDEX "InboxItem_userId_read_idx" ON "InboxItem"("userId", "read");

-- CreateIndex
CREATE INDEX "InboxItem_userId_createdAt_idx" ON "InboxItem"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ActivityLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
