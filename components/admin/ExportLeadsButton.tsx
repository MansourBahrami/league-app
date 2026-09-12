interface Props {
  hot?: boolean;
  videoHot?: boolean;
  minCompleted?: number;
  categoryId?: string;
}

export default function ExportLeadsButton({
  hot = false,
  videoHot = false,
  minCompleted,
  categoryId,
}: Props) {
  const params = new URLSearchParams();
  if (hot) params.set("hot", "1");
  if (videoHot) params.set("videoHot", "1");
  if (minCompleted) params.set("minCompleted", String(minCompleted));
  if (categoryId) params.set("categoryId", categoryId);
  const href = `/api/admin/leads/export${params.size ? `?${params.toString()}` : ""}`;
  const label = videoHot
    ? "خروجی کال‌سنتر"
    : hot
      ? "خروجی لیدهای داغ مطالعه"
      : "خروجی CSV همه لیدها";
  return (
    <a
      href={href}
      className={`font-bold text-[13px] px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
        videoHot
          ? "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
          : hot
            ? "bg-tertiary-container text-on-tertiary-container hover:bg-tertiary"
            : "bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">download</span>
      {label}
    </a>
  );
}
