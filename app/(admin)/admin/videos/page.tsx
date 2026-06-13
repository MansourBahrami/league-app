import Link from "next/link";
import { prisma } from "@/lib/db";
import AdminVideoRow from "@/components/admin/AdminVideoRow";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const videos = await prisma.video.findMany({
    orderBy: [{ day: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold text-[#0b1c30]">مدیریت ویدیوهای آنبوردینگ</h1>
        <Link
          href="/admin/videos/new"
          className="bg-[#4648d4] text-white font-bold text-[14px] px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#3a3cc0] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          ویدیوی جدید
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {videos.length === 0 ? (
          <p className="text-[14px] text-[#767586] py-8 text-center">هنوز ویدیویی ثبت نشده.</p>
        ) : (
          videos.map((v) => <AdminVideoRow key={v.id} video={v} />)
        )}
      </div>
    </div>
  );
}
