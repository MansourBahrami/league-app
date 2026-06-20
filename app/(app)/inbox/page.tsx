import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listInbox } from "@/lib/inbox";
import InboxClient from "@/components/inbox/InboxClient";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = await listInbox(session.userId);

  // سریال‌سازی برای کلاینت
  const serialized = items.map((it) => ({
    id: it.id,
    type: it.type,
    body: it.body,
    metadata: it.metadata as Record<string, unknown> | null,
    read: it.read,
    createdAt: it.createdAt.toISOString(),
    actor: it.actor ? { id: it.actor.id, name: it.actor.name, avatarUrl: it.actor.avatarUrl } : null,
  }));

  return (
    <div className="flex flex-col items-center w-full px-4">
      <div className="glass-card w-full rounded-2xl px-4 py-2.5 flex items-center gap-2.5 flex-row-reverse mb-4">
        <div className="w-8 h-8 rounded-xl bg-[#4648d4] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
        </div>
        <h2 className="text-[15px] font-bold text-[#0b1c30] flex-1 text-right">صندوق</h2>
      </div>

      <InboxClient initialItems={serialized} />
    </div>
  );
}
