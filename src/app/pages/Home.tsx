import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Hotel } from "lucide-react";
import { SearchBar } from "../components/SearchBar";
import { Button } from "../components/ui/button";
import { JapanDotMap } from "../components/JapanDotMap";
import { SideFoodSlider } from "../components/SideFoodSlider";
import foodItems from "../data/foodData.generated.json";
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from "react-joyride";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const [tourRun, setTourRun] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const [logoX, setLogoX] = useState(0); 
  const [tourNonce, setTourNonce] = useState(0);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const BASE = import.meta.env.BASE_URL;

  const LEFT_ITEMS = [
    { label: "かき", src: `${BASE}hero/1.jpg` },
    { label: "りんご", src: `${BASE}hero/2.jpg` },
    { label: "うに", src: `${BASE}hero/3.jpg` },
    { label: "ラーメン", src: `${BASE}hero/1.jpg` },
    { label: "メロン", src: `${BASE}hero/2.jpg` },
  ];

  const RIGHT_ITEMS = [
    { label: "ぎょうざ", src: `${BASE}hero/2.jpg` },
    { label: "寿司", src: `${BASE}hero/3.jpg` },
    { label: "焼肉", src: `${BASE}hero/1.jpg` },
    { label: "うどん", src: `${BASE}hero/2.jpg` },
    { label: "いちご", src: `${BASE}hero/3.jpg` },
  ];

  const foods = useMemo(() => {
    const arr = foodItems as Array<{ name: string }>;
    return arr
      .map((x) => x?.name)
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim())
      .sort((a, b) => a.localeCompare(b, "ja"));
  }, []);

  // ★ 人気カテゴリ（カードで表示する固定リスト）
  const popularFoods = [
    { name: "ラーメン", image: `${BASE}popular/ramen.jpg` },
    { name: "海鮮", image: `${BASE}popular/kaisen.jpg` },
    { name: "寿司", image: `${BASE}popular/sushi.jpg` },
    { name: "牛料理", image: `${BASE}popular/beef.jpg` },
    { name: "鍋", image: `${BASE}popular/nabe.jpg` },
    { name: "うどん", image: `${BASE}popular/udon.jpg` },
  ];

  const handlePopularSearch = (food: string) => {
    setSearchQuery(food);
    navigate(`/search?q=${encodeURIComponent(food)}`);
  };

  const getRegionCount = (foodName: string) => {
    const arr = foodItems as Array<{ name: string; regions?: unknown[] }>;
    return arr.find((f) => f?.name === foodName)?.regions?.length ?? 0;
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ★ 使い方：必ず最初から（内部状態も捨てる）
  const startTour = () => {
    // 一旦止めて完全リセット
    setTourRun(false);
    setTourStepIndex(0);
    setTourNonce((n) => n + 1);

    // 次のtickで開始（毎回まっさら）
    setTimeout(() => {
      setTourRun(true);
    }, 0);
  };

  const tourSteps: Step[] = [
    {
      target: '[data-tour="search"]',
      content: "まずは食べたい名産を検索してみよう！",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="map"]',
      content: "地図をクリックして都道府県から探すこともできます。",
      placement: "top",
    },
    {
      target: '[data-tour="list"]',
      content: "名産一覧から選ぶと、その名産で検索できます。",
      placement: "top",
    },
    {
      target: '[data-tour="photo"]',
      content: "写真から選ぶこともできます（気分で選べる）。",
      placement: "top",
    },
    {
      target: '[data-tour="popular"]',
      content: "人気の名産品カードからもすぐ検索できます。",
      placement: "top",
    },
  ];

  const onTourCallback = (data: CallBackProps) => {
    const { status, index, type, action } = data;

    // 次へ/戻るでstepIndexを同期（途中再開の原因を潰す）
    if (type === EVENTS.STEP_AFTER) {
      const next =
        action === "prev" ? Math.max(0, index - 1) : Math.min(tourSteps.length - 1, index + 1);
      setTourStepIndex(next);
    }

    // ★ ここが重要：見つからない時に勝手に別ステップへ飛ばさない
    // （これが“変な場所に暗転”の主原因）
    if (type === EVENTS.TARGET_NOT_FOUND) {
      setTourRun(false);
      setTourStepIndex(0);
      return;
    }

    // 終了系は完全リセット（次回は必ず最初から）
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setTourRun(false);
      setTourStepIndex(0);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Joyride
        key={tourNonce} // ★毎回リセット
        steps={tourSteps}
        run={tourRun}
        stepIndex={tourStepIndex}
        callback={onTourCallback}
        continuous
        showSkipButton
        showProgress
        disableOverlayClose
        scrollToFirstStep
        scrollOffset={140} // ★stickyヘッダー分。必要なら 120〜180で微調整
        styles={{
          options: {
            primaryColor: "#111827",
            zIndex: 10000,
            overlayColor: "rgba(0,0,0,0.45)",
          },
        }}
      />

      {/* ===== ヘッダー ===== */}
      <header className="border-b sticky top-0 z-50 relative overflow-hidden">
        {/* 背景画像レイヤー */}
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
              <div className="text-2xs text-gray-600 mt-1 text-white">
                食べたい名産から、旅先と宿を見つける
              </div>
            </div>
              {/* 左ロゴ*/}
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

          {/* 2段目：ロゴ + 検索 */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-11 h-11 bg-gray-900 rounded-lg flex items-center justify-center">
                <Hotel className="text-white" size={22} />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-white">
                  特産品から探す食べもの旅
                </div>
                <div className="text-xs text-gray-600 text-white">
                  地図と検索でサクッと
                </div>
              </div>
            </div>

            {/* ★ data-tour="search" は“確実に存在する”この箱に付ける */}
            <div className="flex-1 flex justify-center">
              <div data-tour="search" className="w-full max-w-2xl">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={handleSearch}
                />
              </div>
            </div>

            <div className="hidden md:flex shrink-0　ml-auto">
              <Button
                variant="outline"
                className="rounded-full bg-white/85 hover:bg-white text-gray-900 border-white/60"
                onClick={startTour} // ★毎回最初から
              >
                使い方
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== メイン ===== */}
      <main className="container mx-auto px-4 py-8">
        {/* 地図セクション：ここだけ全幅 */}
        <section id="map" className="mb-12">
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
            <div className="px-6 2xl:px-10">
              <div className="mb-3 hidden xl:grid grid-cols-[1fr_300px_360px] gap-4 items-end">
                <div className="text-2xl font-bold text-center">地図から探す</div>
                <div className="text-2xl font-bold text-center">名産一覧</div>
                <div className="text-2xl font-bold text-center">写真から選ぶ</div>
              </div>

              <div className="flex gap-4 items-stretch h-[71vh]">
                {/* 左：地図 */}
                <div data-tour="map" className="flex-1 min-w-0">
                  <JapanDotMap
                    svgPath={`${BASE}maps/geolonia/map-full.svg`}
                    onPickPrefecture={(pref) => setSearchQuery(pref)}
                  />
                </div>

                {/* 中：名産一覧 */}
                <aside data-tour="list" className="hidden xl:block w-[300px] min-w-[300px] h-full">
                  <div className="rounded-2xl border bg-white p-3 h-full flex flex-col min-h-0">
                    <div className="text-sm font-semibold mb-2"></div>

                    <div className="flex-1 min-h-0 overflow-auto pr-1">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        {foods.map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="w-full text-left rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 transition"
                            onClick={() => {
                              setSearchQuery(name);
                              navigate(`/search?q=${encodeURIComponent(name)}`);
                            }}
                            title={`${name}で検索`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>

                {/* 右：写真 */}
                <aside data-tour="photo" className="hidden xl:block w-[360px] min-w-[360px] h-full">
                  <SideFoodSlider
                    side="right"
                    items={RIGHT_ITEMS}
                    onPick={(label) => setSearchQuery(label)}
                    intervalMs={9000}
                    fadeMs={1200}
                    clickable={false}
                    className="h-full"
                  />
                </aside>
              </div>
            </div>
          </div>
        </section>

        {/* 人気の名産品（カード） */}
        <section data-tour="popular" id="popular" className="max-w-6xl mx-auto mb-12">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold">人気の名産品</div>
              <div className="text-sm text-gray-600 mt-1">
                クリックするとその名産で検索します
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularFoods.map((food) => {
              const regionCount = getRegionCount(food.name);

              return (
                <button
                  key={food.name}
                  type="button"
                  onClick={() => handlePopularSearch(food.name)}
                  className="group text-left rounded-2xl border bg-white overflow-hidden hover:shadow-lg transition hover:-translate-y-0.5"
                  title={`${food.name}で検索`}
                >
                  <div className="h-28 sm:h-32 overflow-hidden">
                    <img
                      src={food.image}
                      alt={food.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition"
                      loading="lazy"
                    />
                  </div>

                  <div className="p-3">
                    <div className="font-semibold">{food.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {regionCount}つの地域
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 使い方（下のセクションは残す。ツアーは別） */}
        <section id="howto" className="max-w-5xl mx-auto pb-12">
          <div className="text-lg font-semibold mb-3">使い方</div>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-2">
            <li>検索欄に食べたい名産を入力する</li>
            <li>または地図で都道府県を選ぶ</li>
            <li>検索ボタンで宿候補を表示（予定）</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
