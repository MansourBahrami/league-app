import Link from "next/link";

interface Props {
  category: {
    id: string;
    title: string;
    requireSequential: boolean;
  };
  videoCount: number;
  completedCount: number;
}

export default function VideoCategoryCard({ category, videoCount, completedCount }: Props) {
  const progress = videoCount > 0 ? Math.round((completedCount / videoCount) * 100) : 0;
  return (
    <Link
      href={`/videos/categories/${category.id}`}
      className="glass-card group flex flex-col gap-4 rounded-2xl border border-primary/15 p-4 transition-all hover:border-primary/30 hover:shadow-[0_14px_35px_color-mix(in_oklab,var(--color-primary)_12%,transparent)]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
          <span className="material-symbols-outlined text-[25px]" style={{ fontVariationSettings: "'FILL' 1" }}>video_library</span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-extrabold text-on-surface">{category.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
            <span>{videoCount.toLocaleString("fa-IR")} ویدیو</span>
          </div>
        </div>
        <span className="material-symbols-outlined text-primary transition-transform group-hover:-translate-x-1">chevron_left</span>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-on-surface-variant">
          <span>{completedCount.toLocaleString("fa-IR")} ویدیو تکمیل شده</span>
          <span>{progress.toLocaleString("fa-IR")}٪</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full bg-tertiary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </Link>
  );
}
