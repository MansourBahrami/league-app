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
        <div className="w-12 h-12 rounded-full bg-[#e1e0ff]/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#4648d4] text-3xl">schedule</span>
        </div>
        <h3 className="text-[14px] font-semibold text-[#464554]">ساعات مطالعه</h3>
        <p className="text-[18px] font-bold text-[#0b1c30]">{totalHours.toLocaleString("fa-IR")} <span className="text-[13px] font-normal">ساعت</span></p>
      </div>
      <div className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-[#a36700]/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#825100] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
        </div>
        <h3 className="text-[14px] font-semibold text-[#464554]">زنجیره مطالعه</h3>
        <p className="text-[18px] font-bold text-[#0b1c30]">{streak.toLocaleString("fa-IR")} <span className="text-[13px] font-normal">روز</span></p>
      </div>
      <div className="glass-card rounded-xl p-4 flex items-center gap-3 col-span-2">
        <span className="material-symbols-outlined text-[#006c49] text-4xl">emoji_events</span>
        <div className="text-right">
          <h3 className="text-[14px] font-semibold text-[#464554]">رتبه در جدول برتر</h3>
          <p className="text-[18px] font-bold text-[#0b1c30]">جایگاه {rank.toLocaleString("fa-IR")} از {totalUsers.toLocaleString("fa-IR")}</p>
        </div>
      </div>
    </section>
  );
}
