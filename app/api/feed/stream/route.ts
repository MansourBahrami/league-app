import { NextRequest } from "next/server";
import { feedSubscribers } from "@/lib/feed-broadcast";

export async function GET(req: NextRequest) {
  let send: ((data: string) => void) | null = null;

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

      feedSubscribers.add(send);

      // Heartbeat every 25s to keep connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(enc.encode(": ping\n\n"));
        } catch {}
      }, 25000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        if (send) feedSubscribers.delete(send);
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
