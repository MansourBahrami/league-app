import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { redis } from "@/lib/redis";
import { captureCaughtError, logOperationalEvent } from "@/lib/observability";
import { prisma } from "@/lib/db";

const FEED_CHANNEL = "gcamp:feed:events";
const FEED_RECENT_KEY = "gcamp:feed:recent";
const MAX_RECENT_EVENTS = 100;

interface FeedEnvelope {
  id: string;
  origin: string;
  data: object;
}

type FeedListener = (message: string) => void;

interface FeedGlobalState {
  instanceId: string;
  listeners: Set<FeedListener>;
  subscriber?: Redis;
  subscribePromise?: Promise<void>;
  lastReportedListenerBucket?: number;
}

const globalForFeed = globalThis as typeof globalThis & {
  __gcampFeedState?: FeedGlobalState;
};

const state = globalForFeed.__gcampFeedState ?? {
  instanceId: randomUUID(),
  listeners: new Set<FeedListener>(),
};
globalForFeed.__gcampFeedState = state;

function asSse(envelope: FeedEnvelope) {
  return `id: ${envelope.id}\ndata: ${JSON.stringify(envelope.data)}\n\n`;
}

function dispatchLocal(envelope: FeedEnvelope) {
  const message = asSse(envelope);
  for (const listener of state.listeners) {
    try {
      listener(message);
    } catch (error) {
      state.listeners.delete(listener);
      captureCaughtError("feed.local_listener", error);
    }
  }
}

async function ensureRedisSubscription() {
  if (state.subscribePromise) return state.subscribePromise;

  state.subscribePromise = (async () => {
    const subscriber = redis.duplicate({ lazyConnect: true });
    state.subscriber = subscriber;
    subscriber.on("message", (_channel, raw) => {
      try {
        const envelope = JSON.parse(raw) as FeedEnvelope;
        if (envelope.origin !== state.instanceId) dispatchLocal(envelope);
      } catch (error) {
        captureCaughtError("feed.redis_message", error);
      }
    });
    subscriber.on("error", (error) => {
      captureCaughtError("feed.redis_subscriber", error);
    });
    await subscriber.subscribe(FEED_CHANNEL);
  })().catch((error) => {
    state.subscribePromise = undefined;
    captureCaughtError("feed.redis_subscribe", error);
  });

  return state.subscribePromise;
}

export async function subscribeToFeed(listener: FeedListener): Promise<() => void> {
  state.listeners.add(listener);
  reportListenerCount();
  await ensureRedisSubscription();
  return () => {
    state.listeners.delete(listener);
    reportListenerCount();
  };
}

function reportListenerCount() {
  const count = state.listeners.size;
  void redis.hset("gcamp:metrics:sse_connections", state.instanceId, String(count))
    .then(() => redis.expire("gcamp:metrics:sse_connections", 120))
    .catch((caught) => captureCaughtError("sse.connection_metric", caught));
  const bucket = Math.floor(count / 100);
  if (bucket !== state.lastReportedListenerBucket) {
    state.lastReportedListenerBucket = bucket;
    logOperationalEvent("sse.connection_count", { instanceId: state.instanceId, count });
  }
}

/** آخرین رخدادها برای بازیابی اتصال SSE با Last-Event-ID. */
export async function getRecentFeedMessages(lastEventId: string | null): Promise<string[]> {
  if (!lastEventId) return [];
  try {
    const rawItems = await redis.lrange(FEED_RECENT_KEY, 0, MAX_RECENT_EVENTS - 1);
    const envelopes: FeedEnvelope[] = [];
    for (const raw of rawItems) {
      try {
        envelopes.push(JSON.parse(raw) as FeedEnvelope);
      } catch (caught) {
        captureCaughtError("feed.redis_replay_parse", caught);
      }
    }
    envelopes.reverse();
    const lastIndex = envelopes.findIndex((item) => item.id === lastEventId);
    if (lastIndex < 0) return [];
    return envelopes.slice(lastIndex + 1).map(asSse);
  } catch (error) {
    captureCaughtError("feed.redis_replay", error);
    return [];
  }
}

export function broadcastActivity(data: object) {
  void (async () => {
    const userId = (data as { userId?: unknown }).userId;
    if (typeof userId === "string") {
      const author = await prisma.user.findUnique({
        where: { id: userId },
        select: { activityPublic: true },
      });
      if (!author?.activityPublic) return;
    }

    const envelope: FeedEnvelope = {
      id: randomUUID(),
      origin: state.instanceId,
      data,
    };
    dispatchLocal(envelope);

    await redis.multi()
      .lpush(FEED_RECENT_KEY, JSON.stringify(envelope))
      .ltrim(FEED_RECENT_KEY, 0, MAX_RECENT_EVENTS - 1)
      .publish(FEED_CHANNEL, JSON.stringify(envelope))
      .exec();
  })().catch((error) => captureCaughtError("feed.redis_publish", error));
}
