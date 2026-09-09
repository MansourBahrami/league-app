import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import AdminVideoRow from "@/components/admin/AdminVideoRow";
import VideoSettingsCard from "@/components/admin/VideoSettingsCard";
import VideoCategoryManager from "@/components/admin/VideoCategoryManager";
import { getVideoUnlockMode } from "@/lib/settings";


export default async function AdminVideosPage() {
  await connection();
  const [videos, categories, unlockMode, progressGroups] = await Promise.all([
    prisma.video.findMany({
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { day: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      include: { category: { select: { title: true } } },
    }),
    prisma.videoCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        requireSequential: true,
        _count: { select: { videos: true } },
      },
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

      <VideoCategoryManager
        initialCategories={categories.map((category) => ({
          id: category.id,
          title: category.title,
          requireSequential: category.requireSequential,
          videoCount: category._count.videos,
        }))}
      />

      <div className="flex flex-col gap-2">
        <h2 className="text-[16px] font-bold text-on-surface mt-2">لیست ویدیوها</h2>
        {videos.length > 1 && (
          <p className="text-[12px] text-on-surface-variant mb-1">
            با فلش‌های کنار هر ویدیو، ترتیب آن را داخل همان دسته مستقل از روز بازشدن تغییر دهید.
          </p>
        )}
        {videos.length === 0 ? (
          <p className="text-[14px] text-outline py-8 text-center">هنوز ویدیویی ثبت نشده.</p>
        ) : (
          [
            ...categories.map((category) => ({
              id: category.id,
              title: category.title,
              requireSequential: category.requireSequential,
              videos: videos.filter((video) => video.categoryId === category.id),
            })),
            {
              id: "uncategorized",
              title: "ویدیوهای تکی",
              requireSequential: false,
              videos: videos.filter((video) => video.categoryId === null),
            },
          ].filter((group) => group.videos.length > 0).map((group) => (
            <section key={group.id} className="mt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-[14px] font-bold text-on-surface">{group.title}</h3>
                {group.requireSequential && (
                  <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-[10px] font-bold text-primary">ترتیبی</span>
                )}
              </div>
              {group.videos.map((video, index) => {
                const tracking = trackingByVideo.get(video.id) ?? { watched: 0, completed: 0 };
                return (
                  <AdminVideoRow
                    key={video.id}
                    video={video}
                    position={index + 1}
                    watchedCount={tracking.watched}
                    completedCount={tracking.completed}
                    isFirst={index === 0}
                    isLast={index === group.videos.length - 1}
                  />
                );
              })}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
