/**
 * قاب ستاره‌ی سطح: همیشه `total` ستاره نشان می‌دهد، `stars` تای اول روشن و بقیه خاموش.
 */
export default function StarBadge({
  stars,
  total = 3,
  size = 14,
}: {
  stars: number;
  total?: number;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {Array.from({ length: total }).map((_, i) => {
        const lit = i < stars;
        return (
          <span
            key={i}
            className={`material-symbols-outlined ${lit ? "text-tertiary-fixed-dim" : "text-outline-variant/50"}`}
            style={{ fontSize: size, fontVariationSettings: `'FILL' ${lit ? 1 : 0}` }}
          >
            star
          </span>
        );
      })}
    </span>
  );
}
