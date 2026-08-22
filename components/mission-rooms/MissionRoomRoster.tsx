"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import RoomCheerButton from "@/components/mission-rooms/RoomCheerButton";
import type { MissionRoomSnapshot } from "@/lib/mission-room";

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest.toLocaleString("fa-IR")} دقیقه`;
  if (rest === 0) return `${hours.toLocaleString("fa-IR")} ساعت`;
  return `${hours.toLocaleString("fa-IR")} ساعت و ${rest.toLocaleString("fa-IR")} دقیقه`;
}

export default function MissionRoomRoster({ initialRoom }: { initialRoom: MissionRoomSnapshot }) {
  const [room, setRoom] = useState(initialRoom);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/mission-rooms/${initialRoom.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as MissionRoomSnapshot;
      if (next?.id) setRoom(next);
    } catch {
      // Background refresh errors are non-fatal
    } finally {
      setIsRefreshing(false);
    }
  }, [initialRoom.id]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => void refresh(), 1000);
    };

    const poll = window.setInterval(() => void refresh(), 45_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    const memberIds = new Set(room.members.map((member) => member.userId));
    const events = new EventSource("/api/feed/stream");
    events.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type?: string;
          userId?: string;
          metadata?: { roomId?: string };
        };
        const isCheerForThisRoom = data.type === "room_cheer" && data.metadata?.roomId === initialRoom.id;
        const isMemberStudyEvent =
          (data.type === "session_complete" || data.type === "timer_start") &&
          (data.userId ? memberIds.has(data.userId) : false);

        if (isCheerForThisRoom || isMemberStudyEvent) {
          debouncedRefresh();
        }
      } catch {}
    };

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      events.close();
    };
  }, [refresh, initialRoom.id, room.members]);

  return (
    <section className="space-y-2.5" aria-labelledby="room-members-title" aria-live="polite">
      <div className="flex items-center justify-between px-1">
        <h2 id="room-members-title" className="flex items-center gap-1.5 text-[15px] font-extrabold text-on-surface">
          <span className="material-symbols-outlined text-[19px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
          اعضای کمپ
        </h2>
        <div className="flex items-center gap-1.5">
          {isRefreshing && <span className="h-2 w-2 animate-ping rounded-full bg-secondary" />}
          <span className="text-[11px] text-on-surface-variant">به‌روزرسانی زنده</span>
        </div>
      </div>

      {room.members.map((member) => (
        <article
          key={member.userId}
          className={`glass-card rounded-2xl border p-3.5 ${member.isCurrentUser ? "border-primary/55 bg-primary-fixed/30" : "border-outline-variant/30"}`}
        >
          <div className="flex items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold ${member.rank <= 3 ? "bg-tertiary-fixed text-tertiary" : "bg-surface-container text-on-surface-variant"}`}>
              {member.rank.toLocaleString("fa-IR")}
            </span>
            <Link href={member.isCurrentUser ? "/profile" : `/profile/${member.userId}`} className="relative shrink-0">
              {member.avatarUrl ? (
                <Image
                  src={member.avatarUrl}
                  alt={member.name}
                  width={44}
                  height={44}
                  unoptimized
                  className="h-11 w-11 rounded-full border border-outline-variant object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed text-[15px] font-extrabold text-primary">{member.name[0]}</span>
              )}
              {member.isStudying && <span className="absolute bottom-0 left-0 h-3.5 w-3.5 rounded-full border-[3px] border-surface-container-lowest bg-secondary" />}
            </Link>
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[13.5px] font-extrabold text-on-surface">{member.isCurrentUser ? "شما" : member.name}</p>
                {member.isStudying && <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[9px] font-bold text-on-secondary-container">در حال مطالعه</span>}
                {member.completed && <span className="material-symbols-outlined text-[17px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
              </div>
              <p className="mt-0.5 text-[10.5px] text-on-surface-variant">سطح {member.level}</p>
            </div>
            <div className="shrink-0 text-left">
              <p className="text-[12px] font-extrabold text-primary">{member.progress.toLocaleString("fa-IR")}٪</p>
              <p className="text-[9.5px] text-outline">{formatMinutes(member.studiedMin)}</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div className="h-full rounded-full bg-gradient-to-l from-tertiary-fixed-dim to-primary transition-[width] duration-500" style={{ width: `${member.progress}%` }} />
          </div>
          {!member.isCurrentUser && <RoomCheerButton roomId={room.id} targetUserId={member.userId} />}
        </article>
      ))}
    </section>
  );
}
