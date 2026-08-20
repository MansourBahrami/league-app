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
    <span
      className="inline-flex items-center gap-0.5 rounded-full bg-tertiary-fixed/55 px-1.5 py-0.5 leading-none ring-1 ring-tertiary/15"
      dir="ltr"
      role="img"
      aria-label={`${stars.toLocaleString("fa-IR")} از ${total.toLocaleString("fa-IR")} ستاره`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const lit = i < stars;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`material-symbols-outlined ${lit ? "text-tertiary" : "text-on-tertiary-fixed/25"}`}
            style={{ fontSize: size, fontVariationSettings: `'FILL' ${lit ? 1 : 0}` }}
          >
            star
          </span>
        );
      })}
    </span>
  );
}
