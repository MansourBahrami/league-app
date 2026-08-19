import SectionInfoButton from "@/components/ui/SectionInfoButton";

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
      infoTitle: "مجموع کل ساعت مطالعه",
      infoDesc: "مجموع کل زمان مطالعه تأییدشده توسط سرور از ابتدای ثبت‌نام در G-camp.",
      infoPoints: ["محاسبه دقیق بر اساس جلسات تایمر", "شامل تمامی جلسات آزاد و مأموریت‌ها"],
    },
    {
      label: "زنجیره",
      value: streak.toLocaleString("fa-IR"),
      unit: "روز",
      icon: "local_fire_department",
      iconClass: "bg-tertiary-fixed text-tertiary",
      infoTitle: "زنجیره پیوستگی مطالعه (Streak)",
      infoDesc: "تعداد روزهای متوالی که در هر کدام حداقل یک جلسه مطالعه ثبت کرده‌ای.",
      infoPoints: [
        "با ثبت حداقل یک جلسه مطالعه در هر روز، زنجیره ۱ روز افزایش می‌یابد.",
        "اگر یک روز هیچ مطالعه‌ای ثبت نشود، زنجیره بازنشانی می‌شود."
      ],
    },
    {
      label: "رتبه کلی",
      value: rank.toLocaleString("fa-IR"),
      unit: `از ${totalUsers.toLocaleString("fa-IR")}`,
      icon: "emoji_events",
      iconClass: "bg-secondary-container text-secondary",
      infoTitle: "رتبه کلی در سامانه",
      infoDesc: "جایگاه تو در بین تمام کاربران فعال بر اساس کل امتیاز XP کسب‌شده.",
      infoPoints: ["به‌روزرسانی هم‌زمان با اتمام هر جلسه مطالعه", "محاسبه بر اساس کل امتیازات کسب‌شده"],
    },
  ];

  return (
    <section className="grid grid-cols-3 gap-2" aria-label="خلاصه آمار مطالعه">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card relative flex min-w-0 flex-col items-center rounded-xl px-2 py-3 text-center">
          <div className="absolute top-1.5 left-1.5">
            <SectionInfoButton
              title={stat.infoTitle}
              description={stat.infoDesc}
              points={stat.infoPoints}
              icon={stat.icon}
              size="sm"
            />
          </div>
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
