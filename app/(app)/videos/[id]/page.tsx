import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import VideoPlayerClient from "@/components/videos/VideoPlayerClient";
import BuyVideoButton from "@/components/videos/BuyVideoButton";
import { getVideoPrice } from "@/lib/ab";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VideoPlayerPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) notFound();

  const [progress, viewer] = await Promise.all([
    prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId: session.userId, videoId: id } },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { videoAccess: true, coins: true, onboardingDay: true },
    }),
  ]);

  // گروه paid: ویدیوهای مسیر فقط بعد از خرید قابل تماشا هستند.
  // به‌جای ریدایرکت به داشبورد، خرید را همین‌جا روی صفحه‌ی ویدیو ممکن می‌کنیم.
  const needsPurchase = viewer?.videoAccess === "paid" && video.day >= 1 && !progress?.purchasedAt;
  if (needsPurchase) {
    // روزهای آینده هنوز قابل خرید نیستند
    const isFuture = video.day > (viewer?.onboardingDay ?? 0) + 1;
    const price = getVideoPrice(video.day);
    return (
      <div className="flex flex-col gap-6 px-5 pb-6">
        <Link href="/videos" className="flex items-center gap-2 text-[#464554] hover:text-[#4648d4] transition-colors mt-2">
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
              این ویدیوی روز {video.day.toLocaleString("fa-IR")} است و هنوز در دسترس نیست. ماموریت‌های روزهای قبل را کامل کن.
            </p>
          ) : (
            <>
              <p className="text-[14px] text-on-surface-variant">
                برای تماشای این ویدیو و گرفتن سکه‌ی جایزه، اول آن را با سکه بخر.
              </p>
              <div className="w-full max-w-[360px] mt-2">
                <BuyVideoButton videoId={video.id} price={price} userCoins={viewer?.coins ?? 0} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-5 pb-6">
      {/* Back button */}
      <Link href="/videos" className="flex items-center gap-2 text-[#464554] hover:text-[#4648d4] transition-colors mt-2">
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
        <h1 className="text-[20px] font-bold text-[#0b1c30]">{video.title}</h1>
        <div className="flex gap-2 items-center">
          <span className="bg-[#dce9ff] text-[#4648d4] px-3 py-1 rounded-full text-[14px] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">calendar_today</span>روز {video.day.toLocaleString("fa-IR")}
          </span>
          <span className="text-on-surface-variant text-[16px] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">schedule</span>{video.durationMin.toLocaleString("fa-IR")} دقیقه
          </span>
        </div>

        {video.description && (
          <p className="text-[16px] text-on-surface-variant leading-relaxed text-justify">{video.description}</p>
        )}

        {/* Reward hint */}
        <div className="glass-card p-4 rounded-xl flex items-center gap-4 border border-tertiary-fixed/30 bg-tertiary-fixed/10">
          <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
          </div>
          <div>
            <p className="text-[16px] font-bold text-on-surface">تا انتها تماشا کن و سکه جایزه بگیر!</p>
            <p className="text-[14px] text-on-surface-variant">اگر همین امروز ببینی، سکه‌ات دوبرابر می‌شه.</p>
          </div>
        </div>

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
