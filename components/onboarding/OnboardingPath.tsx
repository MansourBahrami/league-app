import Link from "next/link";

interface Props {
  currentDay: number;
  totalDays?: number;
}

const ICONS = ["school", "menu_book", "timer", "trending_up", "bolt", "emoji_events"];

export default function OnboardingPath({ currentDay, totalDays = 6 }: Props) {
  const days = Array.from({ length: totalDays }, (_, i) => ({
    day: i + 1,
    label: `روز ${(i + 1).toLocaleString("fa-IR")}`,
    icon: ICONS[i % ICONS.length],
  }));

  return (
    <section className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3 flex-row-reverse">
        <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          route
        </span>
        <h3 className="text-[16px] font-bold text-on-surface">مسیر آنبوردینگ</h3>
        <span className="mr-auto text-[13px] text-on-surface-variant">{currentDay.toLocaleString("fa-IR")}/{totalDays.toLocaleString("fa-IR")} روز</span>
      </div>

      <div className="flex justify-between items-center gap-1 relative">
        {/* Progress line */}
        <div className="absolute top-5 right-5 left-5 h-1 bg-surface-container rounded-full -z-0">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (currentDay / totalDays) * 100)}%` }}
          />
        </div>

        {days.map(({ day, label, icon }) => {
          const isDone = currentDay >= day;
          const isCurrent = currentDay === day - 1;
          return (
            <Link
              key={day}
              href={isDone || isCurrent ? `/videos?day=${day}` : "#"}
              className={`flex flex-col items-center gap-1 z-10 ${isDone || isCurrent ? "cursor-pointer" : "cursor-default"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isDone
                    ? "bg-primary shadow-lg shadow-primary/30"
                    : isCurrent
                    ? "bg-white border-2 border-primary"
                    : "bg-surface-container border border-outline-variant"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    isDone ? "text-white" : isCurrent ? "text-primary" : "text-outline-variant"
                  }`}
                  style={{ fontVariationSettings: isDone ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {isDone ? "check_circle" : icon}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold ${
                  isDone || isCurrent ? "text-primary" : "text-outline-variant"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
