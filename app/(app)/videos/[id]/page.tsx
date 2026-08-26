import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import VideoPlayerClient from "@/components/videos/VideoPlayerClient";
import BuyVideoButton from "@/components/videos/BuyVideoButton";
import { getVideoPrice } from "@/lib/ab";
import { getVideoUnlockMode } from "@/lib/settings";
import { tehranDayDiff } from "@/lib/date";
import {
  VIDEO_BASE_REWARD_COINS,
  VIDEO_FAST_REWARD_COINS,
  VIDEO_FAST_REWARD_HOURS,
} from "@/lib/gamification";
import Link from "next/link";
import ProductViewEvent from "@/components/analytics/ProductViewEvent";

interface Props {
  params: Promise<{ id: string }>;
}

function VideoRewardCard({
  rewardGiven,
  fastRewardActive,
  startsAfterPurchase = false,
}: {
  rewardGiven: boolean;
  fastRewardActive: boolean;
  startsAfterPurchase?: boolean;
}) {
  const reward = fastRewardActive || startsAfterPurchase
    ? VIDEO_FAST_REWARD_COINS
    : VIDEO_BASE_REWARD_COINS;

  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-tertiary/25 bg-tertiary-fixed/25 p-3.5 text-right">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tertiary text-on-tertiary">
        <span className="material-symbols-outlined text-[23px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>generating_tokens</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold text-on-surface-variant">جایزه این ویدیو</p>
        <p className="text-[18px] font-extrabold text-tertiary">{reward.toLocaleString("fa-IR")} سکه</p>
        <p className="mt-0.5 text-[11.5px] leading-5 text-on-surface-variant">
          {rewardGiven
            ? "جایزه دریافت شده."
            : startsAfterPurchase
              ? `اگر تا ${VIDEO_FAST_REWARD_HOURS.toLocaleString("fa-IR")} ساعت بعد از خرید کاملش کنی.`
              : fastRewardActive
                ? `جایزه دوبرابرِ ${VIDEO_FAST_REWARD_HOURS.toLocaleString("fa-IR")} ساعت اول.`
                : "با تماشای حداقل ۹۰٪ ویدیو."}
        </p>
      </div>
      {rewardGiven && (
        <span className="material-symbols-outlined shrink-0 text-[22px] text-tertiary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      )}
    </div>
  );
}

export default async function VideoPlayerPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) notFound();

  const [progress, viewer, unlockMode] = await Promise.all([
    prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId: session.userId, videoId: id } },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { videoAccess: true, coins: true, onboardingDay: true, createdAt: true },
    }),
    getVideoUnlockMode(),
  ]);

  const daysSinceReg = Math.max(1, tehranDayDiff(new Date(), viewer?.createdAt ?? new Date()) + 1);
  const isFuture = unlockMode === "all" ? false : video.day > daysSinceReg;

  // گروه paid: ویدیوهای مسیر فقط بعد از خرید قابل تماشا هستند.
  const needsPurchase = viewer?.videoAccess === "paid" && video.day >= 1 && !progress?.purchasedAt;
  if (needsPurchase) {
    const price = getVideoPrice(video.day);
    return (
      <div className="flex flex-col gap-6 px-5 pb-6">
        <ProductViewEvent event="video_opened" properties={{ video_id: id, access: "locked" }} />
        <Link href="/videos" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mt-2">
          <span className="material-symbols-outlined" style={{ transform: "scaleX(-1)" }}>arrow_back</span>
          <span className="text-[14px] font-semibold">بازگشت به لیست ویدیوها</span>
        </Link>

        <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-tertiary-fixed/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-tertiary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isFuture ? "lock" : "shopping_cart"}
            </span>
          </div>
          <h1 className="text-[18px] font-extrabold text-on-surface">{video.title}</h1>
          {isFuture ? (
            <p className="text-[14px] text-on-surface-variant">
              این ویدیو هنوز در دسترس قرار نگرفته است.
            </p>
          ) : (
            <p className="text-[14px] text-on-surface-variant">
              برای تماشای این ویدیو و گرفتن سکه‌ی جایزه، اول آن را با سکه بخر.
            </p>
          )}
          <div className="mt-2 w-full max-w-[360px]">
            <VideoRewardCard rewardGiven={false} fastRewardActive={false} startsAfterPurchase />
          </div>
          {!isFuture && (
            <div className="w-full max-w-[360px] mt-2">
              <BuyVideoButton videoId={video.id} price={price} userCoins={viewer?.coins ?? 0} />
            </div>
          )}
        </div>
      </div>
    );
  }

  const fastRewardActive = !!progress?.unlockedAt
    && new Date().getTime() - progress.unlockedAt.getTime() <= VIDEO_FAST_REWARD_HOURS * 3600 * 1000;

  return (
    <div className="flex flex-col gap-6 px-5 pb-6">
      {/* Back button */}
      <Link href="/videos" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mt-2">
        <span className="material-symbols-outlined" style={{ transform: "scaleX(-1)" }}>arrow_back</span>
        <span className="text-[14px] font-semibold">بازگشت به لیست ویدیوها</span>
      </Link>

      {/* Video Player */}
      <VideoPlayerClient
        videoId={video.id}
        hlsUrl={video.hlsUrl}
        title={video.title}
        durationMin={video.durationMin}
        initialWatchedSeconds={progress?.watchedSeconds ?? 0}
        isCompleted={progress?.completed ?? false}
      />

      {/* Video Info */}
      <section className="flex flex-col gap-4">
        <h1 className="text-[20px] font-bold text-on-surface">{video.title}</h1>
        <div className="flex gap-2 items-center">
          <span className="bg-surface-container-high text-primary px-3 py-1 rounded-full text-[14px] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">calendar_today</span>روز {video.day.toLocaleString("fa-IR")}
          </span>
          <span className="text-on-surface-variant text-[16px] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">schedule</span>{video.durationMin.toLocaleString("fa-IR")} دقیقه
          </span>
        </div>

        {video.description && (
          <p className="text-[16px] text-on-surface-variant leading-relaxed text-justify">{video.description}</p>
        )}

        <VideoRewardCard
          rewardGiven={progress?.rewardGiven ?? false}
          fastRewardActive={fastRewardActive}
        />

        {/* CTA دلخواه ادمین (مثلاً «درخواست مشاوره رایگان») */}
        {video.ctaLabel && video.ctaUrl && (
          <a
            href={video.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gamified-btn w-full bg-secondary text-on-secondary font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-secondary/20"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
            {video.ctaLabel}
          </a>
        )}
      </section>
    </div>
  );
}
