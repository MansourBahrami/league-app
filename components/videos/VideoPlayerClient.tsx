"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  videoId: string;
  hlsUrl: string;
  title: string;
  durationMin: number;
  initialWatchedSeconds: number;
  isCompleted: boolean;
}

export default function VideoPlayerClient({ videoId, hlsUrl, title, durationMin, initialWatchedSeconds, isCompleted }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);
  const [completed, setCompleted] = useState(isCompleted);
  const totalSeconds = durationMin * 60;
  const maxSeek = Math.max(watchedSeconds, initialWatchedSeconds);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    // Load HLS if available
    if (hlsUrl.endsWith(".m3u8")) {
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          return () => hls.destroy();
        }
      });
    } else {
      video.src = hlsUrl;
    }

    // Restore position
    if (initialWatchedSeconds > 0) {
      video.currentTime = initialWatchedSeconds;
    }
  }, [hlsUrl, initialWatchedSeconds]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Anti-seek: prevent skipping ahead
    const handleSeeking = () => {
      if (video.currentTime > maxSeek + 2) {
        video.currentTime = maxSeek;
      }
    };

    // Track watched time
    const handleTimeUpdate = () => {
      const current = Math.floor(video.currentTime);
      setWatchedSeconds((prev) => Math.max(prev, current));
    };

    // Save progress every 10 seconds
    let lastSave = 0;
    const handleTimeUpdateSave = () => {
      const current = Math.floor(video.currentTime);
      if (current - lastSave >= 10) {
        lastSave = current;
        fetch(`/api/videos/${videoId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchedSeconds: current, totalSeconds }),
        }).then((r) => r.json()).then((data) => {
          if (data.completed) setCompleted(true);
        }).catch(() => {});
      }
    };

    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("timeupdate", handleTimeUpdateSave);
    return () => {
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("timeupdate", handleTimeUpdateSave);
    };
  }, [videoId, totalSeconds, maxSeek]);

  const watchPct = totalSeconds > 0 ? Math.round((watchedSeconds / totalSeconds) * 100) : 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-[#c7c4d7]/20 bg-black aspect-video">
        {hlsUrl ? (
          <video ref={videoRef} className="w-full h-full" controls playsInline />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50">
            <span className="material-symbols-outlined text-[48px]">video_file</span>
          </div>
        )}
        {completed && (
          <div className="absolute inset-0 bg-[#006c49]/20 flex items-center justify-center pointer-events-none">
            <div className="bg-[#006c49] text-white px-4 py-2 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              تکمیل شده
            </div>
          </div>
        )}
      </div>

      {/* Watch progress */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[#464554]">{watchPct}٪ مشاهده شده</span>
        <div className="flex-1 h-1.5 bg-[#e5eeff] rounded-full overflow-hidden">
          <div className="h-full bg-[#4648d4] rounded-full transition-all" style={{ width: `${watchPct}%` }} />
        </div>
        <span className="text-[12px] text-[#767586]">{durationMin} دقیقه</span>
      </div>

      {watchPct < 90 && (
        <p className="text-[12px] text-[#767586] text-center">
          ۹۰٪ ویدیو را تماشا کن تا جایزه بگیری ({90 - watchPct}٪ مانده)
        </p>
      )}
    </section>
  );
}
