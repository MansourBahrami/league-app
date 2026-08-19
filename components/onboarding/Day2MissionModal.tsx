"use client";

import { useRouter } from "next/navigation";

interface Props {
  onDismiss: () => void;
}

export default function Day2MissionModal({ onDismiss }: Props) {
  const router = useRouter();

  function handleGoToRooms() {
    onDismiss();
    router.push("/mission-rooms");
  }

  return (
    <div className="fixed inset-0 z-[82] flex items-center justify-center px-4 pt-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-[460px] rounded-2xl p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-tertiary-container text-white shadow-lg shadow-tertiary/25">
          <span className="material-symbols-outlined text-[34px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            flag
          </span>
        </div>
        <h2 className="text-[20px] font-extrabold text-on-surface">ماموریت امروزت رو مشخص کن 🎯</h2>
        <p className="mt-2 text-[14px] leading-7 text-on-surface-variant">
          هدف روز اولت رو با موفقیت پشت سر گذاشتی! حالا وقتشه برای امروزت یک هدف مشخص کنی و با بقیه دانش‌آموزها رقابت کنی.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleGoToRooms}
            className="gamified-btn flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[15px] font-bold text-on-primary shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]">meeting_room</span>
            ورود به اتاق‌های ماموریت
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2.5 text-[13px] font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            فعلاً نه، بعداً انتخاب می‌کنم
          </button>
        </div>
      </div>
    </div>
  );
}
