// src/app/components/HeroCarousel.tsx
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Slide = {
  src: string;        // /hero/xxx.jpg
  title?: string;     // 任意
  subtitle?: string;  // 任意
};

type Props = {
  slides: Slide[];
  intervalMs?: number;
  className?: string;
};

export function HeroCarousel({ slides, intervalMs = 5000, className }: Props) {
  const safeSlides = useMemo(() => slides.filter(s => s?.src), [slides]);
  const [idx, setIdx] = useState(0);

  const next = () => setIdx((v) => (v + 1) % safeSlides.length);
  const prev = () => setIdx((v) => (v - 1 + safeSlides.length) % safeSlides.length);

  useEffect(() => {
    if (safeSlides.length <= 1) return;
    const t = window.setInterval(next, intervalMs);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeSlides.length, intervalMs]);

  if (safeSlides.length === 0) return null;

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative h-[340px] md:h-[420px]">
          {safeSlides.map((s, i) => (
            <img
              key={s.src}
              src={s.src}
              alt={s.title ?? `slide-${i}`}
              className={[
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                i === idx ? "opacity-100" : "opacity-0",
              ].join(" ")}
              draggable={false}
            />
          ))}

          {/* 下フェード（ページ背景に溶ける） */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white" />

          {/* 矢印（Amazon風に控えめ） */}
          {safeSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/70 backdrop-blur px-2 py-2 hover:bg-white transition"
                aria-label="previous"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/70 backdrop-blur px-2 py-2 hover:bg-white transition"
                aria-label="next"
              >
                <ChevronRight />
              </button>
            </>
          )}

          {/* テキストを置きたければここ */}
          {(safeSlides[idx].title || safeSlides[idx].subtitle) && (
            <div className="absolute left-6 top-6 max-w-[70%]">
              {safeSlides[idx].title && (
                <div className="text-2xl md:text-4xl font-bold text-gray-900">
                  {safeSlides[idx].title}
                </div>
              )}
              {safeSlides[idx].subtitle && (
                <div className="mt-2 text-gray-700">{safeSlides[idx].subtitle}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
