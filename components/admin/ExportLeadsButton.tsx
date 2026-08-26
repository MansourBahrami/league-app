"use client";

export default function ExportLeadsButton({ hot = false }: { hot?: boolean }) {
  const href = `/api/admin/leads/export${hot ? "?hot=1" : ""}`;
  return (
    <a
      href={href}
      className={`font-bold text-[13px] px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
        hot ? "bg-tertiary-container text-on-tertiary-container hover:bg-tertiary" : "bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">download</span>
      {hot ? "خروجی لیدهای داغ" : "خروجی CSV همه لیدها"}
    </a>
  );
}
