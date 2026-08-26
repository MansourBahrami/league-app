import SectionInfoButton from "@/components/ui/SectionInfoButton";

const ALL_MEDAL_HOURS = [20, 25, 30, 35, 40, 45, 50, 53, 56, 60, 63, 66, 70];

interface Medal {
  id: string;
  name: string;
  targetHours: number;
  earnedAt: Date;
}

interface Props {
  medals: Medal[];
  title?: string;
}

export default function MedalsSection({ medals, title = "مدال‌های من" }: Props) {
  const earnedHours = new Set(medals.map((m) => m.targetHours));

  return (
    <section className="glass-card rounded-xl p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[16px] font-bold text-on-surface">{title}</h2>
          <SectionInfoButton
            title="مدال چطور می‌گیرم؟"
            description="مأموریت هفتگی رو کامل کن تا مدال همون مأموریت رو بگیری."
            icon="military_tech"
            points={[
              "مأموریت روزانه مدال نداره.",
              "بعضی سطح‌ها علاوه بر XP، مدال مشخص می‌خوان.",
              "مدال لازم برای مرحله بعد رو در بخش سطح می‌بینی."
            ]}
          />
        </div>
        <span className="text-[14px] text-primary">{medals.length} مدال</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {ALL_MEDAL_HOURS.slice(0, 8).map((hours) => {
          const earned = earnedHours.has(hours);
          const count = medals.filter((m) => m.targetHours === hours).length;
          return (
            <div key={hours} className={`flex flex-col items-center gap-1 rounded-xl p-2 ${earned ? "bg-surface-container-low" : "bg-surface opacity-50 grayscale"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${earned ? "bg-gradient-to-br from-tertiary-fixed to-tertiary border-surface-container-lowest shadow-inner" : "bg-outline-variant border-surface-container-lowest"}`}>
                {earned ? (
                  <span className="text-on-tertiary font-bold text-[12px]">{hours.toLocaleString("fa-IR")}</span>
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
