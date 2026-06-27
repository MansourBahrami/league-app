"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

interface Entry {
  rank: number;
  name: string;
  avatarUrl: string | null;
  weeklyXp: number;
  isCurrentUser: boolean;
  userId: string;
}

interface Props {
  entries: Entry[];
  currentUserId: string;
}

export default function LeaderboardList({ entries }: Props) {
  // لیست داخل یک باکسِ با ارتفاع ثابت اسکرول می‌خورد (نه کلِ صفحه). ردیف‌های نزدیک
  // مرکزِ باکس صاف و شفاف‌اند و هرچه به بالا/پایینِ باکس می‌روند دور محور افقی
  // می‌چرخند و محو می‌شوند — اثرِ غلتک/استوانه.
  const boxRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let ticking = false;

    const apply = () => {
      ticking = false;
      const boxRect = box.getBoundingClientRect();
      const center = boxRect.top + boxRect.height / 2;
      const radius = boxRect.height / 2; // فاصله‌ی لبه‌ی باکس تا مرکز = خمِ کامل

      for (const el of rowsRef.current) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const rowCenter = rect.top + rect.height / 2;
        const norm = Math.max(-1.2, Math.min(1.2, (rowCenter - center) / radius));
        const absn = Math.min(1, Math.abs(norm));

        const rotateX = -norm * 50; // چرخش دور محور افقی (اثر استوانه)
        const scale = 1 - absn * 0.14;
        const opacity = 1 - absn * 0.85;

        el.style.transform = `perspective(640px) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        el.style.opacity = opacity.toFixed(3);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };

    apply();
    requestAnimationFrame(apply);
    box.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      box.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [entries.length]);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex justify-between items-center px-2 mb-2">
        <span className="text-[14px] text-on-surface-variant">موقعیت سایر کاربران</span>
      </div>

      {/* باکسِ غلتکی: ارتفاع ثابت، اسکرول داخلی، لبه‌های محو با ماسک */}
      <div
        ref={boxRef}
        className="h-[336px] overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)",
        }}
      >
        {/* فاصله‌ی بالا/پایین تا ردیف‌های ابتدا و انتها هم بتوانند به مرکزِ باکس برسند */}
        <div className="space-y-3 py-[96px] [transform-style:preserve-3d]">
          {entries.map((entry, i) => (
            <Link
              key={entry.userId}
              ref={(el) => { rowsRef.current[i] = el; }}
              href={`/profile/${entry.userId}`}
              style={{ willChange: "transform, opacity", transformOrigin: "center center" }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-[border-color] ${
                entry.isCurrentUser
                  ? "bg-gradient-to-l from-surface-container to-primary-fixed border-2 border-primary/40 shadow-[0_8px_20px_rgba(70,72,212,0.12)] relative"
                  : "bg-surface-container-lowest/80 border-outline-variant/30 hover:border-primary/30 cursor-pointer"
              }`}
            >
              {entry.isCurrentUser && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-r-xl" />
              )}
              <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[13px] font-extrabold ${
                entry.isCurrentUser ? "bg-primary text-on-primary" : "bg-primary-fixed text-primary"
              }`}>
                {entry.rank.toLocaleString("fa-IR")}
              </div>
              <div className={`rounded-full overflow-hidden border shrink-0 ${entry.isCurrentUser ? "w-12 h-12 border-2 border-primary" : "w-10 h-10 border border-outline-variant/20"}`}>
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} className="w-full h-full object-cover" alt={entry.name} />
                ) : (
                  <div className="w-full h-full bg-primary-fixed flex items-center justify-center font-bold text-primary">
                    {entry.name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-on-surface truncate">{entry.isCurrentUser ? "شما" : entry.name}</div>
                {entry.isCurrentUser && (
                  <div className="text-[11px] text-primary mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                    در حال صعود
                  </div>
                )}
              </div>
              <div className={`font-bold flex items-end gap-1 ${entry.isCurrentUser ? "text-[17px] text-primary" : "text-[14px] text-on-surface-variant"}`}>
                {entry.weeklyXp.toLocaleString("fa-IR")}
                <span className={`font-normal mb-0.5 ${entry.isCurrentUser ? "text-[12px] text-primary-fixed-dim" : "text-[10px] text-outline"}`}>XP</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
