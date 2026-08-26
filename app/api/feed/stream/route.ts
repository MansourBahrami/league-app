import { NextRequest } from "next/server";
import { getRecentFeedMessages, subscribeToFeed } from "@/lib/feed-broadcast";
import { getSession } from "@/lib/auth";
import { getBlockedUserIds } from "@/lib/privacy";

function activityUserId(message: string): string | null {
  const dataLine = message.split("\n").find((line) => line.startsWith("data: "));
  if (!dataLine) return null;
  try {
    const data = JSON.parse(dataLine.slice(6)) as { userId?: unknown };
    return typeof data.userId === "string" ? data.userId : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const blockedIds = new Set(await getBlockedUserIds(session.userId));
  let send: ((data: string) => void) | null = null;
  let unsubscribe: (() => void) | null = null;
  const lastEventId = req.headers.get("last-event-id");
  const replay = await getRecentFeedMessages(lastEventId);

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      send = (data: string) => {
        try {
          controller.enqueue(enc.encode(data));
        } catch {}
      };

      // Send connection confirmation immediately so headers flush
      send(": connected\n\n");
      for (const message of replay) {
        const authorId = activityUserId(message);
        if (!authorId || !blockedIds.has(authorId)) send(message);
      }

      void subscribeToFeed((message) => {
        const authorId = activityUserId(message);
        if (!authorId || !blockedIds.has(authorId)) send?.(message);
      }).then((cleanup) => {
        unsubscribe = cleanup;
        if (req.signal.aborted) cleanup();
      });

      // Heartbeat every 25s to keep connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(enc.encode(": ping\n\n"));
        } catch {}
      }, 25000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}
