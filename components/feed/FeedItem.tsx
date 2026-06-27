"use client";

import { formatDistanceToNow } from "date-fns";
import { faIR } from "date-fns/locale";

const TYPE_LABEL: Record<string, (m: Record<string, unknown>) => string> = {
  session_complete: (m) => `${m.durationMin ?? 0} دقیقه مطالعه کرد`,
  mission_buy: () => "یک ماموریت جدید خرید",
  medal_earn: () => "مدال گرفت",
  level_up: (m) => `به سطح ${m.level ?? ""} رسید`,
};

interface Props {
  activity: {
    id: string;
    type: string;
    metadata: unknown;
    createdAt: Date;
    user: { name: string | null; avatarUrl: string | null };
  };
  config: { icon: string; color: string };
  index: number;
}

export default function FeedItem({ activity, config, index }: Props) {
  const meta = (activity.metadata ?? {}) as Record<string, unknown>;
  const label = TYPE_LABEL[activity.type]?.(meta) ?? activity.type;
  const name = activity.user.name ?? "کاربر";

  return (
    <div
      className="glass-card w-full rounded-xl p-4 flex items-center gap-4 feed-item-enter"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {activity.user.avatarUrl ? (
        <img src={activity.user.avatarUrl} className="w-12 h-12 rounded-full object-cover border border-outline-variant shrink-0" alt={name} />
      ) : (
        <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 border border-primary/20 text-[18px] font-bold text-primary">
          {name[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[16px] text-on-surface truncate">
          <span className="font-bold text-primary">{name}</span> {label}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-[14px] text-outline">schedule</span>
          <span className="text-[12px] text-outline">
            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: faIR })}
          </span>
        </div>
      </div>
      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
        <span className={`material-symbols-outlined ${config.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
          {config.icon}
        </span>
      </div>
    </div>
  );
}
