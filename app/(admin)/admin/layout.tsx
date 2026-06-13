import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/dashboard"); // غیرادمین‌ها به اپ برمی‌گردند

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col" dir="rtl">
      {/* Admin header */}
      <header className="bg-[#0b1c30] text-white px-5 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#6cf8bb]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          <span className="font-bold text-[16px]">پنل مدیریت</span>
        </div>
        <nav className="flex items-center gap-4 text-[14px]">
          <Link href="/admin" className="hover:text-[#6cf8bb] transition-colors">داشبورد</Link>
          <Link href="/admin/leads" className="hover:text-[#6cf8bb] transition-colors">لیدها</Link>
          <Link href="/admin/leaderboard" className="hover:text-[#6cf8bb] transition-colors">لیدربورد</Link>
          <Link href="/admin/videos" className="hover:text-[#6cf8bb] transition-colors">ویدیوها</Link>
          <Link href="/admin/tournaments" className="hover:text-[#6cf8bb] transition-colors">تورنومنت</Link>
          <Link href="/dashboard" className="text-[#c7c4d7] hover:text-white transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">exit_to_app</span>
            خروج
          </Link>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-[900px] mx-auto p-5">{children}</main>
    </div>
  );
}
