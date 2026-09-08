"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { captureClientError, captureProductEvent } from "@/lib/analytics-client";

interface Props {
  videoId: string;
  hlsUrl: string;
  title: string;
  durationMin: number;
  initialWatchedSeconds: number;
  isCompleted: boolean;
}

const PROGRESS_HEARTBEAT_SECONDS = 30;

export default function VideoPlayerClient({
  videoId,
  hlsUrl,
  title,
  durationMin,
  initialWatchedSeconds,
  isCompleted,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxSeekRef = useRef(initialWatchedSeconds);
  const lastSaveRef = useRef(initialWatchedSeconds);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<number | null>(null);
  const mediaFailureReportedRef = useRef(false);
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);
  const [completed, setCompleted] = useState(isCompleted);
  const unavailableMessage = "فایل این ویدیو در حال حاضر در دسترس نیست. کمی بعد دوباره بررسی کن.";
  const [mediaError, setMediaError] = useState(hlsUrl ? "" : unavailableMessage);
  const [progressError, setProgressError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const totalSeconds = durationMin * 60;

  useEffect(() => {
    captureProductEvent("video_opened", { video_id: videoId, duration_minutes: durationMin });
  }, [durationMin, videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;
    let cancelled = false;
    let destroyHls: (() => void) | undefined;

    mediaFailureReportedRef.current = false;
    setMediaError("");
    const handleMediaError = () => {
      if (!cancelled && !mediaFailureReportedRef.current) {
        mediaFailureReportedRef.current = true;
        setMediaError("پخش ویدیو انجام نشد. اتصال اینترنت یا فایل ویدیو را بررسی کن.");
        captureProductEvent("video_playback_failed", { video_id: videoId, has_source: true });
        captureClientError("video.playback", new Error("video_playback_failed"), { video_id: videoId });
      }
    };
    video.addEventListener("error", handleMediaError);

    if (hlsUrl.endsWith(".m3u8")) {
      void import("hls.js").then(({ default: Hls }) => {
        if (cancelled) return;
        if (Hls.isSupported()) {
          const hls = new Hls();
          destroyHls = () => hls.destroy();
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) handleMediaError();
          });
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
        } else {
          // Safari و iOS پخش HLS را به‌صورت native انجام می‌دهند.
          video.src = hlsUrl;
        }
      }).catch(handleMediaError);
    } else {
      video.src = hlsUrl;
    }

    const restorePosition = () => {
      if (initialWatchedSeconds > 0) {
        video.currentTime = Math.min(
          initialWatchedSeconds,
          video.duration || initialWatchedSeconds,
        );
      }
    };
    video.addEventListener("loadedmetadata", restorePosition, { once: true });

    return () => {
      cancelled = true;
      video.removeEventListener("error", handleMediaError);
      video.removeEventListener("loadedmetadata", restorePosition);
      destroyHls?.();
      video.removeAttribute("src");
      video.load();
    };
  }, [hlsUrl, initialWatchedSeconds, reloadKey, videoId]);

  useEffect(() => {
    if (!hlsUrl) {
      captureProductEvent("video_playback_failed", { video_id: videoId, has_source: false });
    }
  }, [hlsUrl, videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleSeeking = () => {
      // جلو زدن محتوای دیده‌نشده از کنترل native، کیبورد یا اسکریپت مجاز نیست.
      if (video.currentTime > maxSeekRef.current) {
        video.currentTime = maxSeekRef.current;
      }
    };

    const saveProgress = async (current: number, force = false) => {
      const normalizedCurrent = Math.max(0, Math.floor(current));
      if (!force && normalizedCurrent - lastSaveRef.current < PROGRESS_HEARTBEAT_SECONDS) return;
      if (savingRef.current) {
        pendingSaveRef.current = Math.max(pendingSaveRef.current ?? 0, normalizedCurrent);
        return;
      }
      savingRef.current = true;
      try {
        const response = await fetch(`/api/videos/${videoId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchedSeconds: normalizedCurrent }),
        });
        const data = await response.json().catch((caught) => {
          captureClientError("video.progress_response", caught, { video_id: videoId });
          return null;
        });
        if (!response.ok || !data) throw new Error("progress_failed");

        const verifiedSeconds = Number(data.watchedSeconds);
        if (Number.isFinite(verifiedSeconds)) {
          lastSaveRef.current = Math.max(lastSaveRef.current, verifiedSeconds);
          maxSeekRef.current = Math.max(maxSeekRef.current, verifiedSeconds);
          setWatchedSeconds((previous) => Math.max(previous, verifiedSeconds));
        }
        if (data.completed) setCompleted(true);
        setProgressError("");
      } catch (caught) {
        // heartbeat بعدی دوباره تلاش می‌کند؛ پیشرفت محلی حذف نمی‌شود.
        captureProductEvent("video_progress_failed", { video_id: videoId });
        captureClientError("video.progress", caught, { video_id: videoId });
        setProgressError("ذخیره پیشرفت ویدیو انجام نشد؛ خودکار دوباره تلاش می‌کنیم.");
      } finally {
        savingRef.current = false;
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (pending !== null && pending > lastSaveRef.current) {
          void saveProgress(pending, true);
        }
      }
    };

    const saveBeforeLeaving = () => {
      const current = Math.max(maxSeekRef.current, video.currentTime || 0);
      void fetch(`/api/videos/${videoId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchedSeconds: Math.max(0, Math.floor(current)) }),
        keepalive: true,
      }).catch(() => undefined);
    };

    const handleTimeUpdate = () => {
      if (video.seeking) return;
      // این ref محلی با دقت خود پلیر جلو می‌رود و منتظر heartbeat دیتابیس نیست.
      const currentTime = video.currentTime;
      const current = Math.floor(currentTime);
      maxSeekRef.current = Math.max(maxSeekRef.current, currentTime);
      setWatchedSeconds((previous) => Math.max(previous, current));
      void saveProgress(current);
    };

    const handlePlay = () => {
      // حتی شروع تماشای کوتاه نیز یک VideoProgress برای همین کاربر/ویدیو می‌سازد.
      void saveProgress(maxSeekRef.current, true);
    };

    const handlePause = () => {
      void saveProgress(maxSeekRef.current, true);
    };

    const handleEnded = () => {
      const currentTime = video.currentTime;
      const current = Math.floor(currentTime);
      maxSeekRef.current = Math.max(maxSeekRef.current, currentTime);
      void saveProgress(current, true);
    };

    const handleRateChange = () => {
      if (video.playbackRate !== 1) video.playbackRate = 1;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveBeforeLeaving();
    };

    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("ratechange", handleRateChange);
    window.addEventListener("pagehide", saveBeforeLeaving);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      saveBeforeLeaving();
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("ratechange", handleRateChange);
      window.removeEventListener("pagehide", saveBeforeLeaving);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialWatchedSeconds, videoId]);

  const watchPct = totalSeconds > 0
    ? Math.round((watchedSeconds / totalSeconds) * 100)
    : 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-outline-variant/20 bg-black aspect-video">
        {hlsUrl ? (
          <video
            ref={videoRef}
            className="h-full w-full"
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            playsInline
            aria-label={title}
          />
        ) : (
          <div className="h-full w-full bg-black" aria-hidden="true" />
        )}
        {completed && (
          <div className="absolute inset-0 bg-secondary/20 flex items-center justify-center pointer-events-none">
            <div className="bg-secondary text-on-secondary px-4 py-2 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              تکمیل شده
            </div>
          </div>
        )}
        {mediaError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-inverse-surface/90 px-6 text-center text-inverse-on-surface">
            <span className="material-symbols-outlined text-[38px]" aria-hidden="true">error</span>
            <p role="alert" className="text-[13px] leading-6">{mediaError}</p>
            {hlsUrl ? (
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="rounded-xl bg-primary px-4 py-2.5 text-[14px] font-bold text-on-primary"
              >
                تلاش دوباره
              </button>
            ) : (
              <Link
                href="/videos"
                className="rounded-xl bg-primary px-4 py-2.5 text-[14px] font-bold text-on-primary"
              >
                برگشت به آموزش‌ها
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[12px] text-on-surface-variant">{watchPct.toLocaleString("fa-IR")}٪ مشاهده شده</span>
        <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${watchPct}%` }} />
        </div>
        <span className="text-[12px] text-outline">{durationMin.toLocaleString("fa-IR")} دقیقه</span>
      </div>

      {watchPct < 90 && (
        <div className="text-[12px] text-outline text-center space-y-1">
          <p>۹۰٪ ویدیو را تماشا کن تا جایزه بگیری ({(90 - watchPct).toLocaleString("fa-IR")}٪ مانده)</p>
          <p>جلو زدن و تغییر سرعت پخش غیرفعال است.</p>
        </div>
      )}
      {progressError && (
        <p role="status" className="text-center text-[12px] text-error">{progressError}</p>
      )}
    </section>
  );
}
