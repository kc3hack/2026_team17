import { useEffect, useRef, useState } from "react";

type Props = {
  // Homeから来てるけど、SVG版では使わない（互換のため残す）
  mapJapanSrc?: string;
  regionMapSrc?: Record<string, string>;
  prefMapSrc?: Record<string, string>;

  onPickPrefecture: (prefName: string) => void;

  // Geolonia SVG のパス（public配下）
  // 例: `${import.meta.env.BASE_URL}maps/geolonia/map-full.svg`
  svgPath?: string;
};
const CODE_TO_PREF_NAME: Record<string, string> = {
  "01": "北海道",
  "02": "青森県",
  "03": "岩手県",
  "04": "宮城県",
  "05": "秋田県",
  "06": "山形県",
  "07": "福島県",
  "08": "茨城県",
  "09": "栃木県",
  "10": "群馬県",
  "11": "埼玉県",
  "12": "千葉県",
  "13": "東京都",
  "14": "神奈川県",
  "15": "新潟県",
  "16": "富山県",
  "17": "石川県",
  "18": "福井県",
  "19": "山梨県",
  "20": "長野県",
  "21": "岐阜県",
  "22": "静岡県",
  "23": "愛知県",
  "24": "三重県",
  "25": "滋賀県",
  "26": "京都府",
  "27": "大阪府",
  "28": "兵庫県",
  "29": "奈良県",
  "30": "和歌山県",
  "31": "鳥取県",
  "32": "島根県",
  "33": "岡山県",
  "34": "広島県",
  "35": "山口県",
  "36": "徳島県",
  "37": "香川県",
  "38": "愛媛県",
  "39": "高知県",
  "40": "福岡県",
  "41": "佐賀県",
  "42": "長崎県",
  "43": "熊本県",
  "44": "大分県",
  "45": "宮崎県",
  "46": "鹿児島県",
  "47": "沖縄県",
};

export function JapanDotMap({
  onPickPrefecture,
  svgPath,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string>("");

  // GitHub Pages対応：BASE_URLを付ける
  const BASE = import.meta.env.BASE_URL;
  const resolvedSvgPath = svgPath ?? `${BASE}maps/geolonia/map-full.svg`;

  useEffect(() => {
    let aborted = false;

    const load = async () => {
      try {
        setError("");

        const res = await fetch(resolvedSvgPath);
        if (!res.ok) throw new Error(`SVG fetch failed: ${res.status}`);

        const svgText = await res.text();
        if (aborted) return;

        const container = containerRef.current;
        if (!container) return;

        // 多重イベントを避けるため、毎回入れ替え
        container.innerHTML = svgText;

        // ".prefecture" が無い場合もあるので data-code / data-name を優先
        const prefNodes = container.querySelectorAll<HTMLElement>(
          ".geolonia-svg-map [data-code], [data-code], .prefecture"
        );

            prefNodes.forEach((node) => {
            // ベース色（薄い黄緑）
            (node as HTMLElement).style.fill = "#d9f99d";   // lime-200相当
            (node as HTMLElement).style.stroke = "#4d7c0f"; // lime-800寄り
            (node as HTMLElement).style.strokeWidth = "1";
            (node as HTMLElement).style.transition = "fill 120ms ease, transform 120ms ease";
            (node as HTMLElement).style.transformOrigin = "center";


          // 押せる見た目
          node.style.cursor = "pointer";

          // hover演出（fillを変える）
          node.addEventListener("mouseenter", () => {
            (node as any).style.fill = "#16a34a"; // 緑
            (node as any).style.stroke = "rgba(0,0,0,0.35)";
            (node as any).style.strokeWidth = "1";
          });

          node.addEventListener("mouseleave", () => {
            (node as any).style.fill = "";
            (node as any).style.stroke = "";
            (node as any).style.strokeWidth = "";
          });

          node.addEventListener("click", () => {
        const rawCode = (node as any).dataset?.code as string | undefined;
         const rawName = (node as any).dataset?.name as string | undefined;

        // 1) data-name が取れればそれが最優先
         if (rawName && rawName.trim()) {
        onPickPrefecture(rawName.trim());
         return;
        }

  // 2) data-code が "1" の場合もあるので 2桁に正規化
  if (rawCode) {
    const code2 = rawCode.padStart(2, "0");
    const prefName = CODE_TO_PREF_NAME[code2];
    if (prefName) {
      onPickPrefecture(prefName);
      return;
    }
    // 3) 万一の保険（コードしか無いとき）
    onPickPrefecture(code2);
  }
});

        });
      } catch (e: any) {
        setError(e?.message ?? "failed");
      }
    };

    load();

    return () => {
      aborted = true;
    };
  }, [resolvedSvgPath, onPickPrefecture]);

  return (
    <div className="w-full">
      <div className="rounded-2xl border bg-[linear-gradient(180deg,#e0f2fe_0%,#f0f9ff_35%,#e0f2fe_100%)] p-3">
  <div
    ref={containerRef}
    className="
      h-[68vh] w-full overflow-hidden rounded-xl
      [&_svg]:h-full [&_svg]:w-full [&_svg]:max-w-full [&_svg]:max-h-full
    "
  />
</div>


      {error && (
        <div className="mt-2 text-sm text-red-600">
          SVG読み込みエラー: {error}
        </div>
      )}
    </div>
  );
}
