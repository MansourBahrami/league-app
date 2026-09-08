import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    // Redis یک شتاب‌دهنده است و نباید خرابی شبکه، navigation اپ را تا timeout
    // پیش‌فرض ده‌ثانیه‌ای نگه دارد. مسیرهای خواندن cache در صورت خطا fallback دارند.
    connectTimeout: 2_000,
    commandTimeout: 1_500,
  });

globalForRedis.redis = redis;
