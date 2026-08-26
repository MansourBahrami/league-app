import Link from "next/link";
import { prisma } from "@/lib/db";
import AdminVideoRow from "@/components/admin/AdminVideoRow";
import VideoSettingsCard from "@/components/admin/VideoSettingsCard";
import { getVideoUnlockMode } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const [videos, unlockMode] = await Promise.all([
    prisma.video.findMany({
      orderBy: [{ day: "asc" }, { createdAt: "desc" }],
    }),
    getVideoUnlockMode(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold text-on-surface">مدیریت ویدیوهای آموزشی</h1>
        <Link
          href="/admin/videos/new"
          className="bg-primary text-on-primary font-bold text-[14px] px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          ویدیوی جدید
        </Link>
      </div>

      <VideoSettingsCard initialMode={unlockMode} />

      <div className="flex flex-col gap-2">
        <h2 className="text-[16px] font-bold text-on-surface mt-2">لیست ویدیوها</h2>
        {videos.length === 0 ? (
          <p className="text-[14px] text-outline py-8 text-center">هنوز ویدیویی ثبت نشده.</p>
        ) : (
          videos.map((v) => <AdminVideoRow key={v.id} video={v} />)
        )}
      </div>
    </div>
  );
}
