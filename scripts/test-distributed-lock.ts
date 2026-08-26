import assert from "node:assert/strict";
import { redis } from "../lib/redis";
import { withDistributedLock } from "../lib/distributed-lock";

async function main() {
  const lockName = `test-${Date.now()}`;
  let executions = 0;
  const attempts = await Promise.all(Array.from({ length: 100 }, () =>
    withDistributedLock(lockName, async () => {
      executions += 1;
      await new Promise((resolve) => setTimeout(resolve, 100));
      return "done";
    }, 5_000),
  ));

  assert.equal(executions, 1);
  assert.equal(attempts.filter((result) => result.acquired).length, 1);

  const reacquired = await withDistributedLock(lockName, async () => "reacquired", 5_000);
  assert.equal(reacquired.acquired, true);
  assert.equal(await redis.exists(`gcamp:lock:${lockName}`), 0);
  console.log("✅ distributed Redis lock concurrency test passed");
}

void main().finally(async () => {
  await redis.quit();
});
