import Link from "next/link";
import { formatStudyMinutes } from "@/lib/gamification";

interface Entry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  weeklyXp: number;
  weeklyMinutes: number;
  isCurrentUser: boolean;
}

interface Props {
  top3: Entry[];
}

export default function Podium({ top3 }: Props) {
  const [first, second, third] = [top3[0], top3[1], top3[2]];
  const count = [first, second, third].filter(Boolean).length;

  // ارتفاع سکّو با تعداد نفرات تطبیق می‌یابد تا حالت کم‌نفر، خالی به‌نظر نرسد
  const rowCls =
    count >= 3 ? "items-end h-44 pb-4" : count === 2 ? "items-end h-36 pb-4" : "items-center py-2";

  return (
    <section className="bg-surface-container/50 rounded-xl p-6 border border-outline-variant/30 backdrop-blur-md shadow-[inset_0_0_20px_rgba(255,255,255,0.5)]">
      <div className={`flex justify-center gap-2 ${rowCls}`}>
        {/* Rank 2 */}
        {second && (
          <Link href={`/profile/${second.userId}`} className="flex flex-col items-center w-1/3 translate-y-4 hover:scale-105 transition-transform">
            <div className="w-14 h-14 rounded-full bg-surface-container-lowest border-2 border-outline-variant shadow-sm relative overflow-hidden">
              {second.avatarUrl ? (
                <img src={second.avatarUrl} className="w-full h-full object-cover" alt={second.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[20px] font-bold text-on-surface-variant">{second.name[0]}</div>
              )}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-surface-container-lowest text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full border border-outline-variant">#۲</div>
            </div>
            <span className="text-[14px] font-bold mt-4 text-on-surface truncate w-full text-center">{second.name}</span>
            <span className="text-[12px] text-primary/80 font-bold">{second.weeklyXp.toLocaleString("fa-IR")} XP</span>
            <span className="text-[10px] text-on-surface-variant">{formatStudyMinutes(second.weeklyMinutes)}</span>
          </Link>
        )}
        {/* Rank 1 */}
        {first && (
          <Link href={`/profile/${first.userId}`} className="flex flex-col items-center w-[40%] hover:scale-105 transition-transform">
            <div className="w-20 h-20 rounded-full bg-surface-container-lowest border-4 border-tertiary-fixed-dim shadow-[0_10px_20px_rgba(255,185,95,0.3)] relative overflow-hidden">
              {first.avatarUrl ? (
                <img src={first.avatarUrl} className="w-full h-full object-cover" alt={first.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[26px] font-bold text-primary">{first.name[0]}</div>
              )}
              <span className="material-symbols-outlined absolute -top-3 left-1/2 -translate-x-1/2 text-tertiary-fixed-dim text-3xl drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                social_leaderboard
              </span>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-tertiary-fixed-dim text-on-tertiary-fixed text-xs font-bold px-3 py-0.5 rounded-full shadow-sm">#۱</div>
            </div>
            <span className="text-[16px] font-bold mt-5 text-on-surface truncate w-full text-center">{first.name}</span>
            <span className="text-[14px] text-tertiary font-bold">{first.weeklyXp.toLocaleString("fa-IR")} XP</span>
            <span className="text-[11px] text-on-surface-variant">{formatStudyMinutes(first.weeklyMinutes)}</span>
          </Link>
        )}
        {/* Rank 3 */}
        {third && (
          <Link href={`/profile/${third.userId}`} className="flex flex-col items-center w-1/3 translate-y-4 hover:scale-105 transition-transform">
            <div className="w-14 h-14 rounded-full bg-surface-container-lowest border-2 border-outline-variant/60 shadow-sm relative overflow-hidden">
              {third.avatarUrl ? (
                <img src={third.avatarUrl} className="w-full h-full object-cover" alt={third.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[20px] font-bold text-on-surface-variant">{third.name[0]}</div>
              )}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-surface-container-lowest text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full border border-outline-variant/60">#۳</div>
            </div>
            <span className="text-[14px] font-bold mt-4 text-on-surface truncate w-full text-center">{third.name}</span>
            <span className="text-[12px] text-primary/80 font-bold">{third.weeklyXp.toLocaleString("fa-IR")} XP</span>
            <span className="text-[10px] text-on-surface-variant">{formatStudyMinutes(third.weeklyMinutes)}</span>
          </Link>
        )}
      </div>
    </section>
  );
}
