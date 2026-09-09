import Link from "next/link";
import Image from "next/image";

interface Props {
  video: {
    id: string;
    title: string;
    day: number;
    durationMin: number;
    thumbnailUrl: string | null;
  };
  watchPct: number;
  isCompleted: boolean;
  isLocked?: boolean;
  /** زمان باقی‌مانده تا بازشدن ویدیو */
  lockNote?: string;
  /** گروه paid: ویدیوی در دسترسِ خریده‌نشده — کارت به صفحه‌ی ویدیو برای خرید می‌رود */
  purchasable?: boolean;
  /** قیمت خرید (سکه) برای حالت purchasable */
  price?: number;
  /** قفل ترتیبی قابل بازکردن است تا صفحه علت و لینک ویدیوی لازم را نشان دهد. */
  sequenceLocked?: boolean;
}

export default function VideoCard({ video, watchPct, isCompleted, isLocked = false, lockNote, purchasable = false, price = 0, sequenceLocked = false }: Props) {
  const badge = video.day > 0 ? `روز ${video.day.toLocaleString("fa-IR")}` : null;

  const inner = (
    <div className={`relative bg-surface-container-lowest/80 rounded-xl p-1 shadow-[0_10px_25px_color-mix(in_oklab,var(--color-primary)_10%,transparent)] border border-primary/20 backdrop-blur-xl group overflow-hidden transition-all duration-300 ${isLocked ? "opacity-80" : "hover:shadow-[0_15px_30px_color-mix(in_oklab,var(--color-primary)_15%,transparent)] cursor-pointer"}`}>
      <div className="flex gap-4 bg-surface-container-lowest rounded-xl p-3 items-center">
        <div className="w-24 h-24 rounded-xl overflow-hidden relative shrink-0 bg-primary-fixed flex items-center justify-center">
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} width={96} height={96} unoptimized className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt={video.title} />
          ) : (
            <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          )}
          {isLocked && (
            <div className="absolute inset-0 bg-on-surface/60 flex items-center justify-center backdrop-blur-[1px]">
              <span className="material-symbols-outlined text-inverse-on-surface text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            </div>
          )}
          {!isLocked && purchasable && (
            <div className="absolute inset-0 bg-tertiary/70 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-tertiary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
            </div>
          )}
          {!isLocked && !purchasable && isCompleted && (
            <div className="absolute inset-0 bg-secondary/70 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-start text-right">
          {badge && <div className="bg-primary-fixed/40 text-primary px-2 py-0.5 rounded text-[10px] font-bold mb-1">{badge}</div>}
          <h3 className="text-[15px] font-bold text-on-surface leading-tight mb-2">{video.title}</h3>
          {isLocked ? (
            <span className="text-[12px] text-outline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              {lockNote ?? "به‌زودی باز میشه."}
            </span>
          ) : purchasable ? (
            <span className="text-[12px] font-semibold text-tertiary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
              خرید با {price.toLocaleString("fa-IR")} سکه
            </span>
          ) : (
            <div className="flex items-center gap-2 text-on-surface-variant text-[12px]">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                {video.durationMin.toLocaleString("fa-IR")} دقیقه
              </span>
              {watchPct > 0 && !isCompleted && <span className="text-primary">{watchPct.toLocaleString("fa-IR")}٪ دیده شده</span>}
              {isCompleted && <span className="text-tertiary">تکمیل شده ✓</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isLocked && !sequenceLocked) {
    return inner;
  }

  return <Link href={`/videos/${video.id}`}>{inner}</Link>;
}
