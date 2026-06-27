"use client";

import { useState } from "react";

const COLORS = ["var(--color-primary)", "var(--color-tertiary-fixed-dim)", "var(--color-secondary-container)", "var(--color-secondary)", "var(--color-primary-fixed-dim)", "var(--color-tertiary)"];

/**
 * انفجار کانفتی برای لحظه‌های جشن (تکمیل روز، گرفتن مدال، ارتقا).
 * فقط سمت کلاینت پس از تعامل mount می‌شود، پس تصادفی بودن در init مشکل hydration ندارد.
 */
export default function Confetti({ count = 40 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      color: COLORS[i % COLORS.length],
    }))
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{ left: `${p.left}%`, top: "20%", background: p.color, animationDelay: `${p.delay}s` }}
        />
      ))}
    </div>
  );
}
