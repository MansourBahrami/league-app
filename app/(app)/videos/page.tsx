import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import VideoCard from "@/components/videos/VideoCard";
import RouteLoading from "@/components/layout/RouteLoading";
import { getVideoPrice } from "@/lib/ab";
import { getVideoUnlockMode } from "@/lib/settings";
import { tehranDayDiff } from "@/lib/date";
import { getAppUserSnapshot, preloadAppUserSnapshot } from "@/lib/app-user";
import { getActiveVideoCatalogSnapshot } from "@/lib/catalog-cache";
import VideoCategoryCard from "@/components/videos/VideoCategoryCard";

async function VideosContent() {
  const session = await getSession();
  if (!session) redirect("/login");
  preloadAppUserSnapshot(session.userId);

  // همهٔ داده‌های مستقل را در یک موج می‌خوانیم. progress هر کاربر حداکثر یک
  // ردیف به‌ازای هر ویدیو دارد، پس لازم نیست برای ساخت IN منتظر کاتالوگ بمانیم.
  const [user, unlockMode, catalog, progresses] = await Promise.all([
    getAppUserSnapshot(session.userId),
    getVideoUnlockMode(),
    getActiveVideoCatalogSnapshot(),
    prisma.videoProgress.findMany({ where: { userId: session.userId } }),
  ]);
  if (!user) redirect("/login");

  const isPaid = user.videoAccess === "paid";
  const daysSinceReg = Math.max(1, tehranDayDiff(new Date(), user.createdAt) + 1);

  // ویدیوهای متناسب با پایه؛ وضعیت قفل بر اساس تنظیم ادمین (همه باز یا روزبه‌روز).
  const videos = catalog.filter((video) =>
    video.grades.length === 0 || (!!user.grade && video.grades.includes(user.grade))
  );
  const progressMap = new Map(progresses.map((p) => [p.videoId, p]));
  const categoryMap = new Map<string, {
    id: string;
    title: string;
    sortOrder: number;
    requireSequential: boolean;
    videos: typeof videos;
  }>();
  for (const video of videos) {
    if (!video.category) continue;
    const current = categoryMap.get(video.category.id) ?? { ...video.category, videos: [] };
    current.videos.push(video);
    categoryMap.set(video.category.id, current);
  }
  const categories = [...categoryMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  const standaloneVideos = videos.filter((video) => !video.categoryId);

  return (
    <div className="flex flex-col px-5">
      <div className="mb-6 mt-2">
        <h2 className="text-[20px] font-bold text-primary">ویدیوهای آموزشی</h2>
        <p className="text-[13px] text-on-surface-variant mt-1">آموزش‌های متناسب با پایه تو</p>
      </div>

      <div data-tour="videos" className="flex flex-col gap-4">
        {videos.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] text-outline-variant mb-3 block">video_library</span>
            <p>هنوز ویدیویی برای پایه تو تعریف نشده.</p>
          </div>
        ) : (<>
          {categories.map((category) => (
            <VideoCategoryCard
              key={category.id}
              category={category}
              videoCount={category.videos.length}
              completedCount={category.videos.filter((video) => progressMap.get(video.id)?.completed).length}
            />
          ))}

          {standaloneVideos.map((video) => {
            const prog = progressMap.get(video.id);
            const isCompleted = prog?.completed ?? false;
            const isFuture = video.day > 0 && unlockMode !== "all" && video.day > daysSinceReg;
            let isLocked: boolean;
            let purchasable = false;
            let price = 0;
            if (isPaid) {
              const purchased = !!prog?.purchasedAt;
              if (purchased) {
                isLocked = false;
              } else if (isFuture) {
                isLocked = true; // هنوز در دسترس نیست
              } else if (video.day > 0) {
                // در دسترس ولی خریده‌نشده
                isLocked = false;
                purchasable = true;
                price = getVideoPrice(video.day);
              } else {
                isLocked = false;
              }
            } else {
              // گروه free: اگر future نباشد باز است
              isLocked = isFuture;
            }
            const watchPct = prog && video.durationMin > 0
              ? Math.round((prog.watchedSeconds / (video.durationMin * 60)) * 100)
              : 0;
            const lockNote = isLocked
              ? `${Math.max(1, video.day - daysSinceReg).toLocaleString("fa-IR")} روز دیگه باز میشه.`
              : undefined;
            return (
              <VideoCard
                key={video.id}
                video={video}
                watchPct={watchPct}
                isCompleted={isCompleted}
                isLocked={isLocked}
                lockNote={lockNote}
                purchasable={purchasable}
                price={price}
              />
            );
          })}
        </>)}
      </div>
    </div>
  );
}

export default function VideosPage() {
  return (
    <Suspense fallback={<RouteLoading titleWidth="w-32" primaryHeight="h-44" rows={3} />}>
      <VideosContent />
    </Suspense>
  );
}
