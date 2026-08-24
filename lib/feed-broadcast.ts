// In-memory subscriber list for SSE broadcast
export const feedSubscribers = new Set<(data: string) => void>();

export function broadcastActivity(data: object) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  feedSubscribers.forEach((send) => {
    try {
      send(message);
    } catch {}
  });
}
