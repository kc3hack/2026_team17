import { Hotel } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { Button } from "./ui/button";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;

  // Homeだけ「使い方」を出したいときに渡す（渡さなければ非表示）
  onStartTour?: () => void;

  // 位置調整が必要なら（不要なら渡さなくてOK）
  logoX?: number;

  // Joyrideの target を共通で使いたい場合に付けられる
  enableTourTarget?: boolean;
};

export function AppHeader({
  value,
  onChange,
  onSearch,
  onStartTour,
  logoX = 0,
  enableTourTarget = false,
}: Props) {
  const BASE = import.meta.env.BASE_URL;

  return (
    <header className="border-b sticky top-0 z-50 relative overflow-hidden">
      {/* 背景画像 */}
      <div className="absolute inset-0">
        <img
          src={`${BASE}hero/header.jpg`}
          alt=""
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
      </div>

      <div className="container mx-auto px-4 py-3 relative z-10">
        {/* 1段目：中央タイトル */}
        <div className="flex justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold tracking-wide text-white">
              しょくたび <span className="ml-1">✈</span>
            </div>
            <div className="text-2xs mt-1 text-white">
              食べたい名産から、旅先と宿を見つける
            </div>
          </div>

          {/* 左ロゴ */}
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 hidden md:flex items-center"
            style={{ transform: `translate(${logoX}px, -50%)` }}
          >
            <img
              src={`${BASE}hero/ロゴ.png`}
              alt="R-Hack"
              className="h-14 w-auto select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* 2段目：アイコン + 検索 + 使い方 */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-11 h-11 bg-gray-900 rounded-lg flex items-center justify-center">
              <Hotel className="text-white" size={22} />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-white">
                特産品から探す食べもの旅
              </div>
              <div className="text-xs text-white">地図と検索でサクッと</div>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-2xl" data-tour="search">
                <SearchBar value={value} onChange={onChange} onSearch={onSearch} />
            </div>
        </div>

          {/* Homeだけ表示 */}
          {onStartTour && (
            <div className="hidden md:flex shrink-0 ml-auto">
              <Button
                variant="outline"
                className="rounded-full bg-white/85 hover:bg-white text-gray-900 border-white/60"
                onClick={onStartTour}
              >
                使い方
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}