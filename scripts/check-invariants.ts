import { prisma } from "../lib/db";
import { redis } from "../lib/redis";
import { runBusinessInvariantAudit } from "../lib/invariants";

async function main() {
  const result = await runBusinessInvariantAudit();
  console.log(JSON.stringify(result, null, 2));

  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);

  if (
    result.negativeBalances > 0
    || result.staleSessions > 0
    || result.duplicateOpenSessions > 0
    || result.rewardMismatches > 0
    || result.inboxCountMismatches > 0
    || result.completedStudyMismatches > 0
  ) {
    process.exitCode = 1;
  }
}

void main();
