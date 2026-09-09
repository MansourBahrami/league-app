"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { captureClientError } from "@/lib/analytics-client";

interface Video {
  id: string;
  title: string;
  day: number;
  grades: string[];
  durationMin: number;
  isActive: boolean;
  category: { title: string } | null;
}

interface Props {
  video: Video;
  position: number;
  watchedCount: number;
  completedCount: number;
  isFirst: boolean;
  isLast: boolean;
}

export default function AdminVideoRow({ video, position, watchedCount, completedCount, isFirst, isLast }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState<"up" | "down" | null>(null);

  async function handleDelete() {
    if (!confirm(`«${video.title}» حذف شود؟`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/videos/${video.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "خطا در حذف");
      setDeleting(false);
    }
  }

  async function handleMove(direction: "up" | "down") {
    setMoving(direction);
    try {
      const res = await fetch(`/api/admin/videos/${video.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "خطا در تغییر ترتیب");
      }
    } catch (caught) {
      captureClientError("admin.video_reorder", caught, { videoId: video.id, direction });
      alert("خطا در ارتباط با سرور");
    } finally {
      setMoving(null);
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-3 flex items-center gap-3 border border-outline-variant/30">
      <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-on-surface truncate">{video.title}</p>
        <div className="flex items-center gap-2 text-[11px] text-outline mt-0.5 flex-wrap">
          <span className="bg-tertiary-fixed text-on-tertiary-fixed px-1.5 py-0.5 rounded">ترتیب {position.toLocaleString("fa-IR")}</span>
          <span>{video.category?.title ?? "ویدیوی تکی"}</span>
          <span className="bg-primary-fixed text-primary px-1.5 py-0.5 rounded">
            {video.day > 0 ? `روز ${video.day.toLocaleString("fa-IR")}` : "بدون محدودیت روزانه"}
          </span>
          <span>{video.grades.length === 0 ? "همه پایه‌ها" : video.grades.join("، ")}</span>
          <span>· {video.durationMin.toLocaleString("fa-IR")} دقیقه</span>
          <span>· شروع تماشا: {watchedCount.toLocaleString("fa-IR")}</span>
          <span>· تکمیل: {completedCount.toLocaleString("fa-IR")}</span>
          {!video.isActive && <span className="text-error">· غیرفعال</span>}
        </div>
      </div>
      <div className="flex flex-col shrink-0" aria-label="تغییر ترتیب نمایش">
        <button
          type="button"
          onClick={() => handleMove("up")}
          disabled={isFirst || moving !== null || deleting}
          aria-label={`انتقال «${video.title}» به بالا`}
          title="انتقال به بالا"
          className="text-on-surface-variant hover:bg-primary-fixed hover:text-primary p-1 rounded-md transition-colors disabled:opacity-25 disabled:pointer-events-none"
        >
          <span className={`material-symbols-outlined text-[19px] ${moving === "up" ? "animate-spin" : ""}`}>
            {moving === "up" ? "progress_activity" : "keyboard_arrow_up"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleMove("down")}
          disabled={isLast || moving !== null || deleting}
          aria-label={`انتقال «${video.title}» به پایین`}
          title="انتقال به پایین"
          className="text-on-surface-variant hover:bg-primary-fixed hover:text-primary p-1 rounded-md transition-colors disabled:opacity-25 disabled:pointer-events-none"
        >
          <span className={`material-symbols-outlined text-[19px] ${moving === "down" ? "animate-spin" : ""}`}>
            {moving === "down" ? "progress_activity" : "keyboard_arrow_down"}
          </span>
        </button>
      </div>
      <Link href={`/admin/videos/${video.id}`} className="text-primary hover:bg-primary-fixed p-2 rounded-lg transition-colors">
        <span className="material-symbols-outlined text-[20px]">edit</span>
      </Link>
      <button onClick={handleDelete} disabled={deleting} className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors disabled:opacity-50">
        <span className="material-symbols-outlined text-[20px]">{deleting ? "progress_activity" : "delete"}</span>
      </button>
    </div>
  );
}
