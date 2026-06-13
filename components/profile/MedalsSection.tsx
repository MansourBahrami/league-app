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
        <h3 className="text-[20px] font-bold text-[#0b1c30]">مدال‌های من</h3>
        <span className="text-[14px] text-[#4648d4]">{medals.length} مدال</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {ALL_MEDAL_HOURS.slice(0, 8).map((hours) => {
          const earned = earnedHours.has(hours);
          const count = medals.filter((m) => m.targetHours === hours).length;
          return (
            <div key={hours} className={`flex flex-col items-center gap-1 rounded-xl p-2 ${earned ? "bg-[#eff4ff]" : "bg-[#f8f9ff] opacity-50 grayscale"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${earned ? "bg-gradient-to-br from-[#6cf8bb] to-[#006c49] border-white shadow-inner" : "bg-[#c7c4d7] border-white"}`}>
                {earned ? (
                  <span className="text-white font-bold text-[12px]">{hours}h</span>
                ) : (
                  <span className="material-symbols-outlined text-[#767586] text-[18px]">lock</span>
                )}
              </div>
              <span className="text-[12px] font-semibold text-[#464554] text-center">{hours} ساعت</span>
              {earned && count > 1 && (
                <span className="text-[10px] bg-[#c7c4d7] px-2 rounded-full text-[#464554]">x{count}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
