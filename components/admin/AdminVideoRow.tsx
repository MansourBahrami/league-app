"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Video {
  id: string;
  title: string;
  day: number;
  grades: string[];
  durationMin: number;
  isActive: boolean;
}

export default function AdminVideoRow({ video }: { video: Video }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

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

  return (
    <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-[#c7c4d7]/30">
      <div className="w-10 h-10 rounded-lg bg-[#e1e0ff] flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[#4648d4] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#0b1c30] truncate">{video.title}</p>
        <div className="flex items-center gap-2 text-[11px] text-[#767586] mt-0.5 flex-wrap">
          <span className="bg-[#e1e0ff] text-[#4648d4] px-1.5 py-0.5 rounded">روز {video.day.toLocaleString("fa-IR")}</span>
          <span>{video.grades.length === 0 ? "همه پایه‌ها" : video.grades.join("، ")}</span>
          <span>· {video.durationMin.toLocaleString("fa-IR")} دقیقه</span>
          {!video.isActive && <span className="text-[#ba1a1a]">· غیرفعال</span>}
        </div>
      </div>
      <Link href={`/admin/videos/${video.id}`} className="text-[#4648d4] hover:bg-[#e1e0ff] p-2 rounded-lg transition-colors">
        <span className="material-symbols-outlined text-[20px]">edit</span>
      </Link>
      <button onClick={handleDelete} disabled={deleting} className="text-[#ba1a1a] hover:bg-[#ba1a1a]/10 p-2 rounded-lg transition-colors disabled:opacity-50">
        <span className="material-symbols-outlined text-[20px]">{deleting ? "progress_activity" : "delete"}</span>
      </button>
    </div>
  );
}
