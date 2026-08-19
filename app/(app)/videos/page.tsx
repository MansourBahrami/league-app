import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import VideoCard from "@/components/videos/VideoCard";
import { gradeFilter } from "@/lib/onboarding";
import { getVideoPrice } from "@/lib/ab";
import { getVideoUnlockMode } from "@/lib/settings";
import { tehranDayDiff } from "@/lib/date";
import SectionInfoButton from "@/components/ui/SectionInfoButton";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, unlockMode] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { onboardingDay: true, grade: true, videoAccess: true, createdAt: true },
    }),
    getVideoUnlockMode(),
  ]);
  if (!user) redirect("/login");

  const isPaid = user.videoAccess === "paid";
  const daysSinceReg = Math.max(1, tehranDayDiff(new Date(), user.createdAt) + 1);

  // ویدیوهای متناسب با پایه؛ وضعیت قفل بر اساس تنظیم ادمین (همه باز یا روزبه‌روز).
  const videos = await prisma.video.findMany({
    where: { isActive: true, day: { gte: 1 }, ...gradeFilter(user.grade) },
    orderBy: { day: "asc" },
  });

  const progresses = await prisma.videoProgress.findMany({
    where: { userId: session.userId, videoId: { in: videos.map((v) => v.id) } },
  });
  const progressMap = new Map(progresses.map((p) => [p.videoId, p]));

  return (
    <div className="flex flex-col px-5">
      <div className="mb-6 mt-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[20px] font-bold text-primary">ویدیوهای آموزشی</h2>
          <SectionInfoButton
            title="ویدیوهای آموزشی و پاداش‌ها"
            description="ویدیوهای مشاوره‌ای و درسی متناسب با پایه تحصیلی تو برای افزایش بازدهی مطالعه."
            points={[
              "با تماشای کامل هر ویدیو سکه دریافت می‌کنی.",
              "تماشای ویدیو در ۲۴ ساعت اول انتشار دارای پاداش ۲ برابری سکه است."
            ]}
          />
        </div>
        <p className="text-[13px] text-on-surface-variant mt-1">آموزش‌های متناسب با پایه تو</p>
      </div>

      {/* Videos (باز + قفل) */}
      <div data-tour="videos" className="flex flex-col gap-4">
        {videos.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] text-outline-variant mb-3 block">video_library</span>
            <p>هنوز ویدیویی برای پایه تو تعریف نشده.</p>
          </div>
        ) : (
          videos.map((video) => {
            const prog = progressMap.get(video.id);
            const isCompleted = prog?.completed ?? false;
            const isFuture = unlockMode === "all" ? false : video.day > daysSinceReg;
            let isLocked: boolean;
            let purchasable = false;
            let price = 0;
            if (isPaid) {
              const purchased = !!prog?.purchasedAt;
              if (purchased) {
                isLocked = false;
              } else if (isFuture) {
                isLocked = true; // هنوز در دسترس نیست
              } else {
                // در دسترس ولی خریده‌نشده
                isLocked = false;
                purchasable = true;
                price = getVideoPrice(video.day);
              }
            } else {
              // گروه free: اگر future نباشد باز است
              isLocked = isFuture;
            }
            const watchPct = prog && video.durationMin > 0
              ? Math.round((prog.watchedSeconds / (video.durationMin * 60)) * 100)
              : 0;
            return <VideoCard key={video.id} video={video} watchPct={watchPct} isCompleted={isCompleted} isLocked={isLocked} purchasable={purchasable} price={price} />;
          })
        )}
      </div>
    </div>
  );
}
