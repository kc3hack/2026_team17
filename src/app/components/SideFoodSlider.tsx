import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  label: string;
  src: string;
};

type Props = {
  items: Item[];
  onPick: (label: string) => void;
  intervalMs?: number;
  side?: "left" | "right";
  className?: string;
  fadeMs?: number;
  clickable?: boolean; // 追加：クリック自体も消せる
};

export function SideFoodSlider({
  items,
  onPick,
  intervalMs = 6500, // ←長めに（短いならここを増やす）
  fadeMs = 900,
  side = "left",
  className = "",
  clickable = true,
}: Props) {
  const safeItems = useMemo(() => items.filter(Boolean), [items]);
  const n = safeItems.length;

  const [index, setIndex] = useState(0);

  // クロスフェード用（前の画像を保持）
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);

  const timerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);

  const clamp = (i: number) => (n === 0 ? 0 : (i + n) % n);

  const go = (nextIndex: number) => {
    if (n <= 1) return;

    const to = clamp(nextIndex);
    // 同じなら何もしない
    if (to === index) return;

    // 前画像を残して、次画像へ（フェード開始）
    setPrevIndex(index);
    setIndex(to);
    setIsFading(true);

    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = window.setTimeout(() => {
      setIsFading(false);
      setPrevIndex(null);
    }, fadeMs);
  };

  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  // auto slide
  useEffect(() => {
    if (n <= 1) return;

    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      go(index + 1);
    }, intervalMs);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, intervalMs, index]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    };
  }, []);

  if (n === 0) return null;

  const current = safeItems[index];
  const previous = prevIndex !== null ? safeItems[prevIndex] : null;

  const grad =
    side === "left"
      ? "bg-gradient-to-r from-black/35 via-black/10 to-transparent"
      : "bg-gradient-to-l from-black/35 via-black/10 to-transparent";

  const WrapperTag: any = clickable ? "button" : "div";

  return (
    <div className={`relative h-full ${className}`}>
      <WrapperTag
        className="relative h-full w-full overflow-hidden rounded-3xl border bg-white"
        onClick={clickable ? () => onPick(current.label) : undefined}
        title={clickable ? `${current.label}` : undefined}
        type={clickable ? "button" : undefined}
      >
        {/* 前の画像（下） */}
        {previous && (
          <img
            src={previous.src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
            loading="lazy"
          />
        )}

        {/* 現在の画像（上）: opacityでクロスフェード */}
        <img
          src={current.src}
          alt={current.label}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          loading="lazy"
          style={{
            opacity: previous ? (isFading ? 1 : 0) : 1,
            transition: previous ? `opacity ${fadeMs}ms ease` : undefined,
          }}
        />

        {/* 読みやすいグラデ（文字出さないけど雰囲気のため） */}
        <div className={`absolute inset-0 ${grad}`} />
      </WrapperTag>

      {/* 手動操作：矢印は残す（あなたの要件） */}
      {n >= 2 && (
        <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 flex justify-between pointer-events-none">
          <button
            className="pointer-events-auto p-2 text-white drop-shadow-md hover:opacity-80 transition flex items-center justify-center"

            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prev();
            }}
            aria-label="prev"
            title="前へ"
            type="button"
          >
            ◀
          </button>

          <button
            className="pointer-events-auto p-2 text-white drop-shadow-md hover:opacity-80 transition flex items-center justify-center"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              next();
            }}
            aria-label="next"
            title="次へ"
            type="button"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
