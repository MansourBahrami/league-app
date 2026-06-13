import Link from "next/link";

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

export default function LeaderboardList({ entries, currentUserId }: Props) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex justify-between items-center px-2 mb-2">
        <span className="text-[14px] text-[#464554]">موقعیت سایر کاربران</span>
      </div>
      <div className="space-y-3">
        {entries.map((entry) => (
          <Link
            key={entry.userId}
            href={`/profile/${entry.userId}`}
            className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
              entry.isCurrentUser
                ? "bg-[#e5eeff] border-2 border-[#4648d4]/40 shadow-[0_8px_20px_rgba(70,72,212,0.08)] relative"
                : "bg-white/80 border-[#c7c4d7]/30 opacity-80 hover:opacity-100 hover:border-[#4648d4]/30 cursor-pointer"
            }`}
          >
            {entry.isCurrentUser && (
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#4648d4] rounded-r-xl" />
            )}
            <div className="w-8 text-center text-[14px] font-bold text-[#767586]">
              {entry.rank.toLocaleString("fa-IR")}
            </div>
            <div className={`rounded-full overflow-hidden border shrink-0 ${entry.isCurrentUser ? "w-12 h-12 border-2 border-[#4648d4]" : "w-10 h-10 border border-[#c7c4d7]/20"}`}>
              {entry.avatarUrl ? (
                <img src={entry.avatarUrl} className="w-full h-full object-cover" alt={entry.name} />
              ) : (
                <div className="w-full h-full bg-[#e1e0ff] flex items-center justify-center font-bold text-[#4648d4]">
                  {entry.name[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-[#0b1c30] truncate">{entry.isCurrentUser ? "شما" : entry.name}</div>
              {entry.isCurrentUser && (
                <div className="text-[11px] text-[#4648d4] mt-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                  در حال صعود
                </div>
              )}
            </div>
            <div className={`font-bold flex items-end gap-1 ${entry.isCurrentUser ? "text-[20px] text-[#4648d4]" : "text-[14px] text-[#464554]"}`}>
              {entry.weeklyXp.toLocaleString("fa-IR")}
              <span className={`font-normal mb-0.5 ${entry.isCurrentUser ? "text-[12px] text-[#c0c1ff]" : "text-[10px] text-[#767586]"}`}>XP</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
