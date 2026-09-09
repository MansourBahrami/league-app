"use client";

import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import Link from "next/link";
import { captureClientError, captureProductEvent } from "@/lib/analytics-client";
import {
  normalizeVideoPlaybackRate,
  VIDEO_PLAYBACK_RATES,
  VIDEO_PROGRESS_HEARTBEAT_SECONDS,
  type VideoPlaybackRate,
} from "@/lib/video-playback";

interface Props {
  videoId: string;
  hlsUrl: string;
  posterUrl: string | null;
  title: string;
  durationMin: number;
  initialWatchedSeconds: number;
  isCompleted: boolean;
}

const HLS_MIME_TYPE = "application/vnd.apple.mpegurl";
const BUFFERING_INDICATOR_DELAY_MS = 800;

interface QualityOption {
  level: number;
  height: number;
  bitrate: number;
}

function isHlsSource(value: string): boolean {
  try {
    return new URL(value, "https://app.gcamp.ir").pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return value.split(/[?#]/, 1)[0].toLowerCase().endsWith(".m3u8");
  }
}

function formatVideoTime(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes.toLocaleString("fa-IR")}:${seconds.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}`;
}

type PlayerMenu = "quality" | "speed" | null;

function SpeedIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4.5 18a8 8 0 1 1 15 0" />
      <path d="m12 14 4-4" />
      <circle cx="12" cy="14" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  );
}

function VolumeIcon({ muted, className = "h-5 w-5" }: { muted: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 10h3l4-3v10l-4-3H5z" />
      {muted ? (
        <>
          <path d="m16 10 4 4" />
          <path d="m20 10-4 4" />
        </>
      ) : (
        <>
          <path d="M15.5 9.5a4 4 0 0 1 0 5" />
          <path d="M18 7a7.5 7.5 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

function FullscreenIcon({ active, className = "h-5 w-5" }: { active: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {active ? (
        <>
          <path d="M9 4v5H4" />
          <path d="M15 4v5h5" />
          <path d="M9 20v-5H4" />
          <path d="M15 20v-5h5" />
        </>
      ) : (
        <>
          <path d="M9 4H4v5" />
          <path d="M15 4h5v5" />
          <path d="M9 20H4v-5" />
          <path d="M15 20h5v-5" />
        </>
      )}
    </svg>
  );
}

export default function VideoPlayerClient({
  videoId,
  hlsUrl,
  posterUrl,
  title,
  durationMin,
  initialWatchedSeconds,
  isCompleted,
}: Props) {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const maxSeekRef = useRef(initialWatchedSeconds);
  const lastSaveRef = useRef(initialWatchedSeconds);
  const lastAttemptAtRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<number | null>(null);
  const mediaFailureReportedRef = useRef(false);
  const controlsTimerRef = useRef<number | null>(null);
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);
  const [completed, setCompleted] = useState(isCompleted);
  const unavailableMessage = "فایل این ویدیو در حال حاضر در دسترس نیست. کمی بعد دوباره بررسی کن.";
  const [mediaError, setMediaError] = useState(hlsUrl ? "" : unavailableMessage);
  const [isBuffering, setIsBuffering] = useState(Boolean(hlsUrl));
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState<VideoPlaybackRate>(1);
  const [currentTime, setCurrentTime] = useState(initialWatchedSeconds);
  const [mediaDuration, setMediaDuration] = useState(durationMin * 60);
  const [bufferedSeconds, setBufferedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [openMenu, setOpenMenu] = useState<PlayerMenu>(null);
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
    let bufferingTimer: number | undefined;
    let networkRecoveryAttempts = 0;
    let mediaRecoveryAttempts = 0;

    hlsRef.current = null;
    mediaFailureReportedRef.current = false;
    setQualityOptions([]);
    setSelectedQuality(-1);
    setMediaError("");
    setIsBuffering(true);
    const handleMediaError = (
      message = "پخش ویدیو انجام نشد. اتصال اینترنت یا فایل ویدیو را بررسی کن.",
      reason = "media_element_error",
      context: Record<string, string | number | boolean | null | undefined> = {},
    ) => {
      if (!cancelled && !mediaFailureReportedRef.current) {
        mediaFailureReportedRef.current = true;
        setIsBuffering(false);
        setMediaError(message);
        captureProductEvent("video_playback_failed", { video_id: videoId, has_source: true, reason });
        captureClientError("video.playback", new Error(`video_playback_failed:${reason}`), {
          video_id: videoId,
          ...context,
        });
      }
    };
    const handleNativeMediaError = () => {
      handleMediaError(
        "مرورگر نتوانست فایل ویدیو را پخش کند. اتصال اینترنت یا فرمت فایل را بررسی کن.",
        "native_media_error",
        { media_error_code: video.error?.code },
      );
    };
    const clearBufferingTimer = () => {
      if (bufferingTimer !== undefined) {
        window.clearTimeout(bufferingTimer);
        bufferingTimer = undefined;
      }
    };
    const handleLoadStart = () => {
      if (video.currentTime === 0 && video.readyState === HTMLMediaElement.HAVE_NOTHING) {
        setIsBuffering(true);
      }
    };
    const handleWaiting = () => {
      clearBufferingTimer();
      bufferingTimer = window.setTimeout(() => {
        if (
          !cancelled
          && !video.paused
          && !video.ended
          && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA
        ) {
          setIsBuffering(true);
        }
      }, BUFFERING_INDICATOR_DELAY_MS);
    };
    const handleReady = () => {
      clearBufferingTimer();
      setIsBuffering(false);
    };
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBufferedSeconds(video.buffered.end(video.buffered.length - 1));
      }
    };
    const handleMetadata = () => {
      handleReady();
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setMediaDuration(video.duration);
      }
    };
    video.addEventListener("error", handleNativeMediaError);
    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("stalled", handleWaiting);
    video.addEventListener("loadedmetadata", handleMetadata);
    video.addEventListener("canplay", handleReady);
    video.addEventListener("playing", handleReady);
    video.addEventListener("timeupdate", handleReady);
    video.addEventListener("pause", handleReady);
    video.addEventListener("progress", handleProgress);

    if (isHlsSource(hlsUrl)) {
      const nativeHlsSupport = video.canPlayType(HLS_MIME_TYPE)
        || video.canPlayType("application/x-mpegURL");
      void import("hls.js").then(({ default: HlsPlayer }) => {
        if (cancelled) return;
        if (HlsPlayer.isSupported()) {
          const hls = new HlsPlayer();
          hlsRef.current = hls;
          destroyHls = () => {
            if (hlsRef.current === hls) hlsRef.current = null;
            hls.destroy();
          };
          hls.on(HlsPlayer.Events.MANIFEST_PARSED, () => {
            const options = hls.levels
              .map((level, index) => ({
                level: index,
                height: level.height,
                bitrate: level.bitrate,
              }))
              .filter((option) => option.height > 0)
              .sort((first, second) => (
                second.height - first.height || second.bitrate - first.bitrate
              ))
              .filter((option, index, optionsList) => (
                optionsList.findIndex((candidate) => candidate.height === option.height) === index
              ));
            setQualityOptions(options);
          });
          hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
            if (!data.fatal) return;
            if (data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR && networkRecoveryAttempts < 1) {
              networkRecoveryAttempts += 1;
              hls.startLoad();
              return;
            }
            if (data.type === HlsPlayer.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 1) {
              mediaRecoveryAttempts += 1;
              hls.recoverMediaError();
              return;
            }
            handleMediaError(
              data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR
                ? "ارتباط با سرور ویدیو برقرار نشد. اینترنت را بررسی و دوباره تلاش کن."
                : "این ویدیو در مرورگر قابل پخش نبود. دوباره تلاش کن.",
              `hls_${data.type}`,
              {
                hls_detail: data.details,
                response_code: data.response?.code,
                recovery_attempted: networkRecoveryAttempts > 0 || mediaRecoveryAttempts > 0,
              },
            );
          });
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
        } else if (nativeHlsSupport) {
          // iOSهایی که MediaSource ندارند کیفیت را به‌صورت native مدیریت می‌کنند.
          video.src = hlsUrl;
        } else {
          handleMediaError(
            "این مرورگر از پخش HLS پشتیبانی نمی‌کند.",
            "hls_unsupported",
          );
        }
      }).catch((caught) => {
        handleMediaError(
          "آماده‌سازی پخش‌کننده انجام نشد. دوباره تلاش کن.",
          "hls_loader_failed",
          { error_name: caught instanceof Error ? caught.name : "unknown" },
        );
      });
    } else {
      video.src = hlsUrl;
    }

    const restorePosition = () => {
      if (initialWatchedSeconds > 0) {
        const restoredTime = Math.min(
          initialWatchedSeconds,
          video.duration || initialWatchedSeconds,
        );
        video.currentTime = restoredTime;
        setCurrentTime(restoredTime);
      }
    };
    video.addEventListener("loadedmetadata", restorePosition, { once: true });

    return () => {
      cancelled = true;
      clearBufferingTimer();
      video.removeEventListener("error", handleNativeMediaError);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("stalled", handleWaiting);
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("playing", handleReady);
      video.removeEventListener("timeupdate", handleReady);
      video.removeEventListener("pause", handleReady);
      video.removeEventListener("progress", handleProgress);
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
      setCurrentTime(video.currentTime);
    };

    const saveProgress = async (current: number, force = false) => {
      const normalizedCurrent = Math.max(0, Math.floor(current));
      const now = Date.now();
      if (!force && lastAttemptAtRef.current === null) {
        lastAttemptAtRef.current = now;
        return;
      }
      if (
        !force
        && now - (lastAttemptAtRef.current ?? now) < VIDEO_PROGRESS_HEARTBEAT_SECONDS * 1000
      ) return;
      lastAttemptAtRef.current = now;
      if (savingRef.current) {
        pendingSaveRef.current = Math.max(pendingSaveRef.current ?? 0, normalizedCurrent);
        return;
      }
      savingRef.current = true;
      try {
        const response = await fetch(`/api/videos/${videoId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            watchedSeconds: normalizedCurrent,
            playbackRate: normalizeVideoPlaybackRate(video.playbackRate),
          }),
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
        body: JSON.stringify({
          watchedSeconds: Math.max(0, Math.floor(current)),
          playbackRate: normalizeVideoPlaybackRate(video.playbackRate),
        }),
        keepalive: true,
      }).catch(() => undefined);
    };

    const handleTimeUpdate = () => {
      if (video.seeking) return;
      // این ref محلی با دقت خود پلیر جلو می‌رود و منتظر heartbeat دیتابیس نیست.
      const currentTime = video.currentTime;
      const current = Math.floor(currentTime);
      maxSeekRef.current = Math.max(maxSeekRef.current, currentTime);
      setCurrentTime(currentTime);
      setWatchedSeconds((previous) => Math.max(previous, current));
      void saveProgress(current);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setControlsVisible(true);
      // حتی شروع تماشای کوتاه نیز یک VideoProgress برای همین کاربر/ویدیو می‌سازد.
      void saveProgress(maxSeekRef.current, true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      setControlsVisible(true);
      void saveProgress(maxSeekRef.current, true);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setControlsVisible(true);
      const currentTime = video.currentTime;
      const current = Math.floor(currentTime);
      maxSeekRef.current = Math.max(maxSeekRef.current, currentTime);
      void saveProgress(current, true);
    };

    const handleRateChange = () => {
      const normalizedRate = normalizeVideoPlaybackRate(video.playbackRate);
      if (video.playbackRate !== normalizedRate) video.playbackRate = normalizedRate;
      setPlaybackRate(normalizedRate);
    };

    const handleVolumeChange = () => {
      setIsMuted(video.muted || video.volume === 0);
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
    video.addEventListener("volumechange", handleVolumeChange);
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
      video.removeEventListener("volumechange", handleVolumeChange);
      window.removeEventListener("pagehide", saveBeforeLeaving);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialWatchedSeconds, videoId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (controlsTimerRef.current !== null) window.clearTimeout(controlsTimerRef.current);
    if (isPlaying && openMenu === null) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2800);
    }
    return () => {
      if (controlsTimerRef.current !== null) window.clearTimeout(controlsTimerRef.current);
    };
  }, [isPlaying, openMenu]);

  const watchPct = totalSeconds > 0
    ? Math.min(100, Math.max(0, Math.round((watchedSeconds / totalSeconds) * 100)))
    : 0;

  const handleQualityChange = (level: number) => {
    setSelectedQuality(level);
    if (hlsRef.current) hlsRef.current.currentLevel = level;
  };

  const handlePlaybackRateChange = (rate: VideoPlaybackRate) => {
    setPlaybackRate(rate);
    const video = videoRef.current;
    if (!video) return;
    video.defaultPlaybackRate = rate;
    video.playbackRate = rate;
  };

  const revealControls = () => {
    setControlsVisible(true);
    if (controlsTimerRef.current !== null) window.clearTimeout(controlsTimerRef.current);
    if (isPlaying && openMenu === null) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2800);
    }
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || mediaError) return;
    setOpenMenu(null);
    if (video.paused || video.ended) {
      void video.play().catch((caught) => {
        captureClientError("video.play_action", caught, { video_id: videoId });
      });
    } else {
      video.pause();
    }
  };

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    const nextTime = Math.min(Math.max(0, value), maxSeekRef.current, mediaDuration);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const rewind = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    handleSeek(video.currentTime - seconds);
  };

  const toggleMuted = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const toggleFullscreen = async () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (player.requestFullscreen) {
        await player.requestFullscreen();
      } else {
        const nativeVideo = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
        nativeVideo?.webkitEnterFullscreen?.();
      }
    } catch (caught) {
      captureClientError("video.fullscreen", caught, { video_id: videoId });
    }
  };

  const handlePlayerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (["BUTTON", "INPUT", "SELECT"].includes(target.tagName)) return;
    if (event.key === " " || event.key.toLowerCase() === "k") {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      rewind(5);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      handleSeek((videoRef.current?.currentTime ?? 0) + 5);
    } else if (event.key.toLowerCase() === "m") {
      toggleMuted();
    } else if (event.key.toLowerCase() === "f") {
      void toggleFullscreen();
    }
    revealControls();
  };

  const timelineDuration = Math.max(1, mediaDuration || totalSeconds);
  const timelinePct = Math.min(100, (currentTime / timelineDuration) * 100);
  const bufferedPct = Math.min(100, (bufferedSeconds / timelineDuration) * 100);
  const selectedQualityLabel = selectedQuality === -1
    ? "خودکار"
    : `${qualityOptions.find((option) => option.level === selectedQuality)?.height ?? ""}p`;

  return (
    <section className="flex flex-col gap-3">
      <div
        ref={playerRef}
        className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-outline-variant/20 bg-black shadow-[0_18px_45px_color-mix(in_oklab,var(--color-primary)_18%,transparent)] outline-none ring-primary/40 focus-visible:ring-2"
        role="region"
        tabIndex={0}
        aria-label={`پخش‌کنندهٔ ${title}`}
        onClick={togglePlayback}
        onKeyDown={handlePlayerKeyDown}
        onPointerMove={revealControls}
        onPointerDown={revealControls}
        onFocusCapture={revealControls}
        onPointerLeave={() => {
          if (isPlaying && openMenu === null) setControlsVisible(false);
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        {hlsUrl ? (
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            controlsList="nodownload"
            disablePictureInPicture
            poster={posterUrl ?? undefined}
            preload="metadata"
            playsInline
            aria-busy={isBuffering}
            aria-label={title}
          />
        ) : (
          <div className="h-full w-full bg-black" aria-hidden="true" />
        )}

        {hlsUrl && !mediaError && controlsVisible && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-4 pb-10 pt-3 text-right text-white">
            <p className="truncate text-[12px] font-bold drop-shadow-sm">{title}</p>
          </div>
        )}

        {completed && (
          <div className="pointer-events-none absolute right-3 top-10 z-20 flex items-center gap-1 rounded-full bg-secondary/90 px-2.5 py-1 text-[10px] font-bold text-on-secondary shadow-lg backdrop-blur-sm">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            تکمیل‌شده
          </div>
        )}

        {isBuffering && !mediaError && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/25 text-white">
            <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-[12px] font-semibold">
              <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
              در حال آماده‌سازی ویدیو
            </div>
          </div>
        )}
        {mediaError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-inverse-surface/90 px-6 text-center text-inverse-on-surface">
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

        {hlsUrl && !mediaError && !isBuffering && !isPlaying && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              togglePlayback();
            }}
            className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-primary/90 text-on-primary shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:scale-105 active:scale-95"
            aria-label="پخش ویدیو"
          >
            <span className="material-symbols-outlined translate-x-0.5 text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          </button>
        )}

        {hlsUrl && !mediaError && openMenu === "speed" && (
          <div
            className="absolute inset-x-3 bottom-[50px] z-40 grid grid-cols-4 gap-1 rounded-2xl border border-white/15 bg-inverse-surface/95 p-2 text-inverse-on-surface shadow-2xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            dir="ltr"
          >
            {VIDEO_PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  handlePlaybackRateChange(rate);
                  setOpenMenu(null);
                }}
                className={`rounded-xl px-2 py-2 text-[12px] font-bold transition ${playbackRate === rate ? "bg-tertiary text-on-tertiary" : "hover:bg-white/10"}`}
              >
                {rate.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}×
              </button>
            ))}
          </div>
        )}

        {hlsUrl && !mediaError && openMenu === "quality" && qualityOptions.length > 0 && (
          <div
            className="absolute inset-x-3 bottom-[50px] z-40 grid grid-cols-2 gap-1 rounded-2xl border border-white/15 bg-inverse-surface/95 p-2 text-inverse-on-surface shadow-2xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                handleQualityChange(-1);
                setOpenMenu(null);
              }}
              className={`rounded-xl px-3 py-2 text-right text-[12px] font-bold ${selectedQuality === -1 ? "bg-tertiary text-on-tertiary" : "hover:bg-white/10"}`}
            >
              کیفیت خودکار
            </button>
            {qualityOptions.map((option) => (
              <button
                key={option.level}
                type="button"
                onClick={() => {
                  handleQualityChange(option.level);
                  setOpenMenu(null);
                }}
                className={`rounded-xl px-3 py-2 text-right text-[12px] font-bold ${selectedQuality === option.level ? "bg-tertiary text-on-tertiary" : "hover:bg-white/10"}`}
              >
                {option.height.toLocaleString("fa-IR")}p
              </button>
            ))}
          </div>
        )}

        {hlsUrl && !mediaError && (
          <div
            className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-3 pb-3 pt-14 text-white transition-opacity duration-200 ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-2" dir="rtl">
              <div className="relative h-6 min-w-0 flex-1" dir="ltr">
                <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/20">
                  <div className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${bufferedPct}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-tertiary" style={{ width: `${timelinePct}%` }} />
                </div>
                <input
                  type="range"
                  min={0}
                  max={timelineDuration}
                  step={0.1}
                  value={Math.min(currentTime, timelineDuration)}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  className="video-progress-range absolute inset-0 h-6 w-full cursor-pointer appearance-none bg-transparent"
                  aria-label="موقعیت پخش ویدیو"
                  aria-valuetext={`${formatVideoTime(currentTime)} از ${formatVideoTime(timelineDuration)}`}
                />
              </div>
              <button
                type="button"
                onClick={() => setOpenMenu((menu) => menu === "speed" ? null : "speed")}
                className={`flex h-8 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-[11px] font-extrabold backdrop-blur-sm transition ${openMenu === "speed" ? "border-tertiary bg-tertiary text-on-tertiary" : "border-white/20 bg-white/10 text-white hover:bg-white/20"}`}
                aria-label="انتخاب سرعت پخش"
                aria-expanded={openMenu === "speed"}
                dir="ltr"
              >
                <SpeedIcon className="h-[15px] w-[15px]" />
                {playbackRate.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}×
              </button>
            </div>

            <div className="flex items-center justify-between" dir="rtl">
              <div className="flex items-center gap-1">
                <button type="button" onClick={togglePlayback} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/15" aria-label={isPlaying ? "توقف پخش" : "پخش ویدیو"}>
                  <span className="material-symbols-outlined text-[25px]" style={{ fontVariationSettings: "'FILL' 1" }}>{isPlaying ? "pause" : "play_arrow"}</span>
                </button>
                <button type="button" onClick={() => rewind(5)} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/15" aria-label="پنج ثانیه عقب‌تر">
                  <span className="material-symbols-outlined text-[22px]">replay_5</span>
                </button>
                <span className="mr-1 text-[10px] font-semibold text-white/80" dir="ltr" title={`مدت کل ${formatVideoTime(timelineDuration)}`}>
                  {formatVideoTime(currentTime)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {qualityOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenMenu((menu) => menu === "quality" ? null : "quality")}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-bold hover:bg-white/15 ${openMenu === "quality" ? "bg-white/15" : ""}`}
                    aria-label="انتخاب کیفیت ویدیو"
                    aria-expanded={openMenu === "quality"}
                  >
                    <span className="text-[9px] font-black leading-none" aria-hidden="true">HD</span>
                    <span className="sr-only">{selectedQualityLabel}</span>
                  </button>
                )}
                <button type="button" onClick={toggleMuted} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/15" aria-label={isMuted ? "فعال‌کردن صدا" : "بی‌صدا کردن"}>
                  <VolumeIcon muted={isMuted} />
                </button>
                <button type="button" onClick={() => void toggleFullscreen()} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/15" aria-label={isFullscreen ? "خروج از تمام‌صفحه" : "نمایش تمام‌صفحه"}>
                  <FullscreenIcon active={isFullscreen} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-1 text-[12px]">
        <span className="font-semibold text-on-surface-variant">{watchPct.toLocaleString("fa-IR")}٪ مشاهده شده</span>
        <span className="text-outline">{durationMin.toLocaleString("fa-IR")} دقیقه</span>
      </div>

      {watchPct < 90 && (
        <div className="text-[12px] text-outline text-center space-y-1">
          <p>۹۰٪ ویدیو را تماشا کن تا جایزه بگیری ({(90 - watchPct).toLocaleString("fa-IR")}٪ مانده)</p>
          <p>جلو زدن غیرفعال است؛ سرعت پخش را می‌توانی از روی پلیر تغییر بدهی.</p>
        </div>
      )}
      {progressError && (
        <p role="status" className="text-center text-[12px] text-error">{progressError}</p>
      )}
    </section>
  );
}
