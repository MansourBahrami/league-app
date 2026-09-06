-- Keep the shell badge O(1) instead of counting InboxItem on every navigation.
ALTER TABLE "User"
ADD COLUMN "unreadInboxCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "User" AS u
SET "unreadInboxCount" = unread_counts.count
FROM (
  SELECT "userId", COUNT(*)::INTEGER AS count
  FROM "InboxItem"
  WHERE "read" = false
  GROUP BY "userId"
) AS unread_counts
WHERE u."id" = unread_counts."userId";
