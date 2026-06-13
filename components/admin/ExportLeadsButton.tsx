"use client";

export default function ExportLeadsButton({ hot = false }: { hot?: boolean }) {
  const href = `/api/admin/leads/export${hot ? "?hot=1" : ""}`;
  return (
    <a
      href={href}
      className={`font-bold text-[13px] px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
        hot ? "bg-[#a36700] text-white hover:bg-[#825100]" : "bg-[#006c49] text-white hover:bg-[#00583b]"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">download</span>
      {hot ? "خروجی لیدهای داغ" : "خروجی CSV همه لیدها"}
    </a>
  );
}
