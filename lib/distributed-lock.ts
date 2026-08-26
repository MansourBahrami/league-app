import { randomUUID } from "node:crypto";
import { redis } from "@/lib/redis";
import { captureCaughtError } from "@/lib/observability";

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

const RENEW_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
end
return 0
`;

export async function withDistributedLock<T>(
  name: string,
  task: () => Promise<T>,
  ttlMs = 120_000,
): Promise<{ acquired: true; value: T } | { acquired: false }> {
  const key = `gcamp:lock:${name}`;
  const token = randomUUID();
  const acquired = await redis.set(key, token, "PX", ttlMs, "NX");
  if (acquired !== "OK") return { acquired: false };

  const renewEveryMs = Math.max(5_000, Math.min(30_000, Math.floor(ttlMs / 3)));
  const renewal = setInterval(() => {
    void redis.eval(RENEW_SCRIPT, 1, key, token, String(ttlMs));
  }, renewEveryMs);
  renewal.unref?.();

  try {
    return { acquired: true, value: await task() };
  } finally {
    clearInterval(renewal);
    await redis.eval(RELEASE_SCRIPT, 1, key, token).catch((error) => {
      captureCaughtError("distributed_lock.release", error, { lockName: name });
    });
  }
}
