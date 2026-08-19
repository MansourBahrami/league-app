interface Props {
  totalHours: number;
  streak: number;
  rank: number;
  totalUsers: number;
}

export default function StatsGrid({ totalHours, streak, rank, totalUsers }: Props) {
  const stats = [
    {
      label: "کل مطالعه",
      value: totalHours.toLocaleString("fa-IR"),
      unit: "ساعت",
      icon: "schedule",
      iconClass: "bg-primary-fixed text-primary",
    },
    {
      label: "زنجیره",
      value: streak.toLocaleString("fa-IR"),
      unit: "روز",
      icon: "local_fire_department",
      iconClass: "bg-tertiary-fixed text-tertiary",
    },
    {
      label: "رتبه کلی",
      value: rank.toLocaleString("fa-IR"),
      unit: `از ${totalUsers.toLocaleString("fa-IR")}`,
      icon: "emoji_events",
      iconClass: "bg-secondary-container text-secondary",
    },
  ];

  return (
    <section className="grid grid-cols-3 gap-2" aria-label="خلاصه آمار مطالعه">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card flex min-w-0 flex-col items-center rounded-xl px-2 py-3 text-center">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${stat.iconClass}`}>
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              {stat.icon}
            </span>
          </span>
          <h2 className="mt-1.5 truncate text-[11px] font-semibold text-on-surface-variant">{stat.label}</h2>
          <p className="mt-0.5 text-[16px] font-extrabold leading-tight text-on-surface">{stat.value}</p>
          <span className="mt-0.5 text-[10px] text-outline">{stat.unit}</span>
        </div>
      ))}
    </section>
  );
}
