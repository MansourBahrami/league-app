interface Props {
  totalHours: number;
  streak: number;
  rank: number;
  totalUsers: number;
}

export default function StatsGrid({ totalHours, streak, rank, totalUsers }: Props) {
  return (
    <section className="grid grid-cols-2 gap-2">
      <div className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-primary-fixed/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-3xl">schedule</span>
        </div>
        <h3 className="text-[14px] font-semibold text-on-surface-variant">ساعات مطالعه</h3>
        <p className="text-[18px] font-bold text-on-surface">{totalHours.toLocaleString("fa-IR")} <span className="text-[13px] font-normal">ساعت</span></p>
      </div>
      <div className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-tertiary-container/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-tertiary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
        </div>
        <h3 className="text-[14px] font-semibold text-on-surface-variant">زنجیره مطالعه</h3>
        <p className="text-[18px] font-bold text-on-surface">{streak.toLocaleString("fa-IR")} <span className="text-[13px] font-normal">روز</span></p>
      </div>
      <div className="glass-card rounded-xl p-4 flex items-center gap-3 col-span-2">
        <span className="material-symbols-outlined text-tertiary text-4xl">emoji_events</span>
        <div className="text-right">
          <h3 className="text-[14px] font-semibold text-on-surface-variant">رتبه در جدول برتر</h3>
          <p className="text-[18px] font-bold text-on-surface">جایگاه {rank.toLocaleString("fa-IR")} از {totalUsers.toLocaleString("fa-IR")}</p>
        </div>
      </div>
    </section>
  );
}
