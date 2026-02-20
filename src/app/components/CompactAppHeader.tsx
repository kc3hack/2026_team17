import { Hotel, ArrowLeft } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { Button } from "./ui/button";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;

  title: string;
  subtitle: string;

  onBack: () => void;
};

export function CompactAppHeader({
  value,
  onChange,
  onSearch,
  title,
  subtitle,
  onBack,
}: Props) {
  const BASE = import.meta.env.BASE_URL;

  return (
    <header className="sticky top-0 z-40 border-b relative overflow-hidden">
      {/* 背景画像 */}
      <div className="absolute inset-0">
        <img
          src={`${BASE}hero/header.jpg`}
          alt=""
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="container mx-auto px-4 h-14 flex items-center relative z-10">
        {/* ---------------- 左：戻る ---------------- */}
        <div className="shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1 text-white hover:bg-white/20"
          >
            <ArrowLeft size={16} />
            戻る
          </Button>
        </div>

        {/* ---------------- しょくたび（戻ると中央の中間） ---------------- */}
        <div
          className="
            absolute
            left-1/4
            top-1/2
            -translate-y-1/2
            text-white
            font-bold
            text-lg
            tracking-wide
            select-none
            pointer-events-none
          "
        >
          しょくたび <span className="ml-1">✈</span>
        </div>

        {/* ---------------- 中央タイトル（完全中央） ---------------- */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="font-bold text-sm leading-tight text-white">
            {title}
          </div>
          <div className="text-[11px] leading-tight text-white/90">
            {subtitle}
          </div>
        </div>

        {/* ---------------- 右：検索 ---------------- */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center justify-center w-8 h-8 bg-gray-900/80 rounded-md">
            <Hotel className="text-white" size={14} />
          </div>

          <div className="w-[260px]">
            <SearchBar
              value={value}
              onChange={onChange}
              onSearch={onSearch}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
