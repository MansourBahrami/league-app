const ALL_MEDAL_HOURS = [20, 25, 30, 35, 40, 45, 50, 53, 56, 60, 63, 66, 70];

interface Medal {
  id: string;
  name: string;
  targetHours: number;
  earnedAt: Date;
}

interface Props {
  medals: Medal[];
}

export default function MedalsSection({ medals }: Props) {
  const earnedHours = new Set(medals.map((m) => m.targetHours));

  return (
    <section className="glass-card rounded-xl p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center w-full">
        <h3 className="text-[16px] font-bold text-on-surface">مدال‌های من</h3>
        <span className="text-[14px] text-primary">{medals.length} مدال</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {ALL_MEDAL_HOURS.slice(0, 8).map((hours) => {
          const earned = earnedHours.has(hours);
          const count = medals.filter((m) => m.targetHours === hours).length;
          return (
            <div key={hours} className={`flex flex-col items-center gap-1 rounded-xl p-2 ${earned ? "bg-surface-container-low" : "bg-surface opacity-50 grayscale"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${earned ? "bg-gradient-to-br from-tertiary-fixed to-tertiary border-white shadow-inner" : "bg-outline-variant border-white"}`}>
                {earned ? (
                  <span className="text-white font-bold text-[12px]">{hours}h</span>
                ) : (
                  <span className="material-symbols-outlined text-outline text-[18px]">lock</span>
                )}
              </div>
              <span className="text-[12px] font-semibold text-on-surface-variant text-center">{hours} ساعت</span>
              {earned && count > 1 && (
                <span className="text-[10px] bg-outline-variant px-2 rounded-full text-on-surface-variant">x{count}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
