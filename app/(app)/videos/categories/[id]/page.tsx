import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppUserSnapshot, preloadAppUserSnapshot } from "@/lib/app-user";
import { getVideoUnlockMode } from "@/lib/settings";
import { getVideoPrice } from "@/lib/ab";
import { tehranDayDiff } from "@/lib/date";
import { findVideoSequenceBlocker } from "@/lib/video-sequence";
import VideoCard from "@/components/videos/VideoCard";
import RouteLoading from "@/components/layout/RouteLoading";

interface Props {
  params: Promise<{ id: string }>;
}

async function CategoryContent({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  preloadAppUserSnapshot(session.userId);

  const [category, user, unlockMode, progresses] = await Promise.all([
    prisma.videoCategory.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        requireSequential: true,
        videos: {
          where: { isActive: true, day: { gte: 0 } },
          orderBy: [{ sortOrder: "asc" }, { day: "asc" }, { id: "asc" }],
          select: { id: true, title: true, day: true, durationMin: true, thumbnailUrl: true, grades: true },
        },
      },
    }),
    getAppUserSnapshot(session.userId),
    getVideoUnlockMode(),
    prisma.videoProgress.findMany({ where: { userId: session.userId } }),
  ]);
  if (!category) notFound();
  if (!user) redirect("/login");

  const videos = category.videos.filter(
    (video) => video.grades.length === 0 || (!!user.grade && video.grades.includes(user.grade)),
  );
  const progressMap = new Map(progresses.map((progress) => [progress.videoId, progress]));
  const completedIds = new Set(progresses.filter((progress) => progress.completed).map((progress) => progress.videoId));
  const isPaid = user.videoAccess === "paid";
  const daysSinceReg = Math.max(1, tehranDayDiff(new Date(), user.createdAt) + 1);

  return (
    <div className="flex flex-col gap-5 px-5 pb-6">
      <Link href="/videos" className="mt-2 flex items-center gap-2 text-[14px] font-semibold text-on-surface-variant transition-colors hover:text-primary">
        <span className="material-symbols-outlined" style={{ transform: "scaleX(-1)" }}>arrow_back</span>
        بازگشت به دسته‌بندی‌ها
      </Link>
      <header className="rounded-2xl bg-primary px-5 py-5 text-on-primary">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>video_library</span>
          <div>
            <h1 className="text-[20px] font-extrabold">{category.title}</h1>
            <p className="mt-1 text-[12px] opacity-80">{videos.length.toLocaleString("fa-IR")} ویدیو</p>
          </div>
        </div>
        {category.requireSequential && (
          <p className="mt-4 rounded-xl bg-on-primary/10 px-3 py-2.5 text-[12px] leading-5">
            ویدیوها به‌ترتیب باز می‌شوند؛ برای رفتن به ویدیوی بعدی باید حداقل ۹۰٪ ویدیوی قبلی را ببینی.
          </p>
        )}
      </header>

      <div className="flex flex-col gap-4">
        {videos.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-on-surface-variant">هنوز ویدیویی برای پایه تو در این دسته نیست.</p>
        ) : videos.map((video) => {
          const progress = progressMap.get(video.id);
          const sequenceBlocker = category.requireSequential
            ? findVideoSequenceBlocker(videos, video.id, completedIds, user.grade)
            : null;
          const isFuture = video.day > 0 && unlockMode !== "all" && video.day > daysSinceReg;
          const purchased = !!progress?.purchasedAt;
          const sequenceLocked = !!sequenceBlocker;
          const isLocked = isFuture || sequenceLocked;
          let purchasable = false;
          let price = 0;
          if (!isLocked && isPaid && video.day > 0 && !purchased) {
            purchasable = true;
            price = getVideoPrice(video.day);
          }
          const watchPct = progress && video.durationMin > 0
            ? Math.min(100, Math.round((progress.watchedSeconds / (video.durationMin * 60)) * 100))
            : 0;
          const lockNote = sequenceBlocker
            ? `اول «${sequenceBlocker.title}» را تا ۹۰٪ ببین.`
            : isFuture
              ? `${Math.max(1, video.day - daysSinceReg).toLocaleString("fa-IR")} روز دیگه باز میشه.`
              : undefined;
          return (
            <VideoCard
              key={video.id}
              video={video}
              watchPct={watchPct}
              isCompleted={progress?.completed ?? false}
              isLocked={isLocked}
              lockNote={lockNote}
              sequenceLocked={sequenceLocked}
              purchasable={purchasable}
              price={price}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function VideoCategoryPage(props: Props) {
  return (
    <Suspense fallback={<RouteLoading titleWidth="w-40" primaryHeight="h-36" rows={3} />}>
      <CategoryContent {...props} />
    </Suspense>
  );
}
