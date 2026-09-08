import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import AdminVideoRow from "@/components/admin/AdminVideoRow";
import VideoSettingsCard from "@/components/admin/VideoSettingsCard";
import { getVideoUnlockMode } from "@/lib/settings";


export default async function AdminVideosPage() {
  await connection();
  const [videos, unlockMode, progressGroups] = await Promise.all([
    prisma.video.findMany({
      orderBy: [{ sortOrder: "asc" }, { day: "asc" }, { createdAt: "desc" }, { id: "asc" }],
    }),
    getVideoUnlockMode(),
    prisma.videoProgress.groupBy({
      by: ["videoId", "completed"],
      where: {
        OR: [
          { lastProgressAt: { not: null } },
          { watchedSeconds: { gt: 0 } },
          { completed: true },
        ],
      },
      _count: { _all: true },
    }),
  ]);
  const trackingByVideo = new Map<string, { watched: number; completed: number }>();
  for (const group of progressGroups) {
    const tracking = trackingByVideo.get(group.videoId) ?? { watched: 0, completed: 0 };
    tracking.watched += group._count._all;
    if (group.completed) tracking.completed += group._count._all;
    trackingByVideo.set(group.videoId, tracking);
  }

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
        {videos.length > 1 && (
          <p className="text-[12px] text-on-surface-variant mb-1">
            با فلش‌های کنار هر ویدیو ترتیب نمایش را مستقل از روز بازشدن تغییر دهید.
          </p>
        )}
        {videos.length === 0 ? (
          <p className="text-[14px] text-outline py-8 text-center">هنوز ویدیویی ثبت نشده.</p>
        ) : (
          videos.map((v, index) => {
            const tracking = trackingByVideo.get(v.id) ?? { watched: 0, completed: 0 };
            return (
              <AdminVideoRow
                key={v.id}
                video={v}
                position={index + 1}
                watchedCount={tracking.watched}
                completedCount={tracking.completed}
                isFirst={index === 0}
                isLast={index === videos.length - 1}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
