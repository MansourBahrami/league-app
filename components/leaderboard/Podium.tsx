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

type Placement = {
  entry: Entry | undefined;
  rank: 1 | 2 | 3;
  cardClass: string;
  avatarClass: string;
  badgeClass: string;
  scoreClass: string;
};

export default function Podium({ top3 }: Props) {
  const [first, second, third] = [top3[0], top3[1], top3[2]];
  const placements: Placement[] = [
    {
      entry: second,
      rank: 2,
      cardClass: "translate-y-3 border-primary-fixed-dim/70 bg-surface-container-lowest/85 pt-4",
      avatarClass: "h-14 w-14 border-primary-fixed-dim",
      badgeClass: "bg-primary text-on-primary",
      scoreClass: "text-primary",
    },
    {
      entry: first,
      rank: 1,
      cardClass: "-translate-y-2 border-tertiary-fixed-dim bg-gradient-to-b from-tertiary-fixed/85 to-surface-container-lowest pt-7 shadow-[0_12px_30px_color-mix(in_oklab,var(--color-tertiary-fixed-dim)_18%,transparent)]",
      avatarClass: "h-[4.75rem] w-[4.75rem] border-[3px] border-tertiary-fixed-dim",
      badgeClass: "bg-tertiary-fixed-dim text-on-tertiary-fixed",
      scoreClass: "text-tertiary",
    },
    {
      entry: third,
      rank: 3,
      cardClass: "translate-y-3 border-secondary-container bg-surface-container-lowest/85 pt-4",
      avatarClass: "h-14 w-14 border-secondary-container",
      badgeClass: "bg-secondary text-on-secondary",
      scoreClass: "text-secondary",
    },
  ];

  return (
    <section
      aria-label="سه نفر برتر این هفته"
      className="relative overflow-hidden rounded-[2rem] border border-outline-variant/35 bg-surface-container-low/75 px-3 pb-6 pt-10 shadow-[0_14px_36px_color-mix(in_oklab,var(--color-primary)_8%,transparent)]"
    >
      <div className="pointer-events-none absolute -top-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-tertiary-fixed/60 blur-3xl" />

      <div className="relative flex items-end justify-center gap-2">
        {placements.map(({ entry, rank, cardClass, avatarClass, badgeClass, scoreClass }) => {
          if (!entry) return null;
          const isFirst = rank === 1;

          return (
            <Link
              key={entry.userId}
              href={`/profile/${entry.userId}`}
              aria-label={`رتبه ${rank.toLocaleString("fa-IR")}: ${entry.name}`}
              className={`relative flex min-w-0 max-w-[10rem] flex-1 flex-col items-center rounded-[1.5rem] border px-2 pb-4 text-center transition-[box-shadow,border-color] hover:shadow-md ${cardClass} ${entry.isCurrentUser ? "ring-2 ring-primary/35 ring-offset-2 ring-offset-surface-container-low" : ""}`}
            >
              {isFirst && (
                <span
                  className="material-symbols-outlined absolute -top-6 left-1/2 -translate-x-1/2 text-[34px] text-tertiary-fixed-dim drop-shadow-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  workspace_premium
                </span>
              )}

              {entry.isCurrentUser && (
                <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-on-primary">
                  شما
                </span>
              )}

              <div className="relative mb-4">
                <div className={`overflow-hidden rounded-full border-2 bg-surface-container-lowest shadow-sm ${avatarClass}`}>
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} className="h-full w-full object-cover" alt={entry.name} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[22px] font-extrabold text-primary">
                      {entry.name[0]}
                    </div>
                  )}
                </div>
                <span className={`absolute -bottom-2 left-1/2 flex h-6 min-w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-surface-container-lowest px-1 text-[11px] font-extrabold shadow-sm ${badgeClass}`}>
                  {rank.toLocaleString("fa-IR")}
                </span>
              </div>

              <span className={`w-full truncate font-extrabold text-on-surface ${isFirst ? "text-[15px]" : "text-[13px]"}`}>
                {entry.isCurrentUser ? "شما" : entry.name}
              </span>
              <span className={`mt-1 flex items-baseline gap-1 font-extrabold ${isFirst ? "text-[17px]" : "text-[14px]"} ${scoreClass}`}>
                {entry.weeklyXp.toLocaleString("fa-IR")}
                <span className="text-[10px] font-bold">XP</span>
              </span>
              <span className="mt-1 whitespace-nowrap text-[10px] text-on-surface-variant">
                {formatStudyMinutes(entry.weeklyMinutes)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
