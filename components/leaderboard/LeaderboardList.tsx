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
        <span className="text-[14px] text-on-surface-variant">موقعیت سایر کاربران</span>
      </div>
      <div className="space-y-3">
        {entries.map((entry) => (
          <Link
            key={entry.userId}
            href={`/profile/${entry.userId}`}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
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
            <div className={`font-bold flex items-end gap-1 ${entry.isCurrentUser ? "text-[20px] text-primary" : "text-[14px] text-on-surface-variant"}`}>
              {entry.weeklyXp.toLocaleString("fa-IR")}
              <span className={`font-normal mb-0.5 ${entry.isCurrentUser ? "text-[12px] text-primary-fixed-dim" : "text-[10px] text-outline"}`}>XP</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
