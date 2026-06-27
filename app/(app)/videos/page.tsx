import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import VideoCard from "@/components/videos/VideoCard";
import { getOnboardingTotalDays, gradeFilter } from "@/lib/onboarding";
import { getVideoPrice } from "@/lib/ab";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { onboardingDay: true, grade: true, videoAccess: true },
  });
  if (!user) redirect("/login");

  const isPaid = user.videoAccess === "paid";

  const totalDays = await getOnboardingTotalDays();

  // ویدیوهای مسیر متناسب با پایه؛ روز جاری و گذشته باز، روزهای آینده قفل.
  const videos = await prisma.video.findMany({
    where: { isActive: true, day: { gte: 1 }, ...gradeFilter(user.grade) },
    orderBy: { day: "asc" },
  });

  const progresses = await prisma.videoProgress.findMany({
    where: { userId: session.userId, videoId: { in: videos.map((v) => v.id) } },
  });
  const progressMap = new Map(progresses.map((p) => [p.videoId, p]));

  const progress = totalDays > 0 ? Math.round((user.onboardingDay / totalDays) * 100) : 0;

  return (
    <div className="flex flex-col px-5">
      <div className="mb-8 mt-2 text-center">
        <h2 className="text-[20px] font-bold text-primary mb-1.5">ویدیوهای آموزشی</h2>
        <p className="text-[16px] text-on-surface-variant">مسیر آشنایی و پیشرفت شما</p>
      </div>

      {/* Overall Progress */}
      <div className="mb-8 bg-surface-container-low rounded-xl p-4 border border-white/50 backdrop-blur-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[14px] text-on-surface-variant">روز {user.onboardingDay.toLocaleString("fa-IR")} از {totalDays.toLocaleString("fa-IR")}</span>
          <span className="text-[14px] font-bold text-primary">{progress.toLocaleString("fa-IR")}٪ پیشرفت</span>
        </div>
        <div className="h-3 w-full bg-outline-variant/40 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-l from-primary to-primary-container rounded-full shadow-[0_0_10px_color-mix(in_oklab,var(--color-primary)_50%,transparent)]" style={{ width: `${progress}%` }} />
        </div>
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
            const isFuture = video.day > user.onboardingDay + 1;
            let isLocked: boolean;
            let purchasable = false;
            let price = 0;
            if (isPaid) {
              const purchased = !!prog?.purchasedAt;
              if (purchased) {
                isLocked = false;
              } else if (isFuture) {
                isLocked = true; // روزهای آینده هنوز در دسترس نیستند
              } else {
                // در دسترس ولی خریده‌نشده → کارت به صفحه‌ی ویدیو می‌رود و همان‌جا خرید می‌شود
                isLocked = false;
                purchasable = true;
                price = getVideoPrice(video.day);
              }
            } else {
              // گروه free: روز جاری و گذشته باز؛ فقط روزهای آینده قفل
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
