"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  videoId: string;
  price: number;
  userCoins: number;
  /** متن کوتاه راهنما زیر دکمه (اختیاری) */
  className?: string;
}

/**
 * دکمه‌ی خرید ویدیو با سکه (گروه A/B «paid»). پس از خرید موفق، صفحه refresh می‌شود
 * تا ویدیو قابل تماشا شود. قابل استفاده در داشبورد، لیست ویدیوها و صفحه‌ی پخش.
 */
export default function BuyVideoButton({ videoId, price, userCoins, className = "" }: Props) {
  const router = useRouter();
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");

  const canAfford = userCoins >= price;

  async function handleBuy() {
    setBuying(true);
    setError("");
    const res = await fetch(`/api/videos/${videoId}/buy`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) {
      router.refresh();
    } else {
      setError(data?.error ?? "خطا در خرید");
      setBuying(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleBuy}
        disabled={buying || !canAfford}
        className="gamified-btn w-full bg-tertiary text-on-tertiary text-[15px] font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-tertiary/20 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {buying ? "progress_activity" : "shopping_cart"}
        </span>
        {buying ? "در حال خرید..." : `خرید ویدیو با ${price.toLocaleString("fa-IR")} سکه`}
      </button>
      <p className="text-[12px] text-on-surface-variant mt-1.5 text-center">
        {canAfford
          ? `${userCoins.toLocaleString("fa-IR")} سکه داری`
          : `${userCoins.toLocaleString("fa-IR")} سکه داری · ${(price - userCoins).toLocaleString("fa-IR")} سکه دیگه با درس خوندن جمع کن`}
      </p>
      {error && <p className="text-[12px] text-error mt-1 text-center">{error}</p>}
    </div>
  );
}
